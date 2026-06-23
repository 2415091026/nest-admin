import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysUserSignEntity } from './entities/user-sign.entity';
import { SysUserSignLogEntity } from './entities/user-sign-log.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResultData } from 'src/common/utils/result';
import dayjs from 'dayjs';

@Injectable()
export class SignService {
  private readonly logger = new Logger(SignService.name);

  constructor(
    @InjectRepository(SysUserSignEntity)
    private readonly signRepo: Repository<SysUserSignEntity>,
    @InjectRepository(SysUserSignLogEntity)
    private readonly logRepo: Repository<SysUserSignLogEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 执行每日签到操作
   */
  public async doSign(userId: number): Promise<ResultData> {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    // 1. 重复签到校验
    const signedToday = await this.logRepo.findOne({ where: { userId, signDate: today } });
    if (signedToday) {
      throw new BadRequestException('今天已经完成签到，请勿重复操作');
    }

    // 2. 获取或创建签到累计状态
    let signStatus = await this.signRepo.findOne({ where: { userId } });
    if (!signStatus) {
      signStatus = this.signRepo.create({
        userId,
        consecutiveDays: 0,
        totalDays: 0,
        lastSignTime: null,
      });
    }

    // 3. 计算连续签到天数
    const lastSignDateStr = signStatus.lastSignTime ? dayjs(signStatus.lastSignTime).format('YYYY-MM-DD') : null;
    if (lastSignDateStr === yesterday) {
      signStatus.consecutiveDays += 1;
    } else {
      signStatus.consecutiveDays = 1; // 首次或发生断签，重置为 1
    }

    // 4. 阶梯额外加分计算 (10点基础经验 + 连续阶梯加成)
    let bonusExp = 0;
    const days = signStatus.consecutiveDays;
    if (days >= 30) bonusExp = 50;
    else if (days >= 15) bonusExp = 30;
    else if (days >= 7) bonusExp = 15;
    else if (days >= 3) bonusExp = 5;

    const totalExpReward = 10 + bonusExp;

    // 5. 保存签到累计状态
    signStatus.lastSignTime = new Date();
    signStatus.totalDays += 1;
    await this.signRepo.save(signStatus);

    // 6. 记录签到明细日志流水
    const log = this.logRepo.create({
      userId,
      signDate: today,
      rewardExp: totalExpReward,
    });
    await this.logRepo.save(log);

    this.logger.log(`[SignService] 用户 ${userId} 签到成功: 累计${signStatus.totalDays}天, 连续${signStatus.consecutiveDays}天, 奖励经验 ${totalExpReward}`);

    // 7. 发射签到成功事件，驱动经验变更流
    this.eventEmitter.emit('sys.user.signed', {
      userId,
      rewardExp: totalExpReward,
      consecutiveDays: signStatus.consecutiveDays,
    });

    return ResultData.ok({
      rewardExp: totalExpReward,
      consecutiveDays: signStatus.consecutiveDays,
      totalDays: signStatus.totalDays,
      lastSignTime: signStatus.lastSignTime,
      todaySigned: true,
    });
  }

  /**
   * 获取用户当前签到状态与近期历史
   */
  public async getSignStatus(userId: number): Promise<ResultData> {
    const today = dayjs().format('YYYY-MM-DD');

    // 1. 获取累积签到信息
    let signStatus = await this.signRepo.findOne({ where: { userId } });
    if (!signStatus) {
      signStatus = {
        userId,
        consecutiveDays: 0,
        totalDays: 0,
        lastSignTime: null,
      } as SysUserSignEntity;
    }

    // 2. 检查今天是否已签到
    const signedToday = await this.logRepo.findOne({ where: { userId, signDate: today } });

    // 3. 拉取最近 10 次的签到明细日志供页面日历渲染
    const recentLogs = await this.logRepo.find({
      where: { userId },
      order: { createTime: 'DESC' },
      take: 10,
    });

    return ResultData.ok({
      consecutiveDays: signStatus.consecutiveDays,
      totalDays: signStatus.totalDays,
      lastSignTime: signStatus.lastSignTime,
      todaySigned: !!signedToday,
      history: recentLogs,
    });
  }
}
