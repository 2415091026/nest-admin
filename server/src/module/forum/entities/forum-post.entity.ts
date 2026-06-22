import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../system/user/entities/sys-user.entity';

@Entity('sys_forum_post', {
  comment: '论坛帖子表',
})
export class ForumPostEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '帖子ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'post_id', comment: '帖子ID' })
  public postId: number;

  @ApiProperty({ type: Number, description: '分类板块ID' })
  @Column({ type: 'int', name: 'category_id', comment: '分类板块ID' })
  public categoryId: number;

  @ApiProperty({ type: String, description: '帖子标题' })
  @Column({ type: 'varchar', name: 'title', length: 150, comment: '帖子标题' })
  public title: string;

  @ApiProperty({ type: String, description: '帖子正文' })
  @Column({ type: 'text', name: 'content', comment: '帖子正文' })
  public content: string;

  @ApiProperty({ type: Number, description: '发帖人ID' })
  @Column({ type: 'int', name: 'user_id', comment: '发帖人ID' })
  public userId: number;

  @ApiProperty({ type: Number, description: '浏览次数' })
  @Column({ type: 'int', name: 'view_count', default: 0, comment: '浏览次数' })
  public viewCount: number;

  @ApiProperty({ type: Number, description: '点赞次数' })
  @Column({ type: 'int', name: 'like_count', default: 0, comment: '点赞次数' })
  public likeCount: number;

  @ApiProperty({ type: Number, description: '收藏次数' })
  @Column({ type: 'int', name: 'collect_count', default: 0, comment: '收藏次数' })
  public collectCount: number;

  @ApiProperty({ type: String, description: '是否置顶 (0否 1是)' })
  @Column({ type: 'char', name: 'is_top', default: '0', length: 1, comment: '是否置顶 (0否 1是)' })
  public isTop: string;

  @ApiProperty({ type: String, description: '是否精华 (0否 1是)' })
  @Column({ type: 'char', name: 'is_essence', default: '0', length: 1, comment: '是否精华 (0否 1是)' })
  public isEssence: string;

  // 通过 @ManyToOne 关联系统用户实体
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;
}
