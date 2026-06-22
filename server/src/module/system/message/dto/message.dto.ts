import { IsString, IsOptional, IsNumber, IsArray, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from 'src/common/dto/index';

export class CreateMessageDto {
  @ApiProperty({ description: '消息标题', required: true })
  @IsString()
  @IsNotEmpty({ message: '消息标题不能为空' })
  @Length(1, 100)
  public title: string;

  @ApiProperty({ description: '消息正文内容', required: true })
  @IsString()
  @IsNotEmpty({ message: '消息正文不能为空' })
  public content: string;

  @ApiProperty({ description: '消息大类（1系统公告 2社交互动 3业务提醒）', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  public messageType?: string;

  @ApiProperty({ description: '细分业务类型', required: false })
  @IsOptional()
  @IsString()
  public bizType?: string;

  @ApiProperty({ description: '关联的具体业务ID', required: false })
  @IsOptional()
  @IsNumber()
  public bizId?: number;

  @ApiProperty({ description: '发送人ID（0代表系统发送）', required: false })
  @IsOptional()
  @IsNumber()
  public senderId?: number;

  @ApiProperty({ description: '接收者范围（0全体群发 1单发个人）', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  public receiverType?: string;

  @ApiProperty({ description: '接收人ID', required: false })
  @IsOptional()
  @IsNumber()
  public receiverId?: number;
}

export class ListMessageDto extends PagingDto {
  @ApiProperty({ description: '消息大类（1系统公告 2社交互动 3业务提醒）', required: false })
  @IsOptional()
  @IsString()
  public messageType?: string;

  @ApiProperty({ description: '阅读状态（0未读 1已读）', required: false })
  @IsOptional()
  @IsString()
  public readStatus?: string;
}

export class ReadMessageDto {
  @ApiProperty({ description: '消息ID列表', required: true, type: [Number] })
  @IsArray()
  @IsNotEmpty({ message: '消息ID列表不能为空' })
  public messageIds: number[];
}
