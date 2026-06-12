import { Controller, Get, Post, Body, Put, Param, Delete, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AlbumService } from './album.service';
import { CreateAlbumDto, UpdateAlbumDto, ListAlbumDto } from './dto/index';
import { RequirePermission } from 'src/common/decorators/require-premission.decorator';
import { Response } from 'express';

@ApiTags('专辑管理')
@Controller('music/album')
// @ApiBearerAuth('Authorization')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @ApiOperation({
    summary: '专辑管理-创建',
  })
  @ApiBody({
    type: CreateAlbumDto,
    required: true,
  })
  @RequirePermission('music:album:add')
  @Post('/')
  create(@Body() createAlbumDto: CreateAlbumDto) {
    return this.albumService.create(createAlbumDto);
  }

  @ApiOperation({
    summary: '专辑管理-列表',
  })
  @RequirePermission('music:album:list')
  @Get('/list')
  findAll(@Query() query: ListAlbumDto) {
    return this.albumService.findAll(query);
  }

  @ApiOperation({
    summary: '专辑管理-详情',
  })
  @RequirePermission('music:album:query')
  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.albumService.findOne(+id);
  }

  @ApiOperation({
    summary: '专辑管理-更新',
  })
  @ApiBody({
    type: UpdateAlbumDto,
    required: true,
  })
  @RequirePermission('music:album:edit')
  @Put('/')
  update(@Body() updateAlbumDto: UpdateAlbumDto) {
    return this.albumService.update(updateAlbumDto);
  }

  @ApiOperation({
    summary: '专辑管理-删除',
  })
  @RequirePermission('music:album:remove')
  @Delete('/:ids')
  remove(@Param('ids') ids: string) {
    const albumIds = ids.split(',').map((id) => id);
    return this.albumService.remove(albumIds);
  }

  @ApiOperation({ summary: '导出专辑管理 xlsx 文件' })
  @RequirePermission('music:album:export')
  @Post('/export')
  async export(@Res() res: Response, @Body() body: ListAlbumDto): Promise<void> {
    return this.albumService.export(res, body);
  }

  @ApiOperation({
    summary: '根据网易云专辑ID查询下属歌曲',
  })
  @RequirePermission('music:album:query')
  @Get('/songs/:neteaseAlbumId')
  findSongsByNeteaseAlbumId(@Param('neteaseAlbumId') neteaseAlbumId: string) {
    return this.albumService.findSongsByNeteaseAlbumId(neteaseAlbumId);
  }
}
