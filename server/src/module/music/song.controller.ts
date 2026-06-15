import { Controller, Get, Post, Body, Put, Param, Delete, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { SongService } from './song.service';
import { CreateSongDto, UpdateSongDto, ListSongDto } from './dto/index';
import { RequirePermission } from 'src/common/decorators/require-premission.decorator';
import { Response } from 'express';

@ApiTags('歌曲管理')
@Controller('music/song')
export class SongController {
  constructor(private readonly songService: SongService) {}

  @ApiOperation({ summary: '歌曲管理-创建' })
  @ApiBody({ type: CreateSongDto, required: true })
  @RequirePermission('music:song:add')
  @Post('/')
  create(@Body() createSongDto: CreateSongDto) {
    return this.songService.create(createSongDto);
  }

  @ApiOperation({ summary: '歌曲管理-列表' })
  @RequirePermission('music:song:list')
  @Get('/list')
  findAll(@Query() query: ListSongDto) {
    return this.songService.findAll(query);
  }

  @ApiOperation({ summary: '歌曲管理-详情' })
  @RequirePermission('music:song:query')
  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.songService.findOne(+id);
  }

  @ApiOperation({ summary: '歌曲管理-更新' })
  @ApiBody({ type: UpdateSongDto, required: true })
  @RequirePermission('music:song:edit')
  @Put('/')
  update(@Body() updateSongDto: UpdateSongDto) {
    return this.songService.update(updateSongDto);
  }

  @ApiOperation({ summary: '歌曲管理-删除' })
  @RequirePermission('music:song:remove')
  @Delete('/:ids')
  remove(@Param('ids') ids: string) {
    const songIds = ids.split(',').map((id) => id);
    return this.songService.remove(songIds);
  }

  @ApiOperation({ summary: '导出歌曲管理 xlsx 文件' })
  @RequirePermission('music:song:export')
  @Post('/export')
  async export(@Res() res: Response, @Body() body: ListSongDto): Promise<void> {
    return this.songService.export(res, body);
  }
}
