import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/message.dto';

@Injectable()
export class MessageListener {
  private readonly logger = new Logger(MessageListener.name);

  constructor(private readonly messageService: MessageService) {}

  /**
   * 监听帖子举报处理完结的事件，生成违规下架通知（发送给作者）与举报反馈消息（发送给举报者）
   */
  @OnEvent('forum.report.processed')
  public async handleReportProcessed(event: {
    postId: number;
    reporterId: number;
    authorId: number;
    postTitle: string;
    action: string;
    reason: string;
  }): Promise<void> {
    try {
      this.logger.log(`[MessageListener] 收到举报完成事件，开始消费: PostID: ${event.postId}`);

      // 1. 推送给帖子作者的违规下架/保留处分通知
      const authorMsg: CreateMessageDto = {
        title: `您的帖子已被处理`,
        content: `您的帖子《${event.postTitle}》因涉嫌“${event.reason}”已被管理员执行[${event.action}]处理。`,
        messageType: '3', // 业务提醒
        bizType: 'post_report_processed',
        bizId: event.postId,
        receiverType: '1',
        receiverId: event.authorId,
      };
      await this.messageService.createMessage(authorMsg);

      // 2. 推送给热心举报用户的反馈回执
      const reporterMsg: CreateMessageDto = {
        title: `举报处理结果反馈`,
        content: `您此前对帖子《${event.postTitle}》提交的违规举报，管理员已完成审核并执行了[${event.action}]操作。感谢您对社区环境的监督！`,
        messageType: '3',
        bizType: 'post_report_processed',
        bizId: event.postId,
        receiverType: '1',
        receiverId: event.reporterId,
      };
      await this.messageService.createMessage(reporterMsg);
    } catch (err) {
      this.logger.error(`[MessageListener] 消费举报处理事件发生异常: ${err.message}`);
    }
  }

  /**
   * 监听社区帖子点赞事件，生成社交互动点赞通知并发送给作者
   */
  @OnEvent('forum.post.liked')
  public async handlePostLiked(event: {
    postId: number;
    userId: number;      // 点赞人ID
    userName: string;    // 点赞人昵称/用户名
    authorId: number;    // 被赞者作者ID
    postTitle: string;   // 帖子标题
  }): Promise<void> {
    try {
      // 排除自赞逻辑，自己赞自己不发消息通知
      if (event.userId === event.authorId) {
        return;
      }

      this.logger.log(`[MessageListener] 收到帖子点赞事件: PostID: ${event.postId}, Sender: ${event.userId}`);

      const likeMsg: CreateMessageDto = {
        title: `收到了新的点赞`,
        content: `用户 ${event.userName} 赞了您的帖子《${event.postTitle}》`,
        messageType: '2', // 社交互动
        bizType: 'post_like',
        bizId: event.postId,
        senderId: event.userId,
        receiverType: '1',
        receiverId: event.authorId,
      };
      await this.messageService.createMessage(likeMsg);
    } catch (err) {
      this.logger.error(`[MessageListener] 消费帖子点赞事件发生异常: ${err.message}`);
    }
  }
}
