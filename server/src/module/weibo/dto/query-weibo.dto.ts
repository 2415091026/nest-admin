import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from 'src/common/dto/index';

export class QueryWeiboDto extends PagingDto {
  @ApiProperty({ required: false, description: '微博正文搜索关键字' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false, description: '微博用户id' })
  @IsOptional()
  @IsString()
  userId?: string;
}
