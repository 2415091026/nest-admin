import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { ForumCategoryEntity } from './entities/forum-category.entity';
import { ForumPostEntity } from './entities/forum-post.entity';
import { ForumCommentEntity } from './entities/forum-comment.entity';
import { ForumPostLikeEntity } from './entities/forum-post-like.entity';
import { ForumPostCollectEntity } from './entities/forum-post-collect.entity';
import { ForumCommentLikeEntity } from './entities/forum-comment-like.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoryDto,
  CreatePostDto,
  UpdatePostDto,
  ListPostDto,
  CreateCommentDto,
} from './dto/forum.dto';
import dayjs from 'dayjs';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumCategoryEntity)
    private readonly categoryRepo: Repository<ForumCategoryEntity>,
    @InjectRepository(ForumPostEntity)
    private readonly postRepo: Repository<ForumPostEntity>,
    @InjectRepository(ForumCommentEntity)
    private readonly commentRepo: Repository<ForumCommentEntity>,
    @InjectRepository(ForumPostLikeEntity)
    private readonly postLikeRepo: Repository<ForumPostLikeEntity>,
    @InjectRepository(ForumPostCollectEntity)
    private readonly postCollectRepo: Repository<ForumPostCollectEntity>,
    @InjectRepository(ForumCommentLikeEntity)
    private readonly commentLikeRepo: Repository<ForumCommentLikeEntity>,
  ) {}

  // ==================== 论坛看版数据统计 ====================

  /**
   * 统计论坛今日发帖数与热帖 Top 5 (按阅读量降序)
   */
  async getForumStats() {
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    // 1. 今日发帖量统计
    const todayPostCount = await this.postRepo.count({
      where: {
        delFlag: '0',
        createTime: Between(todayStart, todayEnd),
      },
    });

    // 2. 热帖 Top 5 列表 (关联用户，自动带出发帖人账号昵称，排除密码敏感信息)
    const hotPosts = await this.postRepo.find({
      where: { delFlag: '0' },
      relations: ['user'],
      order: { viewCount: 'DESC', createTime: 'DESC' },
      take: 5,
    });

    hotPosts.forEach((post) => {
      if (post.user) {
        delete post.user.password;
      }
    });

    return ResultData.ok({
      todayPostCount,
      hotPosts,
    });
  }

  // ==================== 板块分类管理 (Category) ====================

  async createCategory(dto: CreateCategoryDto, username: string) {
    const category = this.categoryRepo.create({
      ...dto,
      createBy: username,
      updateBy: username,
    });
    await this.categoryRepo.save(category);
    return ResultData.ok();
  }

  async findAllCategories(query: ListCategoryDto) {
    const qb = this.categoryRepo.createQueryBuilder('category');
    qb.where('category.delFlag = :delFlag', { delFlag: '0' });

    if (query.name) {
      qb.andWhere('category.name LIKE :name', { name: `%${query.name}%` });
    }
    if (query.status) {
      qb.andWhere('category.status = :status', { status: query.status });
    }

    qb.orderBy('category.sort', 'ASC').addOrderBy('category.createTime', 'DESC');

    if (query.pageSize && query.pageNum) {
      qb.skip(query.pageSize * (query.pageNum - 1)).take(query.pageSize);
    }

    const [list, total] = await qb.getManyAndCount();
    return ResultData.ok({ list, total });
  }

  async updateCategory(dto: UpdateCategoryDto, username: string) {
    const res = await this.categoryRepo.update(
      { categoryId: dto.categoryId },
      {
        ...dto,
        updateBy: username,
      },
    );
    return ResultData.ok(res);
  }

  async removeCategory(ids: number[]) {
    // 逻辑软删除
    const res = await this.categoryRepo.update(
      { categoryId: In(ids) },
      { delFlag: '1' },
    );
    return ResultData.ok(res);
  }

  // ==================== 帖子管理 (Post) ====================

  async createPost(dto: CreatePostDto, userId: number, username: string) {
    const post = this.postRepo.create({
      ...dto,
      userId,
      createBy: username,
      updateBy: username,
    });
    await this.postRepo.save(post);
    return ResultData.ok();
  }

  async findAllPosts(query: ListPostDto) {
    const qb = this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.delFlag = :delFlag', { delFlag: '0' });

    if (query.categoryId) {
      qb.andWhere('post.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.title) {
      qb.andWhere('post.title LIKE :title', { title: `%${query.title}%` });
    }
    if (query.isTop) {
      qb.andWhere('post.isTop = :isTop', { isTop: query.isTop });
    }
    if (query.isEssence) {
      qb.andWhere('post.isEssence = :isEssence', { isEssence: query.isEssence });
    }
    if (query.status) {
      qb.andWhere('post.status = :status', { status: query.status });
    }

    // 默认置顶帖子展示在最前面，其次按创建时间降序
    qb.orderBy('post.isTop', 'DESC')
      .addOrderBy('post.createTime', 'DESC');

    if (query.pageSize && query.pageNum) {
      qb.skip(query.pageSize * (query.pageNum - 1)).take(query.pageSize);
    }

    const [list, total] = await qb.getManyAndCount();

    list.forEach((post) => {
      if (post.user) {
        delete post.user.password;
      }
    });

    return ResultData.ok({ list, total });
  }

  /**
   * 查看帖子详情：递增浏览量，并带出发布人信息
   */
  async findOnePost(postId: number, currentUserId?: number) {
    // 递增浏览数（非阻塞）
    this.postRepo.increment({ postId }, 'viewCount', 1).catch(() => {});

    const post = await this.postRepo.findOne({
      where: { postId, delFlag: '0' },
      relations: ['user'],
    });

    if (post && post.user) {
      delete post.user.password;
    }

    let isLiked = false;
    let isCollected = false;

    if (post && currentUserId) {
      const likeRecord = await this.postLikeRepo.findOne({ where: { postId, userId: currentUserId } });
      const collectRecord = await this.postCollectRepo.findOne({ where: { postId, userId: currentUserId } });
      isLiked = !!likeRecord;
      isCollected = !!collectRecord;
    }

    const data = post ? { ...post, isLiked, isCollected } : null;
    return ResultData.ok(data);
  }

  async updatePost(dto: UpdatePostDto, username: string) {
    const res = await this.postRepo.update(
      { postId: dto.postId },
      {
        ...dto,
        updateBy: username,
      },
    );
    return ResultData.ok(res);
  }

  async removePosts(ids: number[]) {
    // 逻辑软删除
    const res = await this.postRepo.update(
      { postId: In(ids) },
      { delFlag: '1' },
    );
    return ResultData.ok(res);
  }

  // ==================== 回帖评论管理 (Comment) ====================

  async createComment(dto: CreateCommentDto, userId: number, username: string) {
    const comment = this.commentRepo.create({
      ...dto,
      userId,
      createBy: username,
      updateBy: username,
    });
    await this.commentRepo.save(comment);
    return ResultData.ok();
  }

  /**
   * 获取某篇帖子底下的评论盖楼树形结构（级联获取被回复者与点赞信息）
   */
  async findCommentsByPostId(postId: number, currentUserId?: number) {
    const comments = await this.commentRepo.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.parent', 'parent')
      .leftJoinAndSelect('parent.user', 'parentUser')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.delFlag = :delFlag', { delFlag: '0' })
      .orderBy('comment.createTime', 'ASC')
      .getMany();

    // 过滤密码等敏感数据
    comments.forEach((c) => {
      if (c.user) {
        delete c.user.password;
      }
      if (c.parent && c.parent.user) {
        delete c.parent.user.password;
      }
    });

    // 查询当前登录人点赞过的所有评论ID
    let likedCommentIds: number[] = [];
    if (currentUserId && comments.length > 0) {
      const commentIds = comments.map((c) => c.commentId);
      const likes = await this.commentLikeRepo.find({
        where: {
          userId: currentUserId,
          commentId: In(commentIds),
        },
        select: ['commentId'],
      });
      likedCommentIds = likes.map((l) => l.commentId);
    }

    const commentMap = new Map<number, any>();
    const tree: any[] = [];

    // 初始化并映射扁平结构，加上被回复人关联信息（如抖音回复某人的样式）
    comments.forEach((c) => {
      commentMap.set(c.commentId, {
        commentId: c.commentId,
        postId: c.postId,
        parentId: c.parentId,
        content: c.content,
        userId: c.userId,
        createTime: c.createTime,
        user: c.user,
        likeCount: c.likeCount,
        isLiked: likedCommentIds.includes(c.commentId), // 动态判断
        replyToUserId: c.parent?.userId || null,
        replyToNickName: c.parent?.user?.nickName || null,
        children: [],
      });
    });

    // 树状化盖楼
    comments.forEach((c) => {
      const mapped = commentMap.get(c.commentId);
      if (c.parentId) {
        const parentMapped = commentMap.get(c.parentId);
        if (parentMapped) {
          parentMapped.children.push(mapped);
        } else {
          // 兜底（如果父评论被清理，作为主贴下的顶层评论显示）
          tree.push(mapped);
        }
      } else {
        tree.push(mapped);
      }
    });

    return ResultData.ok(tree);
  }

  async removeComment(commentId: number) {
    // 逻辑软删除该条回复
    const res = await this.commentRepo.update(
      { commentId },
      { delFlag: '1' },
    );
    return ResultData.ok(res);
  }

  // ==================== 点赞与收藏业务逻辑 (Like & Collect) ====================

  /**
   * 帖子点赞/取消点赞 Toggle
   */
  async togglePostLike(postId: number, userId: number) {
    const exist = await this.postLikeRepo.findOne({ where: { postId, userId } });
    if (exist) {
      await this.postLikeRepo.delete({ id: exist.id });
      await this.postRepo.decrement({ postId }, 'likeCount', 1);
      return ResultData.ok({ isLiked: false });
    } else {
      const newLike = this.postLikeRepo.create({ postId, userId });
      await this.postLikeRepo.save(newLike);
      await this.postRepo.increment({ postId }, 'likeCount', 1);
      return ResultData.ok({ isLiked: true });
    }
  }

  /**
   * 帖子收藏/取消收藏 Toggle
   */
  async togglePostCollect(postId: number, userId: number) {
    const exist = await this.postCollectRepo.findOne({ where: { postId, userId } });
    if (exist) {
      await this.postCollectRepo.delete({ id: exist.id });
      await this.postRepo.decrement({ postId }, 'collectCount', 1);
      return ResultData.ok({ isCollected: false });
    } else {
      const newCollect = this.postCollectRepo.create({ postId, userId });
      await this.postCollectRepo.save(newCollect);
      await this.postRepo.increment({ postId }, 'collectCount', 1);
      return ResultData.ok({ isCollected: true });
    }
  }

  /**
   * 评论点赞/取消评论点赞 Toggle
   */
  async toggleCommentLike(commentId: number, userId: number) {
    const exist = await this.commentLikeRepo.findOne({ where: { commentId, userId } });
    if (exist) {
      await this.commentLikeRepo.delete({ id: exist.id });
      await this.commentRepo.decrement({ commentId }, 'likeCount', 1);
      return ResultData.ok({ isLiked: false });
    } else {
      const newLike = this.commentLikeRepo.create({ commentId, userId });
      await this.commentLikeRepo.save(newLike);
      await this.commentRepo.increment({ commentId }, 'likeCount', 1);
      return ResultData.ok({ isLiked: true });
    }
  }
}
