import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserExpService } from './user-exp.service';

@Injectable()
export class UserExpListener {
  private readonly logger = new Logger(UserExpListener.name);

  constructor(private readonly userExpService: UserExpService) {}

  /**
   * 监听签到成功事件，增加签到所得经验值
   */
  @OnEvent('sys.user.signed')
  public async handleUserSigned(event: {
    userId: number;
    rewardExp: number;
    consecutiveDays: number;
  }): Promise<void> {
    try {
      this.logger.log(`[UserExpListener] 收到签到成功事件: 用户 ${event.userId}, 获得经验 ${event.rewardExp}`);
      await this.userExpService.rewardExp(
        event.userId,
        event.rewardExp,
        'sign',
        `每日签到成功(连续第${event.consecutiveDays}天)`,
      );
    } catch (err) {
      this.logger.error(`[UserExpListener] 消费签到经验发放失败: ${err.message}`);
    }
  }

  /**
   * 监听发帖成功事件，增加 15 经验值
   */
  @OnEvent('forum.post.created')
  public async handlePostCreated(event: {
    postId: number;
    userId: number;
    postTitle: string;
  }): Promise<void> {
    try {
      this.logger.log(`[UserExpListener] 收到发帖事件: 用户 ${event.userId}, 帖子ID ${event.postId}`);
      await this.userExpService.rewardExp(
        event.userId,
        15,
        'post',
        `发布帖子《${event.postTitle}》获得经验`,
      );
    } catch (err) {
      this.logger.error(`[UserExpListener] 消费发帖经验发放失败: ${err.message}`);
    }
  }

  /**
   * 监听帖子被回复（评论主贴）事件，增加评论人 10 经验值
   */
  @OnEvent('forum.post.commented')
  public async handlePostCommented(event: {
    postId: number;
    commentId: number;
    userId: number;
    userName: string;
    authorId: number;
    postTitle: string;
    content: string;
  }): Promise<void> {
    try {
      this.logger.log(`[UserExpListener] 收到发帖评论事件: 评论人 ${event.userId}, 帖子ID ${event.postId}`);
      // 增加评论人的经验
      await this.userExpService.rewardExp(
        event.userId,
        10,
        'comment',
        `评论帖子《${event.postTitle}》获得经验`,
      );
    } catch (err) {
      this.logger.error(`[UserExpListener] 消费帖子评论经验发放失败: ${err.message}`);
    }
  }

  /**
   * 监听评论被回复事件，增加回复者 10 经验值
   */
  @OnEvent('forum.comment.replied')
  public async handleCommentReplied(event: {
    postId: number;
    commentId: number;
    userId: number;
    userName: string;
    authorId: number;
    postTitle: string;
    content: string;
    parentContent: string;
  }): Promise<void> {
    try {
      this.logger.log(`[UserExpListener] 收到回复评论事件: 回复者 ${event.userId}, 回复ID ${event.commentId}`);
      await this.userExpService.rewardExp(
        event.userId,
        10,
        'comment',
        `在帖子《${event.postTitle}》下回复他人评论获得经验`,
      );
    } catch (err) {
      this.logger.error(`[UserExpListener] 消费回复评论经验发放失败: ${err.message}`);
    }
  }

  /**
   * 监听帖子被点赞事件，增加被赞作者（帖子发布者） 5 经验值 (排除自赞)
   */
  @OnEvent('forum.post.liked')
  public async handlePostLiked(event: {
    postId: number;
    userId: number;
    userName: string;
    authorId: number;
    postTitle: string;
  }): Promise<void> {
    try {
      if (event.userId === event.authorId) return; // 排除自赞
      this.logger.log(`[UserExpListener] 收到帖子被赞事件: 作者 ${event.authorId}, 帖子ID ${event.postId}`);
      await this.userExpService.rewardExp(
        event.authorId,
        5,
        'like_post',
        `帖子《${event.postTitle}》获得点赞`,
      );
    } catch (err) {
      this.logger.error(`[UserExpListener] 消费帖子点赞经验发放失败: ${err.message}`);
    }
  }

  /**
   * 监听评论被点赞事件，增加被赞作者（评论发布者） 5 经验值 (排除自赞)
   */
  @OnEvent('forum.comment.liked')
  public async handleCommentLiked(event: {
    commentId: number;
    postId: number;
    userId: number;
    userName: string;
    authorId: number;
    commentContent: string;
    postTitle: string;
  }): Promise<void> {
    try {
      if (event.userId === event.authorId) return; // 排除自赞
      this.logger.log(`[UserExpListener] 收到评论被赞事件: 作者 ${event.authorId}, 评论ID ${event.commentId}`);
      const snippet = event.commentContent.length > 15 ? event.commentContent.slice(0, 15) + '...' : event.commentContent;
      await this.userExpService.rewardExp(
        event.authorId,
        5,
        'like_comment',
        `评论“${snippet}”获得点赞`,
      );
    } catch (err) {
      this.logger.error(`[UserExpListener] 消费评论点赞经验发放失败: ${err.message}`);
    }
  }
}
