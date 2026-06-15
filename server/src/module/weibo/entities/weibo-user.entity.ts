import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('user')
export class WeiboUserEntity {
  @PrimaryColumn({ type: 'varchar', length: 20, comment: '用户id' })
  id: string;

  @Column({ type: 'varchar', length: 30, nullable: true, comment: '用户昵称' })
  nickname: string;

  @Column({ type: 'varchar', length: 10, nullable: true, comment: '用户性别' })
  gender: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '用户所在地' })
  location: string;

  @Column({ type: 'varchar', length: 40, nullable: true, comment: '用户出生日期' })
  birthday: string;

  @Column({ type: 'varchar', length: 400, nullable: true, comment: '用户简介' })
  description: string;

  @Column({ type: 'varchar', length: 140, nullable: true, comment: '用户认证' })
  verifiedReason: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '用户标签' })
  talent: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '用户学习经历' })
  education: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '用户工作经历' })
  work: string;

  @Column({ type: 'int', nullable: true, comment: '微博数' })
  weiboNum: number;

  @Column({ type: 'int', nullable: true, comment: '关注数' })
  following: number;

  @Column({ type: 'int', nullable: true, comment: '粉丝数' })
  followers: number;
}
