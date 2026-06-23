import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}

export class uploadIdDto {
  @ApiProperty({ type: 'string' })
  @IsNotEmpty({ message: 'uploadId 不能为空' })
  @IsString()
  uploadId: string;
}

export class ChunkFileDto {
  @ApiProperty({ type: 'string' })
  @IsNotEmpty({ message: 'index 不能为空' })
  @Type(() => Number)
  @IsNumber()
  index: number;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty({ message: 'totalChunks 不能为空' })
  @Type(() => Number)
  @IsNumber()
  totalChunks: number;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty({ message: 'uploadId 不能为空' })
  @IsString()
  uploadId: string;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty({ message: 'fileName 不能为空' })
  @IsString()
  fileName: string;
}

export class ChunkMergeFileDto {
  @ApiProperty({ type: 'string' })
  @IsNotEmpty({ message: 'uploadId 不能为空' })
  @IsString()
  uploadId: string;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty({ message: 'fileName 不能为空' })
  @IsString()
  fileName: string;
}

