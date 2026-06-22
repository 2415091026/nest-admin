import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sys_forum_comment_like', {
  comment: '论坛评论点赞关联表',
})
@Index(['commentId', 'userId'], { unique: true })
export class ForumCommentLikeEntity {
  @ApiProperty({ type: Number, description: '自增ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  public id: number;

  @ApiProperty({ type: Number, description: '评论ID' })
  @Column({ type: 'int', name: 'comment_id', comment: '评论ID' })
  public commentId: number;

  @ApiProperty({ type: Number, description: '用户ID' })
  @Column({ type: 'int', name: 'user_id', comment: '用户ID' })
  public userId: number;

  @ApiProperty({ type: Date, description: '点赞时间' })
  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '点赞时间' })
  public createTime: Date;
}
