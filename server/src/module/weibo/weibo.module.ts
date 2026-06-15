import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeiboService } from './weibo.service';
import { WeiboController } from './weibo.controller';
import { WeiboEntity } from './entities/weibo.entity';
import { WeiboUserEntity } from './entities/weibo-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WeiboEntity, WeiboUserEntity])],
  controllers: [WeiboController],
  providers: [WeiboService],
  exports: [WeiboService],
})
export class WeiboModule {}
