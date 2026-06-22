import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumCategoryEntity } from './entities/forum-category.entity';
import { ForumPostEntity } from './entities/forum-post.entity';
import { ForumCommentEntity } from './entities/forum-comment.entity';
import { ForumPostLikeEntity } from './entities/forum-post-like.entity';
import { ForumPostCollectEntity } from './entities/forum-post-collect.entity';
import { ForumCommentLikeEntity } from './entities/forum-comment-like.entity';
import { ForumPostReportEntity } from './entities/forum-post-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumCategoryEntity,
      ForumPostEntity,
      ForumCommentEntity,
      ForumPostLikeEntity,
      ForumPostCollectEntity,
      ForumCommentLikeEntity,
      ForumPostReportEntity,
    ]),
  ],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
