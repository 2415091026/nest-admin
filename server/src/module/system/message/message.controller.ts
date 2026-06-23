import { Controller, Get, Body, Put, Query, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { ListMessageDto, ReadMessageDto, CreateMessageDto } from './dto/message.dto';
import { User, UserDto } from 'src/module/system/user/user.decorator';
import { RequirePermission } from 'src/common/decorators/require-premission.decorator';

@ApiTags('消息中心')
@Controller('system/message')
@ApiBearerAuth('Authorization')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @ApiOperation({
    summary: '获取当前用户的消息列表',
  })
  @Get('list')
  public findAll(@Query() query: ListMessageDto, @User() user: UserDto) {
    return this.messageService.findAllMessages(query, user.user.userId);
  }

  @ApiOperation({
    summary: '批量标记系统消息为已读状态',
  })
  @ApiBody({ type: ReadMessageDto })
  @Put('read')
  public markAsRead(@Body() dto: ReadMessageDto, @User() user: UserDto) {
    return this.messageService.markAsRead(dto.messageIds, user.user.userId);
  }

  @ApiOperation({
    summary: '获取当前登录用户的全部未读消息总数',
  })
  @Get('unread/count')
  public getUnreadCount(@User() user: UserDto) {
    return this.messageService.getUnreadCount(user.user.userId);
  }

  @ApiOperation({
    summary: '发布全员系统消息',
  })
  @ApiBody({ type: CreateMessageDto })
  @Post('create')
  @RequirePermission('system:message:add')
  public createMessage(@Body() dto: CreateMessageDto, @User() user: UserDto) {
    dto.receiverType = '0'; // 强制群发广播
    dto.senderId = user.user.userId;
    return this.messageService.createMessage(dto);
  }
}
