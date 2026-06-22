import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { JobModule } from './job/job.module';
import { ServerModule } from './server/server.module';
import { CacheModule } from './cache/cache.module';
import { LoginlogModule } from './loginlog/loginlog.module';
import { OnlineModule } from './online/online.module';
import { OperlogModule } from './operlog/operlog.module';

@Module({
  imports: [
    JobModule,
    ServerModule,
    CacheModule,
    LoginlogModule,
    OnlineModule,
    OperlogModule,
    RouterModule.register([
      {
        path: 'admin',
        children: [
          JobModule,
          ServerModule,
          CacheModule,
          LoginlogModule,
          OnlineModule,
          OperlogModule,
        ],
      },
    ]),
  ],
  exports: [JobModule],
})
export class MonitorModule {}

