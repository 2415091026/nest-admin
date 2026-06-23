export interface LevelInfo {
  level: number;
  requiredCumulativeExp: number; // 达到此等级需要达到的累计总经验
  intervalExp: number;           // 升级到下一级所需的区间经验值 (0表示已满级)
}

export class LevelSystem {
  public static readonly MAX_LEVEL = 18;

  // 1-18级 经验阶梯映射配置表
  private static readonly LEVEL_RULES: LevelInfo[] = [
    { level: 1,  requiredCumulativeExp: 0,      intervalExp: 100 },
    { level: 2,  requiredCumulativeExp: 100,    intervalExp: 200 },
    { level: 3,  requiredCumulativeExp: 300,    intervalExp: 500 },
    { level: 4,  requiredCumulativeExp: 800,    intervalExp: 1000 },
    { level: 5,  requiredCumulativeExp: 1800,   intervalExp: 1800 },
    { level: 6,  requiredCumulativeExp: 3600,   intervalExp: 3000 },
    { level: 7,  requiredCumulativeExp: 6600,   intervalExp: 5000 },
    { level: 8,  requiredCumulativeExp: 11600,  intervalExp: 8000 },
    { level: 9,  requiredCumulativeExp: 19600,  intervalExp: 12000 },
    { level: 10, requiredCumulativeExp: 31600,  intervalExp: 18000 },
    { level: 11, requiredCumulativeExp: 49600,  intervalExp: 25000 },
    { level: 12, requiredCumulativeExp: 74600,  intervalExp: 35000 },
    { level: 13, requiredCumulativeExp: 109600, intervalExp: 50000 },
    { level: 14, requiredCumulativeExp: 159600, intervalExp: 70000 },
    { level: 15, requiredCumulativeExp: 229600, intervalExp: 100000 },
    { level: 16, requiredCumulativeExp: 329600, intervalExp: 150000 },
    { level: 17, requiredCumulativeExp: 479600, intervalExp: 220400 },
    { level: 18, requiredCumulativeExp: 700000, intervalExp: 0 } // 18级满级，无下一级区间经验
  ];

  /**
   * 根据用户的当前累计总经验值，计算出应该达到的最高等级
   * @param currentExp 当前累计总经验值
   */
  public static getLevelByExp(currentExp: number): number {
    if (currentExp <= 0) return 1;

    // 逆向匹配查找
    for (let i = this.LEVEL_RULES.length - 1; i >= 0; i--) {
      if (currentExp >= this.LEVEL_RULES[i].requiredCumulativeExp) {
        return this.LEVEL_RULES[i].level;
      }
    }
    return 1;
  }

  /**
   * 获取指定等级的详细经验配置
   * @param level 等级
   */
  public static getLevelInfo(level: number): LevelInfo {
    const targetLevel = Math.max(1, Math.min(level, this.MAX_LEVEL));
    return this.LEVEL_RULES.find(item => item.level === targetLevel);
  }
}
