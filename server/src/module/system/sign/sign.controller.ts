import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SignService } from './sign.service';
import { User, UserDto } from 'src/module/system/user/user.decorator';

@ApiTags('用户签到管理')
@Controller('system/sign')
@ApiBearerAuth('Authorization')
export class SignController {
  constructor(private readonly signService: SignService) {}

  @ApiOperation({
    summary: '用户执行每日签到',
  })
  @Post('check-in')
  public doSign(@User() user: UserDto) {
    return this.signService.doSign(user.user.userId);
  }

  @ApiOperation({
    summary: '获取当前用户签到累积状态与历史',
  })
  @Get('status')
  public getSignStatus(@User() user: UserDto) {
    return this.signService.getSignStatus(user.user.userId);
  }
}
