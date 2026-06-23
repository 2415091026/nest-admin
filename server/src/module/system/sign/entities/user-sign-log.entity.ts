import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { dateTransformer } from 'src/common/utils/index';

@Entity('sys_user_sign_log', {
  comment: '用户每日签到流水日志表',
})
export class SysUserSignLogEntity {
  @ApiProperty({ type: Number, description: '主键自增ID' })
  @PrimaryGeneratedColumn({ type: 'int' })
  public id: number;

  @ApiProperty({ type: Number, description: '用户ID' })
  @Column({ type: 'int', name: 'user_id', comment: '用户ID' })
  public userId: number;

  @ApiProperty({ type: String, description: '签到日期(格式: YYYY-MM-DD)' })
  @Column({ type: 'date', name: 'sign_date', comment: '签到日期 YYYY-MM-DD，防重校验' })
  public signDate: string;

  @ApiProperty({ type: Number, description: '本次获得的奖励经验' })
  @Column({ type: 'int', name: 'reward_exp', comment: '本次获得的奖励经验' })
  public rewardExp: number;

  @ApiProperty({ type: Date, description: '签到创建时间' })
  @CreateDateColumn({ type: 'datetime', name: 'create_time', default: null, transformer: dateTransformer, comment: '签到时间' })
  public createTime: Date;
}
