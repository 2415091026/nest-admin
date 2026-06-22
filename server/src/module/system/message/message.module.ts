import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { MessageListener } from './message.listener';
import { SysMessageEntity } from './entities/message.entity';
import { SysMessageReadEntity } from './entities/message-read.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SysMessageEntity, SysMessageReadEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('jwt.secretkey'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageGateway, MessageListener],
  exports: [MessageService, MessageGateway],
})
export class MessageModule {}
