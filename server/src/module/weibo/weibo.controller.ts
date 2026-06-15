import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WeiboService } from './weibo.service';
import { QueryWeiboDto } from './dto/query-weibo.dto';

@ApiTags('微博管理')
@ApiBearerAuth()
@Controller('weibo')
export class WeiboController {
  constructor(private readonly weiboService: WeiboService) {}

  @ApiOperation({ summary: '获取微博列表' })
  @Get('list')
  findAll(@Query() query: QueryWeiboDto) {
    return this.weiboService.findAll(query);
  }

  @ApiOperation({ summary: '获取微博详情' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.weiboService.findOne(id);
  }
}
