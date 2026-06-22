import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../system/user/entities/sys-user.entity';
import { ForumPostEntity } from './forum-post.entity';

@Entity('sys_forum_post_report', {
  comment: '论坛帖子举报记录表',
})
export class ForumPostReportEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '举报ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'report_id', comment: '举报ID' })
  public reportId: number;

  @ApiProperty({ type: Number, description: '被举报帖子ID' })
  @Column({ type: 'int', name: 'post_id', comment: '被举报帖子ID' })
  public postId: number;

  @ApiProperty({ type: Number, description: '举报人用户ID' })
  @Column({ type: 'int', name: 'user_id', comment: '举报人用户ID' })
  public userId: number;

  @ApiProperty({ type: String, description: '举报原因' })
  @Column({ type: 'varchar', name: 'reason', length: 100, comment: '举报原因' })
  public reason: string;

  @ApiProperty({ type: String, description: '举报详细说明' })
  @Column({ type: 'varchar', name: 'content', length: 500, default: '', comment: '举报详细说明' })
  public content: string;

  // 关联被举报的帖子，当帖子删除时级联删除举报记录
  @ManyToOne(() => ForumPostEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  public post: ForumPostEntity;

  // 关联举报的用户
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;
}
