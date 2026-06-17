import { Controller, Post, Body, HttpCode, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, AppLoginDto } from '../main/dto/index';
import { UserService } from '../system/user/user.service';
import { ClientInfo, ClientInfoDto } from 'src/common/decorators/common.decorator';
import { ResultData } from 'src/common/utils/result';
import { User, UserDto } from 'src/module/system/user/user.decorator';

@ApiTags('APP端接口')
@ApiBearerAuth('Authorization')
@Controller('/')
export class AppApiController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @ApiOperation({
    summary: 'APP用户登录',
  })
  @ApiBody({
    type: AppLoginDto,
    required: true,
  })
  @Post('/login')
  @HttpCode(200)
  login(@Body() user: AppLoginDto, @ClientInfo() clientInfo: ClientInfoDto) {
    // 调用UserService中免验证码的appLogin方法
    return this.userService.appLogin(user, clientInfo);
  }

  @ApiOperation({
    summary: '获取当前登录用户个人信息',
  })
  @Get('/getInfo')
  async getInfo(@User() user: UserDto) {
    return ResultData.ok({
      permissions: user.permissions,
      roles: user.roles,
      user: user.user,
    });
  }
}

