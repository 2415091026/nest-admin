import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sys_message', {
  comment: '系统消息表',
})
export class SysMessageEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '消息ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'message_id', comment: '消息ID' })
  public messageId: number;

  @ApiProperty({ type: String, description: '消息标题' })
  @Column({ type: 'varchar', name: 'title', length: 100, comment: '消息标题' })
  public title: string;

  @ApiProperty({ type: String, description: '消息正文内容' })
  @Column({ type: 'text', name: 'content', comment: '消息正文内容' })
  public content: string;

  @ApiProperty({ type: String, description: '消息大类（1系统公告 2社交互动 3业务提醒）' })
  @Column({ type: 'char', name: 'message_type', length: 1, default: '1', comment: '消息大类（1系统公告 2社交互动 3业务提醒）' })
  public messageType: string;

  @ApiProperty({ type: String, description: '细分业务类型（如: post_report_processed 举报已处理）' })
  @Column({ type: 'varchar', name: 'biz_type', length: 50, nullable: true, comment: '细分业务类型' })
  public bizType: string;

  @ApiProperty({ type: Number, description: '关联的具体业务ID' })
  @Column({ type: 'int', name: 'biz_id', nullable: true, comment: '关联的具体业务ID' })
  public bizId: number;

  @ApiProperty({ type: Number, description: '发送人ID（0代表系统发送）' })
  @Column({ type: 'int', name: 'sender_id', default: 0, comment: '发送人ID' })
  public senderId: number;

  @ApiProperty({ type: String, description: '接收者范围（0全体群发 1单发个人）' })
  @Column({ type: 'char', name: 'receiver_type', length: 1, default: '1', comment: '接收者范围（0全体群发 1单发个人）' })
  public receiverType: string;

  @ApiProperty({ type: Number, description: '接收人ID（全体群发时为空）' })
  @Column({ type: 'int', name: 'receiver_id', nullable: true, comment: '接收人ID' })
  public receiverId: number;

  @ApiProperty({ type: String, description: '是否已读（0未读 1已读）' })
  @Column({ type: 'char', name: 'read_status', length: 1, default: '0', comment: '是否已读（0未读 1已读）' })
  public readStatus: string;
}
