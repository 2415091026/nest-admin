import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { MainService } from './main.service';
import { MainController } from './main.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [MainController],
  providers: [MainService],
})
export class MainModule {}
