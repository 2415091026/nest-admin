import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../system/user/entities/sys-user.entity';
import { ForumPostEntity } from './forum-post.entity';

@Entity('sys_forum_comment', {
  comment: '论坛回帖评论表',
})
export class ForumCommentEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '评论ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'comment_id', comment: '评论ID' })
  public commentId: number;

  @ApiProperty({ type: Number, description: '帖子ID' })
  @Column({ type: 'int', name: 'post_id', comment: '帖子ID' })
  public postId: number;

  @ApiProperty({ type: Number, description: '父评论ID' })
  @Column({ type: 'int', name: 'parent_id', nullable: true, default: null, comment: '父评论ID' })
  public parentId: number;

  @ApiProperty({ type: String, description: '评论内容' })
  @Column({ type: 'text', name: 'content', comment: '评论内容' })
  public content: string;

  @ApiProperty({ type: Number, description: '评论人ID' })
  @Column({ type: 'int', name: 'user_id', comment: '评论人ID' })
  public userId: number;

  @ApiProperty({ type: Number, description: '点赞数' })
  @Column({ type: 'int', name: 'like_count', default: 0, comment: '点赞数' })
  public likeCount: number;

  // 关联回帖发布人
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;

  // 关联所属主帖
  @ManyToOne(() => ForumPostEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  public post: ForumPostEntity;

  // 关联父级评论，以支持嵌套树状结构
  @ManyToOne(() => ForumCommentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  public parent: ForumCommentEntity;
}
