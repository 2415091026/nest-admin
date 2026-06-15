export * from './song.dto';
import { IsString, IsArray, IsOptional, IsNumber, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from 'src/common/dto/index';

export class CreateAlbumDto {
  @ApiProperty({ description: '专辑名称', required: true })
  @IsString()
  @Length(1, 128)
  public name: string;

  @ApiProperty({ description: '专辑别名', required: false })
  @IsOptional()
  @IsArray()
  public alias?: string[];

  @ApiProperty({ description: '网易云音乐专辑唯一ID', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  public neteaseAlbumId?: string;

  @ApiProperty({ description: '关联的歌手ID', required: true })
  @IsString()
  @Length(1, 32)
  public artistId: string;

  @ApiProperty({ description: '歌手名称', required: true })
  @IsString()
  @Length(1, 128)
  public artistName: string;

  @ApiProperty({ description: '专辑封面图片URL', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  public picUrl?: string;

  @ApiProperty({ description: '模糊封面图片URL', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  public blurPicUrl?: string;

  @ApiProperty({ description: '发行公司', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 128)
  public company?: string;

  @ApiProperty({ description: '发行日期', required: false })
  @IsOptional()
  @IsString()
  public publishTime?: string;

  @ApiProperty({ description: '专辑类型', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  public type?: string;

  @ApiProperty({ description: '专辑子类型', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  public subType?: string;

  @ApiProperty({ description: '包含歌曲数量', required: false })
  @IsOptional()
  @IsNumber()
  public size?: number;

  @ApiProperty({ description: '详细介绍', required: false })
  @IsOptional()
  @IsString()
  public description?: string;

  @ApiProperty({ description: '简短描述', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  public briefDesc?: string;

  @ApiProperty({ description: '状态（0正常 1停用）', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  public status?: string;
}

export class UpdateAlbumDto extends CreateAlbumDto {
  @ApiProperty({ description: '专辑自增主键', required: true })
  @IsNumber()
  public albumId: number;
}

export class ListAlbumDto extends PagingDto {
  @ApiProperty({ description: '专辑名称', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 128)
  public name?: string;

  @ApiProperty({ description: '歌手名称', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 128)
  public artistName?: string;

  @ApiProperty({ description: '发行公司', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 128)
  public company?: string;

  @ApiProperty({ description: '状态（0正常 1停用）', required: false })
  @IsOptional()
  @IsString()
  public status?: string;
}
