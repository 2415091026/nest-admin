import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { MainService } from './main.service';
import { RegisterDto, LoginDto } from './dto/index';
import { createMath } from 'src/common/utils/captcha';
import { ResultData } from 'src/common/utils/result';
import { GenerateUUID } from 'src/common/utils/index';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CacheEnum } from 'src/common/enum/index';
import { ConfigService } from 'src/module/system/config/config.service';
import { ClientInfo, ClientInfoDto } from 'src/common/decorators/common.decorator';
import { NotRequireAuth, User, UserDto } from 'src/module/system/user/user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { LOGIN_TOKEN_EXPIRESIN } from 'src/common/constant/index';

@ApiTags('根目录')
@Controller('/')
@ApiBearerAuth('Authorization')
export class MainController {
  constructor(
    private readonly mainService: MainService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) { }
  @ApiOperation({
    summary: '用户登录',
  })
  @ApiBody({
    type: LoginDto,
    required: true,
  })
  @Post('/login')
  @HttpCode(200)
  login(@Body() user: LoginDto, @ClientInfo() clientInfo: ClientInfoDto) {
    return this.mainService.login(user, clientInfo);
  }

  @ApiOperation({
    summary: '退出登录',
  })
  @ApiBody({
    type: LoginDto,
    required: true,
  })
  @NotRequireAuth()
  @Post('/logout')
  @HttpCode(200)
  async logout(@User() user: UserDto, @ClientInfo() clientInfo: ClientInfoDto) {
    if (user?.token) {
      await this.redisService.del(`${CacheEnum.LOGIN_TOKEN_KEY}${user.token}`);
    }
    return this.mainService.logout(clientInfo);
  }

  @ApiOperation({
    summary: '用户注册',
  })
  @ApiBody({
    type: RegisterDto,
    required: true,
  })
  @Post('/register')
  @HttpCode(200)
  register(@Body() user: RegisterDto) {
    return this.mainService.register(user);
  }

  @ApiOperation({
    summary: '账号自助-是否开启用户注册功能',
  })
  @Get('/registerUser')
  async registerUser() {
    //是否开启验证码
    const res = await this.configService.getConfigValue('sys.account.registerUser');
    const enable = res === 'true';
    return ResultData.ok(enable, '操作成功');
  }

  @ApiOperation({
    summary: '获取验证图片',
  })
  @Get('/captchaImage')
  async captchaImage() {
    //是否开启验证码
    const enable = await this.configService.getConfigValue('sys.account.captchaEnabled');
    const captchaEnabled: boolean = enable === 'true';
    const data = {
      captchaEnabled,
      img: '',
      uuid: '',
    };
    try {
      if (captchaEnabled) {
        const captchaInfo = createMath();
        data.img = captchaInfo.data;
        data.uuid = GenerateUUID();
        await this.redisService.set(CacheEnum.CAPTCHA_CODE_KEY + data.uuid, captchaInfo.text.toLowerCase(), 1000 * 60 * 5);
      }
      return ResultData.ok(data, '操作成功');
    } catch (err) {
      return ResultData.fail(500, '生成验证码错误，请重试');
    }
  }

  @ApiOperation({
    summary: '用户信息',
  })
  @Get('/getInfo')
  async getInfo(@User() user: UserDto) {
    if (user && user.userId) {
      // 实时从数据库拉取该用户的最新状态
      const latestUser = await this.userRepo.findOne({
        where: { userId: user.userId, delFlag: '0' }
      });
      if (latestUser) {
        // 合并保留扩展属性，防止覆盖丢失
        const updatedUser = {
          ...user.user,
          ...latestUser
        };
        // 同步更新 Redis 中的会话缓存，以防后续接口读取过期副本
        await this.redisService.set(
          `${CacheEnum.LOGIN_TOKEN_KEY}${user.token}`,
          {
            ...user,
            user: updatedUser
          },
          LOGIN_TOKEN_EXPIRESIN
        );
        user.user = updatedUser;
      }
    }

    return {
      msg: '操作成功',
      code: 200,
      permissions: user.permissions,
      roles: user.roles,
      user: user.user,
    };
  }

  @ApiOperation({
    summary: '路由信息',
  })
  @Get('/getRouters')
  getRouters(@User() user: UserDto) {
    const userId = user.user.userId.toString();
    return this.mainService.getRouters(+userId);
  }
}
