import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysUserSignEntity } from './entities/user-sign.entity';
import { SysUserSignLogEntity } from './entities/user-sign-log.entity';
import { SignController } from './sign.controller';
import { SignService } from './sign.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SysUserSignEntity, SysUserSignLogEntity]),
  ],
  controllers: [SignController],
  providers: [SignService],
  exports: [SignService],
})
export class SignModule {}
