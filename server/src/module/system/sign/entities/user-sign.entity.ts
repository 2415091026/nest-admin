import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sys_user_sign', {
  comment: '用户签到累计状态表',
})
export class SysUserSignEntity {
  @ApiProperty({ type: Number, description: '用户ID' })
  @PrimaryColumn({ type: 'int', name: 'user_id', comment: '用户ID' })
  public userId: number;

  @ApiProperty({ type: Date, description: '上一次签到时间' })
  @Column({ type: 'timestamp', name: 'last_sign_time', default: null, nullable: true, comment: '上一次签到时间' })
  public lastSignTime: Date;

  @ApiProperty({ type: Number, description: '连续签到天数' })
  @Column({ type: 'int', name: 'consecutive_days', default: 0, comment: '当前连续签到天数' })
  public consecutiveDays: number;

  @ApiProperty({ type: Number, description: '累计签到天数' })
  @Column({ type: 'int', name: 'total_days', default: 0, comment: '历史累计总签到天数' })
  public totalDays: number;
}
