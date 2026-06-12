import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { ExportTable } from 'src/common/utils/export';
import { MusicAlbumEntity } from './entities/music-album.entity';
import { MusicSongEntity } from './entities/music-song.entity';
import { Response } from 'express';
import { CreateAlbumDto, UpdateAlbumDto, ListAlbumDto } from './dto/index';

@Injectable()
export class AlbumService {
  constructor(
    @InjectRepository(MusicAlbumEntity)
    private readonly albumRepo: Repository<MusicAlbumEntity>,
    @InjectRepository(MusicSongEntity)
    private readonly songRepo: Repository<MusicSongEntity>,
  ) {}

  /**
   * 创建专辑
   * @param createAlbumDto 创建DTO
   */
  async create(createAlbumDto: CreateAlbumDto) {
    const album = this.albumRepo.create(createAlbumDto);
    await this.albumRepo.save(album);
    return ResultData.ok();
  }

  /**
   * 分页查询专辑列表
   * @param query 查询及分页参数
   */
  async findAll(query: ListAlbumDto) {
    const qb = this.albumRepo.createQueryBuilder('entity');
    qb.where('entity.delFlag = :delFlag', { delFlag: '0' });

    if (query.name) {
      qb.andWhere('entity.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.artistName) {
      qb.andWhere('entity.artistName LIKE :artistName', { artistName: `%${query.artistName}%` });
    }

    if (query.company) {
      qb.andWhere('entity.company LIKE :company', { company: `%${query.company}%` });
    }

    if (query.status) {
      qb.andWhere('entity.status = :status', { status: query.status });
    }

    // 默认按创建时间倒序排列
    qb.orderBy('entity.createTime', 'DESC');

    if (query.pageSize && query.pageNum) {
      qb.skip(query.pageSize * (query.pageNum - 1)).take(query.pageSize);
    }

    const [list, total] = await qb.getManyAndCount();

    return ResultData.ok({
      list,
      total,
    });
  }

  /**
   * 获取专辑详情
   * @param albumId 专辑ID
   */
  async findOne(albumId: number) {
    const res = await this.albumRepo.findOne({
      where: {
        albumId: albumId,
        delFlag: '0',
      },
    });
    return ResultData.ok(res);
  }

  /**
   * 更新专辑
   * @param updateAlbumDto 更新DTO
   */
  async update(updateAlbumDto: UpdateAlbumDto) {
    const res = await this.albumRepo.update({ albumId: updateAlbumDto.albumId }, updateAlbumDto);
    return ResultData.ok(res);
  }

  /**
   * 批量逻辑删除专辑
   * @param albumIds 待删除的专辑ID数组
   */
  async remove(albumIds: string[]) {
    const data = await this.albumRepo.update(
      { albumId: In(albumIds) },
      {
        delFlag: '1',
      },
    );
    return ResultData.ok(data);
  }

  /**
   * 导出专辑管理数据为 xlsx 文件
   * @param res Express 响应流
   * @param body 查询筛选条件
   */
  async export(res: Response, body: ListAlbumDto) {
    delete body.pageNum;
    delete body.pageSize;
    const result = await this.findAll(body);
    const options = {
      sheetName: '专辑数据',
      data: result.data.list,
      header: [
        { title: '专辑自增序号', dataIndex: 'albumId' },
        { title: '专辑名称', dataIndex: 'name' },
        { title: '网易云专辑ID', dataIndex: 'neteaseAlbumId' },
        { title: '歌手名称', dataIndex: 'artistName' },
        { title: '发行公司', dataIndex: 'company' },
        { title: '发行日期', dataIndex: 'publishTime' },
        { title: '专辑类型', dataIndex: 'type' },
        { title: '包含歌曲数量', dataIndex: 'size' },
        { title: '状态', dataIndex: 'status' },
      ],
    };
    ExportTable(options, res);
  }

  /**
   * 通过网易云专辑 ID 获取专辑下的所有歌曲
   * @param neteaseAlbumId 网易云专辑ID
   */
  async findSongsByNeteaseAlbumId(neteaseAlbumId: string) {
    const list = await this.songRepo.find({
      where: {
        albumId: neteaseAlbumId,
        delFlag: '0',
      },
      order: {
        songId: 'ASC',
      },
    });
    return ResultData.ok(list);
  }
}
