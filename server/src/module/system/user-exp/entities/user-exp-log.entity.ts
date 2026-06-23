import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/entities/base';

@Entity('sys_user_exp_log', {
  comment: '用户经验值变动流水日志表',
})
export class SysUserExpLogEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '日志ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'log_id', comment: '日志ID' })
  public logId: number;

  @ApiProperty({ type: Number, description: '用户ID' })
  @Column({ type: 'int', name: 'user_id', comment: '用户ID' })
  public userId: number;

  @ApiProperty({ type: Number, description: '经验值变动值' })
  @Column({ type: 'int', name: 'change_exp', comment: '经验值变动值(可正可负)' })
  public changeExp: number;

  @ApiProperty({ type: String, description: '变动业务类型' })
  @Column({ type: 'varchar', name: 'source_type', length: 50, comment: '经验变动源: sign, post, comment, like 等' })
  public sourceType: string;

  @ApiProperty({ type: String, description: '备注说明' })
  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注说明' })
  public remark: string;
}
