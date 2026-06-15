import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { ExportTable } from 'src/common/utils/export';
import { MusicSongEntity } from './entities/music-song.entity';
import { Response } from 'express';
import { CreateSongDto, UpdateSongDto, ListSongDto } from './dto/index';

@Injectable()
export class SongService {
  constructor(
    @InjectRepository(MusicSongEntity)
    private readonly songRepo: Repository<MusicSongEntity>,
  ) {}

  async create(createSongDto: CreateSongDto) {
    const song = this.songRepo.create(createSongDto);
    await this.songRepo.save(song);
    return ResultData.ok();
  }

  async findAll(query: ListSongDto) {
    const qb = this.songRepo.createQueryBuilder('entity');
    qb.where('entity.delFlag = :delFlag', { delFlag: '0' });

    if (query.name) {
      qb.andWhere('entity.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.albumName) {
      qb.andWhere('entity.albumName LIKE :albumName', { albumName: `%${query.albumName}%` });
    }
    
    if (query.albumId) {
      qb.andWhere('entity.albumId = :albumId', { albumId: query.albumId });
    }

    if (query.status) {
      qb.andWhere('entity.status = :status', { status: query.status });
    }

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

  async findOne(songId: number) {
    const res = await this.songRepo.findOne({
      where: {
        songId: songId,
        delFlag: '0',
      },
    });
    return ResultData.ok(res);
  }

  async update(updateSongDto: UpdateSongDto) {
    const res = await this.songRepo.update({ songId: updateSongDto.songId }, updateSongDto);
    return ResultData.ok(res);
  }

  async remove(songIds: string[]) {
    const data = await this.songRepo.update(
      { songId: In(songIds) },
      {
        delFlag: '1',
      },
    );
    return ResultData.ok(data);
  }

  async export(res: Response, body: ListSongDto) {
    delete body.pageNum;
    delete body.pageSize;
    const result = await this.findAll(body);
    const options = {
      sheetName: '歌曲数据',
      data: result.data.list,
      header: [
        { title: '歌曲ID', dataIndex: 'songId' },
        { title: '歌曲名称', dataIndex: 'name' },
        { title: '关联专辑ID', dataIndex: 'albumId' },
        { title: '专辑名称', dataIndex: 'albumName' },
        { title: '网易云歌曲ID', dataIndex: 'neteaseSongId' },
        { title: '音频类型', dataIndex: 'audioType' },
        { title: '状态', dataIndex: 'status' },
      ],
    };
    ExportTable(options, res);
  }
}
