import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sys_forum_post_collect', {
  comment: '论坛帖子收藏关联表',
})
@Index(['postId', 'userId'], { unique: true })
export class ForumPostCollectEntity {
  @ApiProperty({ type: Number, description: '自增ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  public id: number;

  @ApiProperty({ type: Number, description: '帖子ID' })
  @Column({ type: 'int', name: 'post_id', comment: '帖子ID' })
  public postId: number;

  @ApiProperty({ type: Number, description: '用户ID' })
  @Column({ type: 'int', name: 'user_id', comment: '用户ID' })
  public userId: number;

  @ApiProperty({ type: Date, description: '收藏时间' })
  @CreateDateColumn({ type: 'datetime', name: 'create_time', comment: '收藏时间' })
  public createTime: Date;
}
