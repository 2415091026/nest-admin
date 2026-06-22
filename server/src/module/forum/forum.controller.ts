import { Controller, Get, Post, Body, Put, Param, Delete, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoryDto,
  CreatePostDto,
  UpdatePostDto,
  ListPostDto,
  CreateCommentDto,
} from './dto/forum.dto';
import { RequirePermission } from 'src/common/decorators/require-premission.decorator';
import { User, UserDto } from 'src/module/system/user/user.decorator';

@ApiTags('论坛管理')
@ApiBearerAuth('Authorization')
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  // ==================== 看板数据统计 ====================

  @ApiOperation({ summary: '今日论坛发帖数与热帖 Top 5 看板' })
  @RequirePermission('forum:stats:query')
  @Get('/stats')
  @HttpCode(200)
  getStats() {
    return this.forumService.getForumStats();
  }

  // ==================== 板块分类管理 (Category) ====================

  @ApiOperation({ summary: '板块分类-创建' })
  @ApiBody({ type: CreateCategoryDto })
  @RequirePermission('forum:category:add')
  @Post('/category')
  createCategory(@Body() dto: CreateCategoryDto, @User() user: UserDto) {
    return this.forumService.createCategory(dto, user.user.userName);
  }

  @ApiOperation({ summary: '板块分类-列表' })
  @RequirePermission('forum:category:list')
  @Get('/category/list')
  findAllCategories(@Query() query: ListCategoryDto) {
    return this.forumService.findAllCategories(query);
  }

  @ApiOperation({ summary: '板块分类-更新' })
  @ApiBody({ type: UpdateCategoryDto })
  @RequirePermission('forum:category:edit')
  @Put('/category')
  updateCategory(@Body() dto: UpdateCategoryDto, @User() user: UserDto) {
    return this.forumService.updateCategory(dto, user.user.userName);
  }

  @ApiOperation({ summary: '板块分类-删除' })
  @RequirePermission('forum:category:remove')
  @Delete('/category/:ids')
  removeCategory(@Param('ids') ids: string) {
    const categoryIds = ids.split(',').map((id) => +id);
    return this.forumService.removeCategory(categoryIds);
  }

  // ==================== 帖子管理 (Post) ====================

  @ApiOperation({ summary: '帖子管理-创建' })
  @ApiBody({ type: CreatePostDto })
  @RequirePermission('forum:post:add')
  @Post('/post')
  createPost(@Body() dto: CreatePostDto, @User() user: UserDto) {
    return this.forumService.createPost(dto, user.user.userId, user.user.userName);
  }

  @ApiOperation({ summary: '帖子管理-列表' })
  @RequirePermission('forum:post:list')
  @Get('/post/list')
  findAllPosts(@Query() query: ListPostDto) {
    return this.forumService.findAllPosts(query);
  }

  @ApiOperation({ summary: '帖子管理-详情 (会自动累加阅读量)' })
  @RequirePermission('forum:post:query')
  @Get('/post/:id')
  findOnePost(@Param('id') id: string, @User() user: UserDto) {
    return this.forumService.findOnePost(+id, user?.user?.userId);
  }

  @ApiOperation({ summary: '帖子管理-更新' })
  @ApiBody({ type: UpdatePostDto })
  @RequirePermission('forum:post:edit')
  @Put('/post')
  updatePost(@Body() dto: UpdatePostDto, @User() user: UserDto) {
    return this.forumService.updatePost(dto, user.user.userName);
  }

  @ApiOperation({ summary: '帖子管理-删除' })
  @RequirePermission('forum:post:remove')
  @Delete('/post/:ids')
  removePosts(@Param('ids') ids: string) {
    const postIds = ids.split(',').map((id) => +id);
    return this.forumService.removePosts(postIds);
  }

  // ==================== 回帖评论管理 (Comment) ====================

  @ApiOperation({ summary: '回帖管理-发布评论' })
  @ApiBody({ type: CreateCommentDto })
  @RequirePermission('forum:comment:add')
  @Post('/comment')
  createComment(@Body() dto: CreateCommentDto, @User() user: UserDto) {
    return this.forumService.createComment(dto, user.user.userId, user.user.userName);
  }

  @ApiOperation({ summary: '回帖管理-获取某帖子的嵌套评论盖楼树' })
  @RequirePermission('forum:comment:list')
  @Get('/comment/list/:postId')
  findCommentsByPostId(@Param('postId') postId: string, @User() user: UserDto) {
    return this.forumService.findCommentsByPostId(+postId, user?.user?.userId);
  }

  @ApiOperation({ summary: '回帖管理-删除评论' })
  @RequirePermission('forum:comment:remove')
  @Delete('/comment/:id')
  removeComment(@Param('id') id: string) {
    return this.forumService.removeComment(+id);
  }

  // ==================== 帖子与评论的社交互动管理 (Like & Collect) ====================

  @ApiOperation({ summary: '帖子点赞 (Toggle)' })
  @RequirePermission('forum:post:like')
  @Post('/post/like/:id')
  @HttpCode(200)
  togglePostLike(@Param('id') id: string, @User() user: UserDto) {
    return this.forumService.togglePostLike(+id, user.user.userId);
  }

  @ApiOperation({ summary: '帖子收藏 (Toggle)' })
  @RequirePermission('forum:post:collect')
  @Post('/post/collect/:id')
  @HttpCode(200)
  togglePostCollect(@Param('id') id: string, @User() user: UserDto) {
    return this.forumService.togglePostCollect(+id, user.user.userId);
  }

  @ApiOperation({ summary: '评论点赞 (Toggle)' })
  @RequirePermission('forum:comment:like')
  @Post('/comment/like/:id')
  @HttpCode(200)
  toggleCommentLike(@Param('id') id: string, @User() user: UserDto) {
    return this.forumService.toggleCommentLike(+id, user.user.userId);
  }
}
