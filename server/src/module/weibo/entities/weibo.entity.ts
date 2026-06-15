import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('weibo')
export class WeiboEntity {
  @PrimaryColumn({ type: 'varchar', length: 10, comment: '微博id' })
  id: string;

  @Column({ type: 'varchar', length: 12, nullable: true, comment: '微博用户id' })
  userId: string;

  @Column({ type: 'varchar', length: 5000, nullable: true, comment: '微博正文' })
  content: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '头条文章url' })
  articleUrl: string;

  @Column({ type: 'varchar', length: 3000, nullable: true, comment: '原始图片url' })
  originalPictures: string;

  @Column({ type: 'varchar', length: 3000, nullable: true, comment: '转发图片url' })
  retweetPictures: string;

  @Column({ type: 'boolean', default: true, comment: '是否原创' })
  original: boolean;

  @Column({ type: 'varchar', length: 300, nullable: true, comment: '视频url' })
  videoUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '发布位置' })
  publishPlace: string;

  @Column({ type: 'datetime', nullable: true, comment: '发布时间' })
  publishTime: Date;

  @Column({ type: 'varchar', length: 30, nullable: true, comment: '发布工具' })
  publishTool: string;

  @Column({ type: 'int', default: 0, comment: '点赞数' })
  upNum: number;

  @Column({ type: 'int', default: 0, comment: '转发数' })
  retweetNum: number;

  @Column({ type: 'int', default: 0, comment: '评论数' })
  commentNum: number;
}
