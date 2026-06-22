import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SysMessageEntity } from './entities/message.entity';
import { SysMessageReadEntity } from './entities/message-read.entity';
import { CreateMessageDto, ListMessageDto } from './dto/message.dto';
import { ResultData } from 'src/common/utils/result';
import { MessageGateway } from './message.gateway';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(SysMessageEntity)
    private readonly messageRepo: Repository<SysMessageEntity>,
    @InjectRepository(SysMessageReadEntity)
    private readonly messageReadRepo: Repository<SysMessageReadEntity>,
    private readonly messageGateway: MessageGateway,
  ) {}

  /**
   * 创建系统消息并持久化，若接收方在线则同步通过 WebSocket 实时下发
   */
  public createMessage = async (dto: CreateMessageDto): Promise<SysMessageEntity> => {
    const message = this.messageRepo.create({
      ...dto,
      createBy: dto.senderId ? String(dto.senderId) : 'system',
      updateBy: dto.senderId ? String(dto.senderId) : 'system',
    });
    
    const saved = await this.messageRepo.save(message);
    this.logger.log(`[MessageService] 消息入库成功 (ID: ${saved.messageId}, Type: ${saved.messageType})`);

    // 针对点对点单发消息进行实时推送
    if (saved.receiverType === '1' && saved.receiverId) {
      const pushed = this.messageGateway.sendToUser(saved.receiverId, 'new_message', {
        messageId: saved.messageId,
        title: saved.title,
        content: saved.content,
        messageType: saved.messageType,
        bizType: saved.bizType,
        bizId: saved.bizId,
        createTime: saved.createTime,
      });
      if (pushed) {
        this.logger.log(`[MessageService] 已实时向在线用户 ${saved.receiverId} 推送消息`);
      }
    } else if (saved.receiverType === '0') {
      // 针对广播群发进行全网推
      this.messageGateway.broadcast('new_message', {
        messageId: saved.messageId,
        title: saved.title,
        content: saved.content,
        messageType: saved.messageType,
        bizType: saved.bizType,
        bizId: saved.bizId,
        createTime: saved.createTime,
      });
      this.logger.log(`[MessageService] 已向全体在线用户广播新消息`);
    }

    return saved;
  };

  /**
   * 分页获取当前用户的全部通知消息，并基于 receiver_type 动态混入已读未读状态
   */
  public findAllMessages = async (query: ListMessageDto, userId: number): Promise<ResultData> => {
    const qb = this.messageRepo.createQueryBuilder('msg')
      .leftJoinAndMapOne(
        'msg.readRecord',
        SysMessageReadEntity,
        'mr',
        'mr.messageId = msg.messageId AND mr.userId = :userId',
        { userId }
      )
      .where('msg.delFlag = :delFlag', { delFlag: '0' });

    // 过滤：只能拉取单发给当前用户的消息，或群发给所有人的公共消息
    qb.andWhere(
      '((msg.receiverType = :recTypeUser AND msg.receiverId = :userId) OR msg.receiverType = :recTypeAll)',
      { recTypeUser: '1', userId, recTypeAll: '0' }
    );

    // 大类过滤
    if (query.messageType) {
      qb.andWhere('msg.messageType = :msgType', { msgType: query.messageType });
    }

    // 状态过滤（0未读 1已读）
    // 未读：单发消息的主表 readStatus 为 0；群发消息的关联表记录不存在（mr.id 为空）
    // 已读：单发消息的主表 readStatus 为 1；群发消息的关联表记录存在（mr.readStatus 为 1）
    if (query.readStatus) {
      if (query.readStatus === '0') {
        qb.andWhere(
          '((msg.receiverType = :recTypeUser AND msg.readStatus = :unread) OR (msg.receiverType = :recTypeAll AND mr.id IS NULL))',
          { recTypeUser: '1', unread: '0', recTypeAll: '0' }
        );
      } else if (query.readStatus === '1') {
        qb.andWhere(
          '((msg.receiverType = :recTypeUser AND msg.readStatus = :readed) OR (msg.receiverType = :recTypeAll AND mr.readStatus = :readed))',
          { recTypeUser: '1', readed: '1', recTypeAll: '0' }
        );
      }
    }

    // 按时间最新倒序
    qb.orderBy('msg.createTime', 'DESC');

    if (query.pageSize && query.pageNum) {
      qb.skip(query.pageSize * (query.pageNum - 1)).take(query.pageSize);
    }

    const [list, total] = await qb.getManyAndCount();

    // 统一输出的已读状态字段映射
    const mappedList = list.map((msg) => {
      const isGroup = msg.receiverType === '0';
      const status = isGroup ? (msg['readRecord'] ? '1' : '0') : msg.readStatus;
      
      const res = { ...msg, readStatus: status };
      delete res['readRecord'];
      return res;
    });

    return ResultData.ok({ list: mappedList, total });
  };

  /**
   * 批量将用户指定的系统消息标记为已读状态
   */
  public markAsRead = async (messageIds: number[], userId: number): Promise<ResultData> => {
    if (!messageIds || messageIds.length === 0) {
      return ResultData.ok();
    }

    // 查询出这些消息，用以区分单发和广播
    const messages = await this.messageRepo.find({
      where: { messageId: In(messageIds), delFlag: '0' },
    });

    const userMessageIds = messages
      .filter((msg) => msg.receiverType === '1' && msg.receiverId === userId)
      .map((msg) => msg.messageId);

    const groupMessages = messages.filter((msg) => msg.receiverType === '0');

    // 1. 批量处理单发消息：直接更新主表状态
    if (userMessageIds.length > 0) {
      await this.messageRepo.update(
        { messageId: In(userMessageIds) },
        { readStatus: '1', updateBy: String(userId) }
      );
    }

    // 2. 批量处理广播群发消息：在关联表中建立已读记录
    if (groupMessages.length > 0) {
      for (const msg of groupMessages) {
        try {
          // 使用 try-catch 防止因联合唯一索引报错导致的事务崩塌
          const exist = await this.messageReadRepo.findOne({
            where: { messageId: msg.messageId, userId },
          });
          if (!exist) {
            const readRecord = this.messageReadRepo.create({
              messageId: msg.messageId,
              userId,
              readStatus: '1',
            });
            await this.messageReadRepo.save(readRecord);
          }
        } catch (e) {
          this.logger.warn(`[MessageService] 广播消息已读状态记录已存在，跳过: MsgID: ${msg.messageId}`);
        }
      }
    }

    return ResultData.ok();
  };

  /**
   * 聚合获取当前登录用户的总未读消息数（单发未读 + 广播未读）
   */
  public getUnreadCount = async (userId: number): Promise<ResultData> => {
    // A. 计算未读单发消息数
    const unreadUserCount = await this.messageRepo.count({
      where: { receiverType: '1', receiverId: userId, readStatus: '0', delFlag: '0' },
    });

    // B. 计算未读广播消息数（在 sys_message 表存在且删除标志为0，但未出现在 sys_message_read 里的广播消息）
    const unreadAllCount = await this.messageRepo.createQueryBuilder('msg')
      .leftJoin(
        SysMessageReadEntity,
        'mr',
        'mr.messageId = msg.messageId AND mr.userId = :userId',
        { userId }
      )
      .where('msg.receiverType = :recTypeAll', { recTypeAll: '0' })
      .andWhere('msg.delFlag = :delFlag', { delFlag: '0' })
      .andWhere('mr.id IS NULL')
      .getCount();

    return ResultData.ok({
      unreadCount: unreadUserCount + unreadAllCount,
    });
  };
}
