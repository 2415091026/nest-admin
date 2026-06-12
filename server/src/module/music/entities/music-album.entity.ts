import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';
import { ApiProperty } from '@nestjs/swagger';

@Entity('music_album', {
  comment: '音乐专辑表',
})
export class MusicAlbumEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '专辑自增主键' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'album_id', comment: '专辑ID' })
  public albumId: number;

  @ApiProperty({ type: String, description: '专辑名称' })
  @Column({ type: 'varchar', name: 'name', length: 128, nullable: false, comment: '专辑名称' })
  public name: string;

  @ApiProperty({ type: [String], description: '专辑别名' })
  @Column({ type: 'json', name: 'alias', nullable: true, comment: '专辑别名' })
  public alias: string[];

  @ApiProperty({ type: String, description: '网易云音乐专辑唯一ID' })
  @Column({ type: 'varchar', name: 'netease_album_id', length: 64, default: null, comment: '关联第三方网易云专辑ID' })
  public neteaseAlbumId: string;

  @ApiProperty({ type: String, description: '关联的歌手ID' })
  @Column({ type: 'varchar', name: 'artist_id', length: 32, nullable: false, comment: '歌手ID' })
  public artistId: string;

  @ApiProperty({ type: String, description: '歌手名称' })
  @Column({ type: 'varchar', name: 'artist_name', length: 128, nullable: false, comment: '歌手名称' })
  public artistName: string;

  @ApiProperty({ type: String, description: '专辑封面图片URL' })
  @Column({ type: 'varchar', name: 'pic_url', length: 512, nullable: true, comment: '专辑封面图片URL' })
  public picUrl: string;

  @ApiProperty({ type: String, description: '模糊封面图片URL' })
  @Column({ type: 'varchar', name: 'blur_pic_url', length: 512, nullable: true, comment: '模糊封面图片URL' })
  public blurPicUrl: string;

  @ApiProperty({ type: String, description: '发行公司' })
  @Column({ type: 'varchar', name: 'company', length: 128, nullable: true, comment: '发行公司' })
  public company: string;

  @ApiProperty({ type: String, description: '发行日期' })
  @Column({ type: 'date', name: 'publish_time', default: null, comment: '发行日期' })
  public publishTime: Date;

  @ApiProperty({ type: String, description: '专辑类型（如：专辑、EP、Single）' })
  @Column({ type: 'varchar', name: 'type', length: 64, nullable: true, comment: '专辑类型' })
  public type: string;

  @ApiProperty({ type: String, description: '专辑子类型（如：录音室版、现场版）' })
  @Column({ type: 'varchar', name: 'sub_type', length: 64, nullable: true, comment: '专辑子类型' })
  public subType: string;

  @ApiProperty({ type: Number, description: '包含歌曲数量' })
  @Column({ type: 'int', name: 'size', default: 0, comment: '专辑包含歌曲数量' })
  public size: number;

  @ApiProperty({ type: String, description: '详细介绍' })
  @Column({ type: 'text', name: 'description', nullable: true, comment: '详细介绍' })
  public description: string;

  @ApiProperty({ type: String, description: '简短描述' })
  @Column({ type: 'varchar', name: 'brief_desc', length: 512, nullable: true, comment: '简短描述' })
  public briefDesc: string;
}
