import { IsString, IsOptional, IsNumber, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from 'src/common/dto/index';

// ==================== 论坛板块分类 DTO ====================

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', required: true })
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  @Length(1, 100)
  public name: string;

  @ApiProperty({ description: '显示顺序', required: false })
  @IsOptional()
  @IsNumber()
  public sort?: number;

  @ApiProperty({ description: '状态（0正常 1停用）', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  public status?: string;
}

export class UpdateCategoryDto extends CreateCategoryDto {
  @ApiProperty({ description: '分类ID', required: true })
  @IsNumber()
  @IsNotEmpty({ message: '分类ID不能为空' })
  public categoryId: number;
}

export class ListCategoryDto extends PagingDto {
  @ApiProperty({ description: '分类名称', required: false })
  @IsOptional()
  @IsString()
  public name?: string;

  @ApiProperty({ description: '状态（0正常 1停用）', required: false })
  @IsOptional()
  @IsString()
  public status?: string;
}

// ==================== 论坛帖子 DTO ====================

export class CreatePostDto {
  @ApiProperty({ description: '分类板块ID', required: true })
  @IsNumber()
  @IsNotEmpty({ message: '关联板块ID不能为空' })
  public categoryId: number;

  @ApiProperty({ description: '帖子标题', required: true })
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @Length(1, 150)
  public title: string;

  @ApiProperty({ description: '帖子正文内容', required: true })
  @IsString()
  @IsNotEmpty({ message: '正文内容不能为空' })
  public content: string;

  @ApiProperty({ description: '是否置顶（0否 1是）', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  public isTop?: string;

  @ApiProperty({ description: '是否精华（0否 1是）', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  public isEssence?: string;

  @ApiProperty({ description: '状态（0正常 1停用）', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  public status?: string;
}

export class UpdatePostDto extends CreatePostDto {
  @ApiProperty({ description: '帖子ID', required: true })
  @IsNumber()
  @IsNotEmpty({ message: '帖子ID不能为空' })
  public postId: number;
}

export class ListPostDto extends PagingDto {
  @ApiProperty({ description: '分类板块ID', required: false })
  @IsOptional()
  @IsString()
  public categoryId?: string;

  @ApiProperty({ description: '帖子标题（模糊查询）', required: false })
  @IsOptional()
  @IsString()
  public title?: string;

  @ApiProperty({ description: '是否置顶（0否 1是）', required: false })
  @IsOptional()
  @IsString()
  public isTop?: string;

  @ApiProperty({ description: '是否精华（0否 1是）', required: false })
  @IsOptional()
  @IsString()
  public isEssence?: string;

  @ApiProperty({ description: '状态（0正常 1停用）', required: false })
  @IsOptional()
  @IsString()
  public status?: string;
}

// ==================== 论坛回帖评论 DTO ====================

export class CreateCommentDto {
  @ApiProperty({ description: '关联帖子ID', required: true })
  @IsNumber()
  @IsNotEmpty({ message: '所属帖子ID不能为空' })
  public postId: number;

  @ApiProperty({ description: '父级评论ID（二级评论或回复时传）', required: false })
  @IsOptional()
  @IsNumber()
  public parentId?: number;

  @ApiProperty({ description: '评论正文内容', required: true })
  @IsString()
  @IsNotEmpty({ message: '评论正文不能为空' })
  public content: string;
}
