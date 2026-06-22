import { Module, Global } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DeptModule } from './dept/dept.module';
import { SysConfigModule } from './config/config.module';
import { DictModule } from './dict/dict.module';
import { MenuModule } from './menu/menu.module';
import { NoticeModule } from './notice/notice.module';
import { PostModule } from './post/post.module';
import { RoleModule } from './role/role.module';
import { ToolModule } from './tool/tool.module';
import { UserModule } from './user/user.module';
import { MessageModule } from './message/message.module';

@Global()
@Module({
  imports: [
    AuthModule,
    SysConfigModule, // 系统配置
    DeptModule,
    DictModule,
    MenuModule,
    NoticeModule,
    PostModule,
    RoleModule,
    ToolModule,
    UserModule,
    MessageModule,
    RouterModule.register([
      {
        path: 'admin',
        children: [
          SysConfigModule,
          DeptModule,
          DictModule,
          MenuModule,
          NoticeModule,
          PostModule,
          RoleModule,
          ToolModule,
          UserModule,
          MessageModule,
        ],
      },
    ]),
  ],
})
export class SystemModule {}


