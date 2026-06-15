import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboEntity } from './entities/weibo.entity';
import { QueryWeiboDto } from './dto/query-weibo.dto';

@Injectable()
export class WeiboService {
  constructor(
    @InjectRepository(WeiboEntity)
    private readonly weiboRepository: Repository<WeiboEntity>,
  ) {}

  async findAll(query: QueryWeiboDto) {
    const { pageNum, pageSize, content, userId, params } = query;
    const skip = (Number(pageNum) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const qb = this.weiboRepository.createQueryBuilder('weibo');

    if (content) {
      qb.andWhere('weibo.content LIKE :content', { content: `%${content}%` });
    }
    
    if (userId) {
      qb.andWhere('weibo.userId = :userId', { userId });
    }

    if (params && params.beginTime && params.endTime) {
      qb.andWhere('weibo.publishTime BETWEEN :start AND :end', {
        start: params.beginTime,
        end: params.endTime,
      });
    }

    qb.orderBy('weibo.publishTime', 'DESC');
    qb.skip(skip).take(take);

    const [rows, total] = await qb.getManyAndCount();
    return {
      rows,
      total,
    };
  }

  async findOne(id: string) {
    return this.weiboRepository.findOne({ where: { id } });
  }
}
