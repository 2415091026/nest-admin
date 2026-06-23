import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForumCategoryEntity } from './entities/forum-category.entity';
import { ForumPostEntity } from './entities/forum-post.entity';
import { ForumCommentEntity } from './entities/forum-comment.entity';
import { ForumPostLikeEntity } from './entities/forum-post-like.entity';
import { ForumPostCollectEntity } from './entities/forum-post-collect.entity';
import { ForumCommentLikeEntity } from './entities/forum-comment-like.entity';
import { ForumPostReportEntity } from './entities/forum-post-report.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoryDto,
  CreatePostDto,
  UpdatePostDto,
  ListPostDto,
  CreateCommentDto,
  CreatePostReportDto,
  ListPostReportDto,
  HandlePostReportDto,
  AppealPostDto,
  HandleAppealDto,
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
    @InjectRepository(ForumPostReportEntity)
    private readonly reportRepo: Repository<ForumPostReportEntity>,
    private readonly eventEmitter: EventEmitter2,
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
    const saved = await this.postRepo.save(post);

    // 异步派发发帖事件，用于经验值发放
    this.eventEmitter.emit('forum.post.created', {
      postId: saved.postId,
      userId,
      postTitle: saved.title,
    });

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
    if (query.userId) {
      qb.andWhere('post.userId = :userId', { userId: Number(query.userId) });
    }

    // ==== 申诉与审核状态过滤逻辑 ====
    if (query.auditStatus) {
      // 显式传参过滤（通常是管理员在后台筛选特定状态如 2: 申诉中 的贴）
      qb.andWhere('post.auditStatus = :auditStatus', { auditStatus: query.auditStatus });
    } else {
      // 未显式传参过滤时：
      // 1. 如果没有指定 userId（公开列表），则默认只展示 0: 正常上架 的帖子
      // 2. 如果指定了 userId（个人中心我的帖子），则不做过滤，让作者自己能看到所有状态的贴（以便对下架贴申诉）
      if (!query.userId) {
        qb.andWhere('post.auditStatus = :defaultAuditStatus', { defaultAuditStatus: '0' });
      }
    }

    if (query.excludeReported === '1' && !query.userId) {
      qb.andWhere((subQuery) => {
        const sub = subQuery
          .subQuery()
          .select('1')
          .from(ForumPostReportEntity, 'report')
          .where('report.postId = post.postId')
          .andWhere('report.delFlag = :reportDelFlag', { reportDelFlag: '0' })
          .getQuery();
        return `NOT EXISTS ${sub}`;
      });
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
    const saved = await this.commentRepo.save(comment);

    // 异步派发相关事件
    const post = await this.postRepo.findOne({ where: { postId: saved.postId } });
    if (post) {
      if (saved.parentId) {
        // 如果是回复别人的评论，需要获取父评论作者
        const parentComment = await this.commentRepo.findOne({
          where: { commentId: saved.parentId },
          relations: ['user'],
        });
        if (parentComment) {
          this.eventEmitter.emit('forum.comment.replied', {
            postId: saved.postId,
            commentId: saved.commentId,
            userId,
            userName: username,
            authorId: parentComment.userId,
            postTitle: post.title,
            content: saved.content,
            parentContent: parentComment.content,
          });
        }
      } else {
        // 如果是评论帖子，需要发消息给帖子作者
        this.eventEmitter.emit('forum.post.commented', {
          postId: saved.postId,
          commentId: saved.commentId,
          userId,
          userName: username,
          authorId: post.userId,
          postTitle: post.title,
          content: saved.content,
        });
      }
    }

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

  async togglePostLike(postId: number, userId: number, userName: string) {
    const exist = await this.postLikeRepo.findOne({ where: { postId, userId } });
    if (exist) {
      await this.postLikeRepo.delete({ id: exist.id });
      await this.postRepo.decrement({ postId }, 'likeCount', 1);
      return ResultData.ok({ isLiked: false });
    } else {
      const newLike = this.postLikeRepo.create({ postId, userId });
      await this.postLikeRepo.save(newLike);
      await this.postRepo.increment({ postId }, 'likeCount', 1);

      // 异步派发帖子被点赞事件，以便生成系统交互提醒消息
      const post = await this.postRepo.findOne({ where: { postId } });
      if (post) {
        this.eventEmitter.emit('forum.post.liked', {
          postId,
          userId,
          userName,
          authorId: post.userId,
          postTitle: post.title,
        });
      }

      return ResultData.ok({ isLiked: true });
    }
  }

  /**
   * 帖子收藏/取消收藏 Toggle
   */
  async togglePostCollect(postId: number, userId: number, userName: string) {
    const exist = await this.postCollectRepo.findOne({ where: { postId, userId } });
    if (exist) {
      await this.postCollectRepo.delete({ id: exist.id });
      await this.postRepo.decrement({ postId }, 'collectCount', 1);
      return ResultData.ok({ isCollected: false });
    } else {
      const newCollect = this.postCollectRepo.create({ postId, userId });
      await this.postCollectRepo.save(newCollect);
      await this.postRepo.increment({ postId }, 'collectCount', 1);

      // 异步派发帖子被收藏事件
      const post = await this.postRepo.findOne({ where: { postId } });
      if (post) {
        this.eventEmitter.emit('forum.post.collected', {
          postId,
          userId,
          userName,
          authorId: post.userId,
          postTitle: post.title,
        });
      }

      return ResultData.ok({ isCollected: true });
    }
  }

  /**
   * 评论点赞/取消评论点赞 Toggle
   */
  async toggleCommentLike(commentId: number, userId: number, userName: string) {
    const exist = await this.commentLikeRepo.findOne({ where: { commentId, userId } });
    if (exist) {
      await this.commentLikeRepo.delete({ id: exist.id });
      await this.commentRepo.decrement({ commentId }, 'likeCount', 1);
      return ResultData.ok({ isLiked: false });
    } else {
      const newLike = this.commentLikeRepo.create({ commentId, userId });
      await this.commentLikeRepo.save(newLike);
      await this.commentRepo.increment({ commentId }, 'likeCount', 1);

      // 异步派发评论被点赞事件
      const comment = await this.commentRepo.findOne({
        where: { commentId },
        relations: ['post'],
      });
      if (comment) {
        this.eventEmitter.emit('forum.comment.liked', {
          commentId,
          postId: comment.postId,
          userId,
          userName,
          authorId: comment.userId,
          commentContent: comment.content,
          postTitle: comment.post?.title || '',
        });
      }

      return ResultData.ok({ isLiked: true });
    }
  }

  // ==================== 帖子举报业务管理 (Report) ====================

  /**
   * 举报帖子
   */
  async reportPost(dto: CreatePostReportDto, userId: number, username: string) {
    const post = await this.postRepo.findOne({
      where: { postId: dto.postId, delFlag: '0' },
    });
    if (!post) {
      return ResultData.fail(400, '该帖子不存在或已被删除');
    }
    const report = this.reportRepo.create({
      ...dto,
      userId,
      createBy: username,
      updateBy: username,
    });
    await this.reportRepo.save(report);
    return ResultData.ok();
  }

  /**
   * 分页获取帖子举报列表
   */
  async findReports(query: ListPostReportDto) {
    const qb = this.reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.user', 'user')
      .leftJoinAndSelect('report.post', 'post')
      .where('report.delFlag = :delFlag', { delFlag: '0' });

    if (query.postId) {
      qb.andWhere('report.postId = :postId', { postId: query.postId });
    }
    if (query.status) {
      qb.andWhere('report.status = :status', { status: query.status });
    }

    // 按举报时间倒序排列
    qb.orderBy('report.createTime', 'DESC');

    if (query.pageSize && query.pageNum) {
      qb.skip(query.pageSize * (query.pageNum - 1)).take(query.pageSize);
    }

    const [list, total] = await qb.getManyAndCount();

    list.forEach((report) => {
      if (report.user) {
        delete report.user.password;
      }
    });

    return ResultData.ok({ list, total });
  }

  async handleReport(dto: HandlePostReportDto, username: string) {
    const report = await this.reportRepo.findOne({
      where: { reportId: dto.reportId, delFlag: '0' },
    });
    if (!report) {
      return ResultData.fail(400, '该举报记录不存在');
    }
    await this.reportRepo.update(
      { reportId: dto.reportId },
      {
        status: dto.status,
        updateBy: username,
      },
    );

    // 异步派发帖子举报完成事件以触发消息下发与实时推送
    const post = await this.postRepo.findOne({ where: { postId: report.postId } });
    if (post) {
      // 联动：如果管理员选择“下架”（status === '1'），同步更新帖子表中审核状态为“1：已下架”，并清理之前的申诉数据
      if (dto.status === '1') {
        await this.postRepo.update(
          { postId: report.postId },
          {
            auditStatus: '1',
            appealReason: '',
            appealTime: null,
            updateBy: username,
          },
        );
      }

      this.eventEmitter.emit('forum.report.processed', {
        postId: report.postId,
        reporterId: report.userId,
        authorId: post.userId,
        postTitle: post.title,
        action: dto.status === '1' ? '下架' : '解除争议',
        reason: report.reason,
      });
    }

    return ResultData.ok();
  }

  /**
   * 获取当前用户收藏的所有帖子
   */
  async findMyCollectedPosts(userId: number) {
    const collects = await this.postCollectRepo.find({
      where: { userId },
      select: ['postId'],
    });
    if (collects.length === 0) {
      return ResultData.ok({ list: [], total: 0 });
    }
    const postIds = collects.map((c) => c.postId);
    const posts = await this.postRepo.find({
      where: {
        postId: In(postIds),
        delFlag: '0',
        status: '0',
      },
      relations: ['user'],
      order: { createTime: 'DESC' },
    });
    posts.forEach((post) => {
      if (post.user) {
        delete post.user.password;
      }
    });
    return ResultData.ok({ list: posts, total: posts.length });
  }

  /**
   * 发帖人发起帖子申诉
   */
  async appealPost(dto: AppealPostDto, userId: number, username: string) {
    const post = await this.postRepo.findOne({ where: { postId: dto.postId, delFlag: '0' } });
    if (!post) {
      return ResultData.fail(404, '申诉失败：该帖子不存在或已被永久删除');
    }
    // 校验身份（防越权）
    if (post.userId !== userId) {
      return ResultData.fail(403, '申诉失败：您无权对此帖子发起申诉');
    }
    // 校验当前审核状态：仅在违规下架(1)或曾被驳回(3)时允许申诉
    if (post.auditStatus !== '1' && post.auditStatus !== '3') {
      return ResultData.fail(400, '申诉失败：当前帖子无需发起申诉');
    }

    await this.postRepo.update(
      { postId: dto.postId },
      {
        auditStatus: '2', // 变更状态为 2: 申诉中
        appealReason: dto.appealReason,
        appealTime: new Date(),
        updateBy: username,
      },
    );

    return ResultData.ok();
  }

  /**
   * 管理员审核复核帖子申诉
   */
  async handleAppeal(dto: HandleAppealDto, username: string) {
    const post = await this.postRepo.findOne({ where: { postId: dto.postId, delFlag: '0' } });
    if (!post) {
      return ResultData.fail(404, '该帖子不存在或已被软删除');
    }
    if (post.auditStatus !== '2') {
      return ResultData.fail(400, '该帖子不处于申诉复核状态');
    }
    if (dto.status !== '0' && dto.status !== '3') {
      return ResultData.fail(400, '无效的审批状态，只能设置为恢复上架(0)或驳回申诉(3)');
    }

    const updatePayload: any = {
      auditStatus: dto.status,
      updateBy: username,
    };

    // 如果审批通过恢复上架，则清空申诉历史数据，恢复正常
    if (dto.status === '0') {
      updatePayload.appealReason = '';
      updatePayload.appealTime = null;
    }

    await this.postRepo.update({ postId: dto.postId }, updatePayload);

    // 派发申诉复核完毕事件，用于通知提醒推送
    this.eventEmitter.emit('forum.appeal.processed', {
      postId: post.postId,
      authorId: post.userId,
      postTitle: post.title,
      result: dto.status === '0' ? '通过' : '驳回',
      appealReason: post.appealReason,
    });

    return ResultData.ok();
  }
}

