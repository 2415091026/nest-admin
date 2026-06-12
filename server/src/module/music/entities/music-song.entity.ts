import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';
import { ApiProperty } from '@nestjs/swagger';

@Entity('music_song', {
  comment: '音乐歌曲表',
})
export class MusicSongEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '歌曲自增主键' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'song_id', comment: '歌曲ID' })
  public songId: number;

  @ApiProperty({ type: String, description: '歌曲名称' })
  @Column({ type: 'varchar', name: 'name', length: 128, nullable: false, comment: '歌曲名称' })
  public name: string;

  @ApiProperty({ type: [String], description: '歌曲别名' })
  @Column({ type: 'json', name: 'alias', nullable: true, comment: '歌曲别名' })
  public alias: string[];

  @ApiProperty({ type: String, description: '关联的专辑ID' })
  @Column({ type: 'varchar', name: 'album_id', length: 32, nullable: false, comment: '关联的专辑ID' })
  public albumId: string;

  @ApiProperty({ type: String, description: '专辑名称冗余' })
  @Column({ type: 'varchar', name: 'album_name', length: 128, nullable: false, comment: '专辑名称' })
  public albumName: string;

  @ApiProperty({ type: String, description: '专辑封面URL冗余' })
  @Column({ type: 'varchar', name: 'album_cover', length: 512, nullable: true, comment: '专辑封面URL' })
  public albumCover: string;

  @ApiProperty({ type: String, description: '永久音频流直链(如OSS地址)' })
  @Column({ type: 'varchar', name: 'audio_url', length: 512, default: null, comment: '自建/永久音频流直链' })
  public audioUrl: string;

  @ApiProperty({ type: String, description: '网易云音乐歌曲唯一ID' })
  @Column({ type: 'varchar', name: 'netease_song_id', length: 64, default: null, comment: '关联第三方网易云歌曲ID' })
  public neteaseSongId: string;

  @ApiProperty({ type: String, description: 'QQ音乐歌曲唯一ID' })
  @Column({ type: 'varchar', name: 'qq_song_id', length: 64, default: null, comment: '关联第三方QQ音乐歌曲ID' })
  public qqSongId: string;

  @ApiProperty({ type: Number, description: '歌曲时长(毫秒)' })
  @Column({ type: 'int', name: 'duration_ms', default: 0, comment: '歌曲时长（单位：毫秒）' })
  public durationMs: number;

  @ApiProperty({ type: Number, description: '音频大小(字节)' })
  @Column({ type: 'bigint', name: 'audio_size', default: 0, comment: '音频文件大小(字节)' })
  public audioSize: number;

  @ApiProperty({ type: String, description: '音频格式(如mp3)' })
  @Column({ type: 'varchar', name: 'audio_type', length: 16, default: 'mp3', comment: '音频格式' })
  public audioType: string;

  @ApiProperty({ type: Number, description: '音频码率(如128000)' })
  @Column({ type: 'int', name: 'bitrate', default: 128000, comment: '音频码率' })
  public bitrate: number;

  @ApiProperty({ type: [String], description: '流派标签' })
  @Column({ type: 'json', name: 'tags', nullable: true, comment: '歌曲标签/流派' })
  public tags: string[];

  @ApiProperty({ type: String, description: '发行日期' })
  @Column({ type: 'date', name: 'release_date', default: null, comment: '发行日期' })
  public releaseDate: Date;

  @ApiProperty({ type: String, description: 'LRC歌词' })
  @Column({ type: 'text', name: 'lyrics', nullable: true, comment: 'LRC标准歌词' })
  public lyrics: string;

  @ApiProperty({ type: Boolean, description: '是否有歌词翻译' })
  @Column({ type: 'tinyint', name: 'has_translation', default: 0, comment: '是否有歌词翻译（0无 1有）' })
  public hasTranslation: number;

  @ApiProperty({ type: String, description: 'QQ音乐歌曲落地页' })
  @Column({ type: 'varchar', name: 'qq_music_page', length: 512, default: null, comment: 'QQ音乐网页链接' })
  public qqMusicPage: string;

  @ApiProperty({ type: String, description: '网易云歌曲落地页' })
  @Column({ type: 'varchar', name: 'netease_page', length: 512, default: null, comment: '网易云网页链接' })
  public neteasePage: string;

  @ApiProperty({ type: String, description: 'MV播放链接' })
  @Column({ type: 'varchar', name: 'mv_url', length: 512, default: null, comment: 'MV播放链接' })
  public mvUrl: string;

  @ApiProperty({ type: Number, description: '累计播放次数' })
  @Column({ type: 'int', name: 'play_count', default: 0, comment: '累计播放次数' })
  public playCount: number;

  @ApiProperty({ type: Number, description: '累计收藏数' })
  @Column({ type: 'int', name: 'like_count', default: 0, comment: '累计收藏数' })
  public likeCount: number;

  @ApiProperty({ type: Number, description: '累计分享数' })
  @Column({ type: 'int', name: 'share_count', default: 0, comment: '累计分享数' })
  public shareCount: number;

  @ApiProperty({ type: Number, description: '排序权重' })
  @Column({ type: 'int', name: 'sort_order', default: 0, comment: '排序权重' })
  public sortOrder: number;
}
