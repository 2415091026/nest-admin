import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sys_forum_category', {
  comment: '论坛板块分类表',
})
export class ForumCategoryEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '分类ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'category_id', comment: '分类ID' })
  public categoryId: number;

  @ApiProperty({ type: String, description: '分类名称' })
  @Column({ type: 'varchar', name: 'name', length: 100, comment: '分类名称' })
  public name: string;

  @ApiProperty({ type: Number, description: '显示顺序' })
  @Column({ type: 'int', name: 'sort', default: 0, comment: '显示顺序' })
  public sort: number;
}
