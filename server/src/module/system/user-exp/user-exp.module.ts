import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { SysUserExpLogEntity } from './entities/user-exp-log.entity';
import { UserExpService } from './user-exp.service';
import { UserExpListener } from './user-exp.listener';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SysUserExpLogEntity]),
  ],
  providers: [UserExpService, UserExpListener],
  exports: [UserExpService],
})
export class UserExpModule {}
