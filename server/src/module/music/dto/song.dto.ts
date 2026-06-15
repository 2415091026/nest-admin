import { IsString, IsArray, IsOptional, IsNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from 'src/common/dto/index';

export class CreateSongDto {
  @ApiProperty({ description: '歌曲名称', required: true })
  @IsString()
  @Length(1, 128)
  public name: string;

  @ApiProperty({ description: '关联的专辑ID', required: true })
  @IsString()
  @Length(1, 32)
  public albumId: string;

  @ApiProperty({ description: '专辑名称', required: true })
  @IsString()
  @Length(1, 128)
  public albumName: string;

  @ApiProperty({ description: '歌曲别名', required: false })
  @IsOptional()
  @IsArray()
  public alias?: string[];

  @ApiProperty({ description: '专辑封面URL', required: false })
  @IsOptional()
  @IsString()
  public albumCover?: string;

  @ApiProperty({ description: '永久音频流直链', required: false })
  @IsOptional()
  @IsString()
  public audioUrl?: string;

  @ApiProperty({ description: '网易云音乐歌曲唯一ID', required: false })
  @IsOptional()
  @IsString()
  public neteaseSongId?: string;

  @ApiProperty({ description: 'QQ音乐歌曲唯一ID', required: false })
  @IsOptional()
  @IsString()
  public qqSongId?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsString()
  public status?: string;
}

export class UpdateSongDto extends CreateSongDto {
  @ApiProperty({ description: '歌曲自增主键', required: true })
  @IsNumber()
  public songId: number;
}

export class ListSongDto extends PagingDto {
  @ApiProperty({ description: '歌曲名称', required: false })
  @IsOptional()
  @IsString()
  public name?: string;

  @ApiProperty({ description: '专辑名称', required: false })
  @IsOptional()
  @IsString()
  public albumName?: string;

  @ApiProperty({ description: '关联的专辑ID', required: false })
  @IsOptional()
  @IsString()
  public albumId?: string;

  @ApiProperty({ description: '状态（0正常 1停用）', required: false })
  @IsOptional()
  @IsString()
  public status?: string;
}
