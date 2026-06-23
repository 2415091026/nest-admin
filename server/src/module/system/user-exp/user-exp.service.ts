import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { SysUserExpLogEntity } from './entities/user-exp-log.entity';
import { LevelSystem } from './level-config';
import { MessageService } from 'src/module/system/message/message.service';
import dayjs from 'dayjs';

@Injectable()
export class UserExpService {
  private readonly logger = new Logger(UserExpService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SysUserExpLogEntity)
    private readonly expLogRepo: Repository<SysUserExpLogEntity>,
    private readonly messageService: MessageService,
  ) {}

  /**
   * 给用户发放经验，并判断是否升级与派发实时通知
   * @param userId 用户 ID
   * @param changeExp 变动的经验值 (正数为加分，负数为扣除)
   * @param sourceType 变动源 (sign, post, comment, like)
   * @param remark 变动备注描述
   */
  public async rewardExp(
    userId: number,
    changeExp: number,
    sourceType: string,
    remark: string = '',
  ): Promise<{ oldLevel: number; newLevel: number; expValue: number }> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) {
      this.logger.warn(`[UserExpService] 经验发放失败，用户不存在: userId=${userId}`);
      return { oldLevel: 1, newLevel: 1, expValue: 0 };
    }

    const oldLevel = user.userLevel || 1;
    const oldExp = user.expValue || 0;

    // 1. 防刷限制：点赞获得经验值限制 (如果是 positive 加分且来源是点赞，限制每天获取上限为 50)
    if (changeExp > 0 && sourceType.includes('like')) {
      const todayStart = dayjs().startOf('day').toDate();
      const todayEnd = dayjs().endOf('day').toDate();
      
      const todayExpLogs = await this.expLogRepo.find({
        where: {
          userId,
          sourceType,
          createTime: Between(todayStart, todayEnd),
        },
      });

      const todayTotalGained = todayExpLogs.reduce((sum, log) => sum + (log.changeExp > 0 ? log.changeExp : 0), 0);
      if (todayTotalGained >= 50) {
        this.logger.log(`[UserExpService] 用户 ${userId} 今日通过 ${sourceType} 获得的经验已达上限(50)，本次加分拦截。`);
        // 仍记录一条零分流水用于追踪
        await this.writeExpLog(userId, 0, sourceType, `${remark} (今日已达上限，本次拦截)`);
        return { oldLevel, newLevel: oldLevel, expValue: oldExp };
      }
    }

    // 2. 写入经验变动日志表
    await this.writeExpLog(userId, changeExp, sourceType, remark);

    // 3. 更新用户累计经验值 (最小值为 0)
    const newExp = Math.max(0, oldExp + changeExp);
    user.expValue = newExp;

    // 4. 根据最新经验值计算最新等级
    const newLevel = LevelSystem.getLevelByExp(newExp);
    user.userLevel = newLevel;

    await this.userRepo.save(user);
    this.logger.log(`[UserExpService] 用户 ${userId} 经验更新: ${oldExp} -> ${newExp}, 等级: ${oldLevel} -> ${newLevel}`);

    // 5. 触发升级处理及站内推送
    if (newLevel > oldLevel) {
      this.logger.log(`[UserExpService] 触发升级通知: 用户 ${userId} 升级至 Lv.${newLevel}`);
      try {
        await this.messageService.createMessage({
          title: '恭喜您升级啦！',
          content: `恭喜！您的社区活跃度已达标，当前等级已升级至 Lv.${newLevel}！`,
          messageType: '3', // 业务提醒
          bizType: 'user_level_up',
          bizId: newLevel,
          receiverType: '1',
          receiverId: userId,
        });
      } catch (err) {
        this.logger.error(`[UserExpService] 发送升级系统通知失败: ${err.message}`);
      }
    }

    return { oldLevel, newLevel, expValue: newExp };
  }

  /**
   * 写入经验流水日志
   */
  private async writeExpLog(userId: number, changeExp: number, sourceType: string, remark: string) {
    try {
      const log = this.expLogRepo.create({
        userId,
        changeExp,
        sourceType,
        remark,
        createBy: 'system',
        updateBy: 'system',
      });
      await this.expLogRepo.save(log);
    } catch (e) {
      this.logger.error(`[UserExpService] 写入经验变动日志失败: ${e.message}`);
    }
  }
}
