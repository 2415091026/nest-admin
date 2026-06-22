import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sys_message_read', {
  comment: '用户消息已读状态表',
})
@Index(['userId', 'messageId'], { unique: true })
export class SysMessageReadEntity {
  @ApiProperty({ type: Number, description: '自增ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  public id: number;

  @ApiProperty({ type: Number, description: '关联消息ID' })
  @Column({ type: 'int', name: 'message_id', comment: '关联消息ID' })
  public messageId: number;

  @ApiProperty({ type: Number, description: '关联用户ID' })
  @Column({ type: 'int', name: 'user_id', comment: '关联用户ID' })
  public userId: number;

  @ApiProperty({ type: String, description: '是否已读（1已读）' })
  @Column({ type: 'char', name: 'read_status', length: 1, default: '1', comment: '是否已读（1已读）' })
  public readStatus: string;

  @ApiProperty({ type: Date, description: '已读阅读时间' })
  @CreateDateColumn({ type: 'datetime', name: 'read_time', comment: '已读阅读时间' })
  public readTime: Date;
}
