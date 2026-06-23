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
   * 监听帖子申诉复核处理完结的事件，生成申诉结果通知（发送给作者）
   */
  @OnEvent('forum.appeal.processed')
  public async handleAppealProcessed(event: {
    postId: number;
    authorId: number;
    postTitle: string;
    result: string;
    appealReason: string;
  }): Promise<void> {
    try {
      this.logger.log(`[MessageListener] 收到申诉复核处理完成事件，开始消费: PostID: ${event.postId}`);

      const appealMsg: CreateMessageDto = {
        title: `申诉复核结果通知`,
        content: `您对帖子《${event.postTitle}》发起的申诉已被管理员[${event.result}]。${
          event.result === '通过' ? '帖子已恢复正常上架。' : '申诉已被驳回，维持下架处分。'
        }`,
        messageType: '3', // 业务提醒
        bizType: 'post_appeal_processed',
        bizId: event.postId,
        receiverType: '1',
        receiverId: event.authorId,
      };
      await this.messageService.createMessage(appealMsg);
    } catch (err) {
      this.logger.error(`[MessageListener] 消费帖子申诉处理事件发生异常: ${err.message}`);
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

  /**
   * 监听帖子收到新评论事件，生成社交互动通知发送给帖子作者
   */
  @OnEvent('forum.post.commented')
  public async handlePostCommented(event: {
    postId: number;
    commentId: number;
    userId: number;      // 评论人ID
    userName: string;    // 评论人昵称/姓名
    authorId: number;    // 帖子作者ID
    postTitle: string;   // 帖子标题
    content: string;     // 评论内容
  }): Promise<void> {
    try {
      // 排除自己评论自己的帖子，不发送通知
      if (event.userId === event.authorId) {
        return;
      }

      this.logger.log(`[MessageListener] 收到帖子评论事件: PostID: ${event.postId}, Sender: ${event.userId}`);

      const commentMsg: CreateMessageDto = {
        title: `帖子收到了新评论`,
        content: `用户 ${event.userName} 评论了您的帖子《${event.postTitle}》：“${event.content}”`,
        messageType: '2', // 社交互动
        bizType: 'post_comment',
        bizId: event.postId,
        senderId: event.userId,
        receiverType: '1',
        receiverId: event.authorId,
      };
      await this.messageService.createMessage(commentMsg);
    } catch (err) {
      this.logger.error(`[MessageListener] 消费帖子评论事件发生异常: ${err.message}`);
    }
  }

  /**
   * 监听评论收到新回复事件，生成社交互动通知发送给被回复的评论作者
   */
  @OnEvent('forum.comment.replied')
  public async handleCommentReplied(event: {
    postId: number;
    commentId: number;
    userId: number;      // 回复者ID
    userName: string;    // 回复者昵称/姓名
    authorId: number;    // 被回复评论的作者ID
    postTitle: string;   // 帖子标题
    content: string;     // 回复内容
    parentContent: string; // 原评论内容
  }): Promise<void> {
    try {
      // 排除自己回复自己评论，不发送通知
      if (event.userId === event.authorId) {
        return;
      }

      this.logger.log(`[MessageListener] 收到评论回复事件: CommentID: ${event.commentId}, Sender: ${event.userId}`);

      // 截取被回复的评论内容防止太长
      const snippet = event.parentContent.length > 20 ? event.parentContent.slice(0, 20) + '...' : event.parentContent;

      const replyMsg: CreateMessageDto = {
        title: `评论收到了新回复`,
        content: `用户 ${event.userName} 回复了您在《${event.postTitle}》下的评论“${snippet}”：“${event.content}”`,
        messageType: '2', // 社交互动
        bizType: 'comment_reply',
        bizId: event.postId,
        senderId: event.userId,
        receiverType: '1',
        receiverId: event.authorId,
      };
      await this.messageService.createMessage(replyMsg);
    } catch (err) {
      this.logger.error(`[MessageListener] 消费评论回复事件发生异常: ${err.message}`);
    }
  }

  /**
   * 监听评论被点赞事件，生成社交互动通知发送给评论作者
   */
  @OnEvent('forum.comment.liked')
  public async handleCommentLiked(event: {
    commentId: number;
    postId: number;
    userId: number;      // 点赞者ID
    userName: string;    // 点赞者姓名
    authorId: number;    // 评论作者ID
    commentContent: string; // 评论内容
    postTitle: string;   // 所属帖子标题
  }): Promise<void> {
    try {
      // 排除自己点赞自己的评论，不发送通知
      if (event.userId === event.authorId) {
        return;
      }

      this.logger.log(`[MessageListener] 收到评论点赞事件: CommentID: ${event.commentId}, Sender: ${event.userId}`);

      // 截取评论内容防止太长
      const snippet = event.commentContent.length > 20 ? event.commentContent.slice(0, 20) + '...' : event.commentContent;

      const likeMsg: CreateMessageDto = {
        title: `评论收到了新的点赞`,
        content: `用户 ${event.userName} 赞了您在《${event.postTitle}》下的评论“${snippet}”`,
        messageType: '2', // 社交互动
        bizType: 'comment_like',
        bizId: event.postId,
        senderId: event.userId,
        receiverType: '1',
        receiverId: event.authorId,
      };
      await this.messageService.createMessage(likeMsg);
    } catch (err) {
      this.logger.error(`[MessageListener] 消费评论点赞事件发生异常: ${err.message}`);
    }
  }

  /**
   * 监听帖子被收藏事件，生成社交互动通知发送给帖子作者
   */
  @OnEvent('forum.post.collected')
  public async handlePostCollected(event: {
    postId: number;
    userId: number;      // 收藏者ID
    userName: string;    // 收藏者姓名
    authorId: number;    // 帖子作者ID
    postTitle: string;   // 帖子标题
  }): Promise<void> {
    try {
      // 排除自己收藏自己的帖子，不发送通知
      if (event.userId === event.authorId) {
        return;
      }

      this.logger.log(`[MessageListener] 收到帖子收藏事件: PostID: ${event.postId}, Sender: ${event.userId}`);

      const collectMsg: CreateMessageDto = {
        title: `帖子被用户收藏`,
        content: `用户 ${event.userName} 收藏了您的帖子《${event.postTitle}》`,
        messageType: '2', // 社交互动
        bizType: 'post_collect',
        bizId: event.postId,
        senderId: event.userId,
        receiverType: '1',
        receiverId: event.authorId,
      };
      await this.messageService.createMessage(collectMsg);
    } catch (err) {
      this.logger.error(`[MessageListener] 消费帖子收藏事件发生异常: ${err.message}`);
    }
  }
}
