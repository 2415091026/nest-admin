# 徐良粉丝小程序 - 服务端需求文档（若依Nest版）

## 一、概述

### 1.1 文档目的
本文档定义徐良粉丝小程序「良迷空间」的服务端技术方案。服务端基于**若依Nest版本**（RuoYi-Nest）进行开发，采用 NestJS + TypeORM + MySQL + Redis 技术栈，复用若依框架内置的权限管理、用户体系、字典管理、参数管理、操作日志、定时任务等基础能力。

### 1.2 技术选型

| 层级 | 技术方案 | 版本/说明 |
|------|----------|-----------|
| 编程语言 | TypeScript | NestJS 原生支持 |
| Web框架 | NestJS | v10.x，模块化、依赖注入、AOP |
| ORM | TypeORM | v0.3.x，支持 MySQL/PostgreSQL |
| 数据库 | MySQL 8.0 | 主从复制，主库写、从库读 |
| 缓存 | Redis 7.x | ioredis，会话/热点数据/分布式锁 |
| 消息队列 | Bull (Redis-based) | 基于Redis的队列，轻量可靠 |
| 定时任务 | @nestjs/schedule | Cron表达式，内置调度 |
| 对象存储 | 阿里云OSS / MinIO | 图片/音频/视频资源 |
| 搜索引擎 | TypeORM全文检索 / Meilisearch | 歌曲/帖子搜索 |
| 容器化 | Docker + Docker Compose | 开发/测试环境 |
| 网关 | Nginx | 反向代理、负载均衡、SSL |
| 监控 | 若依内置监控 + Prometheus | 服务监控、连接池监控 |
| 日志 | Winston / NestJS Logger | 结构化日志 |

### 1.3 若依Nest框架复用能力

| 若依内置模块 | 复用方式 | 本项目适配 |
|-------------|----------|-----------|
| 用户管理 | 直接复用 | 扩展微信登录字段 |
| 角色权限 (RBAC) | 直接复用 | 定义粉丝/管理员角色 |
| 菜单管理 | 直接复用 | 配置管理后台菜单 |
| 部门管理 | 不使用 | 粉丝社区无需部门 |
| 字典管理 | 直接复用 | 歌曲分类、标签字典 |
| 参数管理 | 直接复用 | 系统配置参数 |
| 通知公告 | 改造复用 | 作为系统消息来源 |
| 操作日志 | 直接复用 | 记录所有管理操作 |
| 登录日志 | 直接复用 | 记录用户登录行为 |
| 定时任务 | 直接复用 | 签到重置、排行榜计算 |
| 服务监控 | 直接复用 | CPU/内存/磁盘监控 |
| 缓存监控 | 直接复用 | Redis缓存管理 |
| 代码生成 | 直接复用 | 快速生成CRUD代码 |
| 在线用户 | 直接复用 | 监控活跃用户 |

---

## 二、系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │  微信小程序  │  │   H5页面    │  │  若依管理后台 │                         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                         │
└─────────┼────────────────┼────────────────┼────────────────────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                              │ HTTPS
┌─────────────────────────────▼─────────────────────────────────────────────┐
│                            接入层                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Nginx 反向代理                                                      │  │
│  │  • SSL终止  • 负载均衡  • 静态资源缓存  • 限流配置                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬─────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────────────┐
│                         NestJS 单体应用                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  API Gateway (若依扩展)                                              │  │
│  │  • JWT鉴权  • 权限校验  • 统一响应  • 全局异常  • 操作日志           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐          │
│  │ 用户模块 │ 音乐模块 │ 内容模块 │ 社区模块 │ 积分模块 │ 消息模块 │          │
│  │ (复用+) │ (新增)  │ (新增)  │ (新增)  │ (新增)  │ (新增)  │          │
│  └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘          │
│       │         │         │         │         │         │                │
│  ┌────┴─────────┴─────────┴─────────┴─────────┴─────────┐                │
│  │              若依基础服务层                             │                │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │                │
│  │  │TypeORM  │ │ ioredis │ │  Bull   │ │Schedule │    │                │
│  │  │(数据库) │ │ (缓存)  │ │ (队列)  │ │(定时任务)│    │                │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │                │
│  └──────────────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐    ┌────────▼────────┐   ┌───────▼──────┐
│   MySQL 8.0  │    │    Redis 7.x    │   │  阿里云OSS   │
│  主从集群     │    │   单实例/主从   │   │  / MinIO     │
└──────────────┘    └─────────────────┘   └──────────────┘
```

### 2.2 模块划分

| 模块名 | 类型 | 说明 |
|--------|------|------|
| `auth` | 若依复用+扩展 | 微信登录、JWT鉴权、Token刷新 |
| `user` | 若依复用+扩展 | 用户信息、粉丝等级、关注关系 |
| `role` | 若依复用 | 角色权限RBAC |
| `menu` | 若依复用 | 管理后台菜单 |
| `dict` | 若依复用 | 数据字典（歌曲分类、标签等） |
| `config` | 若依复用 | 系统参数配置 |
| `notice` | 若依复用+改造 | 系统通知公告 |
| `log` | 若依复用 | 操作日志、登录日志 |
| `monitor` | 若依复用 | 服务监控、在线用户 |
| `job` | 若依复用 | 定时任务调度 |
| `music` | 新增 | 歌曲/专辑/歌词/播放统计 |
| `content` | 新增 | 动态资讯/Banner管理 |
| `community` | 新增 | 帖子/评论/点赞/话题 |
| `point` | 新增 | 积分/任务/签到/排行榜 |
| `message` | 新增 | 站内信/推送通知 |
| `upload` | 若依复用+扩展 | 文件上传（扩展支持OSS） |

---

## 三、项目结构

```
xuliang-server-nest/
├── src/
│   ├── app.module.ts                    # 根模块
│   ├── main.ts                          # 应用入口
│   │
│   ├── common/                          # 公共模块（若依风格）
│   │   ├── constants/                   # 常量定义
│   │   ├── decorators/                  # 自定义装饰器
│   │   ├── dto/                         # 公共DTO
│   │   ├── enums/                       # 枚举定义
│   │   ├── exceptions/                  # 全局异常
│   │   ├── filters/                     # 异常过滤器
│   │   ├── guards/                      # 守卫（鉴权/权限）
│   │   ├── interceptors/              # 拦截器（日志/响应）
│   │   ├── pipes/                       # 管道（校验/转换）
│   │   └── utils/                       # 工具函数
│   │
│   ├── config/                          # 配置文件
│   │   ├── database.config.ts           # 数据库配置
│   │   ├── redis.config.ts              # Redis配置
│   │   ├── jwt.config.ts                # JWT配置
│   │   ├── oss.config.ts                # OSS配置
│   │   └── wechat.config.ts             # 微信配置
│   │
│   ├── modules/                         # 业务模块
│   │   ├── auth/                        # 认证模块（若依复用+扩展）
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── wx-login.dto.ts
│   │   │
│   │   ├── user/                        # 用户模块（若依复用+扩展）
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts       # 扩展微信字段、等级、积分
│   │   │   └── dto/
│   │   │
│   │   ├── role/                        # 角色模块（若依复用）
│   │   ├── menu/                        # 菜单模块（若依复用）
│   │   ├── dict/                        # 字典模块（若依复用）
│   │   ├── config/                      # 参数模块（若依复用）
│   │   ├── notice/                      # 通知模块（若依复用+改造）
│   │   ├── log/                         # 日志模块（若依复用）
│   │   ├── monitor/                     # 监控模块（若依复用）
│   │   ├── job/                         # 定时任务（若依复用）
│   │   │
│   │   ├── music/                       # 音乐模块（新增）
│   │   │   ├── music.module.ts
│   │   │   ├── song.controller.ts
│   │   │   ├── song.service.ts
│   │   │   ├── album.controller.ts
│   │   │   ├── album.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── song.entity.ts
│   │   │   │   ├── album.entity.ts
│   │   │   │   └── song-artist.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── content/                     # 内容模块（新增）
│   │   │   ├── content.module.ts
│   │   │   ├── news.controller.ts
│   │   │   ├── news.service.ts
│   │   │   ├── banner.controller.ts
│   │   │   ├── banner.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── news.entity.ts
│   │   │   │   └── banner.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── community/                   # 社区模块（新增）
│   │   │   ├── community.module.ts
│   │   │   ├── post.controller.ts
│   │   │   ├── post.service.ts
│   │   │   ├── comment.controller.ts
│   │   │   ├── comment.service.ts
│   │   │   ├── topic.controller.ts
│   │   │   ├── topic.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── post.entity.ts
│   │   │   │   ├── comment.entity.ts
│   │   │   │   ├── topic.entity.ts
│   │   │   │   └── like.entity.ts
│   │   │   └── dto/
│   │   │
│   │   ├── point/                       # 积分模块（新增）
│   │   │   ├── point.module.ts
│   │   │   ├── point.controller.ts
│   │   │   ├── point.service.ts
│   │   │   ├── task.controller.ts
│   │   │   ├── task.service.ts
│   │   │   ├── signin.controller.ts
│   │   │   ├── signin.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── point-record.entity.ts
│   │   │   │   ├── task.entity.ts
│   │   │   │   ├── user-task.entity.ts
│   │   │   │   └── signin-record.entity.ts
│   │   │   └── dto/
│   │   │
│   │   └── message/                     # 消息模块（新增）
│   │       ├── message.module.ts
│   │       ├── message.controller.ts
│   │       ├── message.service.ts
│   │       ├── entities/
│   │       │   └── message.entity.ts
│   │       └── dto/
│   │
│   └── database/                        # 数据库迁移
│       └── migrations/
│
├── uploads/                             # 本地上传目录（开发用）
├── logs/                                # 日志目录
├── test/                                # 测试文件
├── docker-compose.yml                   # 开发环境编排
├── Dockerfile                           # 生产镜像
├── nest-cli.json                        # Nest CLI配置
├── tsconfig.json                        # TypeScript配置
├── package.json
└── .env                                 # 环境变量
```

---

## 四、数据库设计（TypeORM Entity）

### 4.1 用户实体（复用若依 + 扩展）

```typescript
// src/modules/user/entities/user.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, Index
} from 'typeorm';

@Entity('sys_user', { comment: '用户表' })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '用户ID' })
  id: number;

  // ========== 若依原有字段 ==========
  @Column({ length: 64, comment: '用户账号', unique: true })
  userName: string;

  @Column({ length: 64, comment: '用户昵称' })
  nickName: string;

  @Column({ length: 128, comment: '用户邮箱', nullable: true })
  email: string;

  @Column({ length: 20, comment: '手机号码', nullable: true })
  phonenumber: string;

  @Column({ comment: '用户性别（0男 1女 2未知）', default: '2' })
  sex: string;

  @Column({ length: 128, comment: '头像地址' })
  avatar: string;

  @Column({ length: 128, comment: '密码', nullable: true })
  password: string;

  @Column({ comment: '帐号状态（0正常 1停用）', default: '0' })
  status: string;

  @Column({ comment: '删除标志（0代表存在 2代表删除）', default: '0' })
  delFlag: string;

  @Column({ length: 128, comment: '备注', nullable: true })
  remark: string;

  // ========== 微信小程序扩展字段 ==========
  @Column({ length: 64, comment: '微信openid', unique: true, nullable: true })
  @Index()
  openid: string;

  @Column({ length: 64, comment: '微信unionid', nullable: true })
  unionid: string;

  // ========== 粉丝等级体系 ==========
  @Column({ comment: '当前等级 1-10', default: 1 })
  level: number;

  @Column({ length: 16, comment: '等级名称', default: '微光' })
  levelName: string;

  @Column({ comment: '当前经验值', default: 0 })
  exp: number;

  // ========== 积分账户 ==========
  @Column({ comment: '积分余额', default: 0 })
  pointsBalance: number;

  @Column({ comment: '累计获得积分', default: 0 })
  pointsTotalEarned: number;

  @Column({ comment: '累计消费积分', default: 0 })
  pointsTotalSpent: number;

  // ========== 统计信息 ==========
  @Column({ comment: '累计登录天数', default: 0 })
  loginDays: number;

  @Column({ comment: '连续登录天数', default: 0 })
  continuousLogin: number;

  @Column({ type: 'datetime', comment: '最后登录时间', nullable: true })
  lastLoginAt: Date;

  @Column({ comment: '发帖数', default: 0 })
  postCount: number;

  @Column({ comment: '获赞数', default: 0 })
  likeCount: number;

  @Column({ comment: '关注数', default: 0 })
  followCount: number;

  @Column({ comment: '粉丝数', default: 0 })
  followerCount: number;

  // ========== 邀请体系 ==========
  @Column({ length: 16, comment: '邀请码', unique: true, nullable: true })
  inviteCode: string;

  @Column({ length: 64, comment: '邀请人账号', nullable: true })
  invitedBy: string;

  // ========== 若依原有审计字段 ==========
  @CreateDateColumn({ comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ comment: '删除时间' })
  deleteTime: Date;

  @Column({ length: 64, comment: '创建者', nullable: true })
  createBy: string;

  @Column({ length: 64, comment: '更新者', nullable: true })
  updateBy: string;
}
```

### 4.2 歌曲实体

```typescript
// src/modules/music/entities/song.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index
} from 'typeorm';

@Entity('music_song', { comment: '歌曲表' })
export class Song {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true, comment: '歌曲业务ID' })
  songId: string;

  @Column({ length: 128, comment: '歌曲名' })
  name: string;

  @Column({ type: 'json', comment: '别名JSON数组', nullable: true })
  alias: string[];

  @Column({ length: 32, comment: '所属专辑ID' })
  @Index()
  albumId: string;

  @Column({ length: 128, comment: '专辑名（冗余）' })
  albumName: string;

  @Column({ length: 512, comment: '专辑封面', nullable: true })
  albumCover: string;

  @Column({ comment: '时长（秒）', nullable: true })
  duration: number;

  @Column({ type: 'json', comment: '标签JSON数组', nullable: true })
  tags: string[];

  @Column({ type: 'date', comment: '发行日期', nullable: true })
  releaseDate: Date;

  @Column({ type: 'text', comment: 'LRC歌词', nullable: true })
  lyrics: string;

  @Column({ comment: '是否有翻译', default: false })
  hasTranslation: boolean;

  // 外部链接
  @Column({ length: 512, comment: 'QQ音乐链接', nullable: true })
  qqMusicUrl: string;

  @Column({ length: 512, comment: '网易云链接', nullable: true })
  neteaseUrl: string;

  @Column({ length: 512, comment: '酷狗链接', nullable: true })
  kugouUrl: string;

  @Column({ length: 512, comment: 'MV链接', nullable: true })
  mvUrl: string;

  // 统计
  @Column({ comment: '播放次数', default: 0 })
  playCount: number;

  @Column({ comment: '收藏数', default: 0 })
  likeCount: number;

  @Column({ comment: '分享数', default: 0 })
  shareCount: number;

  // 状态
  @Column({
    type: 'enum',
    enum: ['published', 'draft', 'hidden'],
    default: 'published',
    comment: '状态'
  })
  status: string;

  @Column({ comment: '排序权重', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
```

### 4.3 歌曲艺人关联实体

```typescript
// src/modules/music/entities/song-artist.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('music_song_artist', { comment: '歌曲艺人关联表' })
export class SongArtist {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32 })
  @Index()
  songId: string;

  @Column({ length: 64, comment: '艺人名' })
  artistName: string;

  @Column({ length: 32, comment: '角色', default: '主唱' })
  role: string;

  @Column({ comment: '排序', default: 0 })
  sortOrder: number;
}
```

### 4.4 专辑实体

```typescript
// src/modules/music/entities/album.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('music_album', { comment: '专辑表' })
export class Album {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  albumId: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 512, nullable: true })
  cover: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: Date;

  @Column({ length: 128, nullable: true })
  publisher: string;

  @Column({
    type: 'enum',
    enum: ['studio', 'live', 'ep', 'compilation'],
    default: 'studio'
  })
  category: string;

  @Column({ length: 32, nullable: true })
  era: string;

  @Column({ default: 0 })
  songCount: number;

  @Column({ default: 0 })
  totalPlayCount: number;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
```

### 4.5 动态资讯实体

```typescript
// src/modules/content/entities/news.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('content_news', { comment: '动态资讯表' })
export class News {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  newsId: string;

  @Column({ length: 256 })
  title: string;

  @Column({ type: 'longtext', nullable: true })
  content: string;

  @Column({ length: 512, nullable: true })
  summary: string;

  @Column({
    type: 'enum',
    enum: ['official', 'weibo', 'douyin', 'news', 'video'],
    default: 'official'
  })
  type: string;

  @Column({ length: 64, nullable: true })
  sourceName: string;

  @Column({ length: 512, nullable: true })
  sourceUrl: string;

  @Column({ length: 512, nullable: true })
  sourceIcon: string;

  @Column({ type: 'json', nullable: true })
  media: any[];

  @Column({ type: 'json', nullable: true })
  relatedSongs: string[];

  @Column({ type: 'json', nullable: true })
  relatedAlbums: string[];

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  shareCount: number;

  @Column({ length: 64, nullable: true })
  author: string;

  @Column({ type: 'datetime', nullable: true })
  publishAt: Date;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  })
  status: string;

  @Column({ default: false })
  isTop: boolean;

  @Column({ type: 'datetime', nullable: true })
  topExpireAt: Date;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
```

### 4.6 Banner实体

```typescript
// src/modules/content/entities/banner.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('content_banner', { comment: 'Banner表' })
export class Banner {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  bannerId: string;

  @Column({ length: 128 })
  title: string;

  @Column({ length: 256, nullable: true })
  subtitle: string;

  @Column({ length: 512 })
  image: string;

  @Column({ length: 32 })
  linkType: string;

  @Column({ length: 32, nullable: true })
  linkId: string;

  @Column({ length: 512, nullable: true })
  linkUrl: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active'
  })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  startAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endAt: Date;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
```

### 4.7 社区帖子实体

```typescript
// src/modules/community/entities/post.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, Index
} from 'typeorm';

@Entity('community_post', { comment: '社区帖子表' })
export class Post {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  postId: string;

  @Column({ length: 32 })
  @Index()
  userId: string;

  @Column({ length: 64 })
  authorNickname: string;

  @Column({ length: 512, nullable: true })
  authorAvatar: string;

  @Column({ default: 1 })
  authorLevel: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'video', 'mixed'],
    default: 'text'
  })
  contentType: string;

  @Column({ type: 'json', nullable: true })
  media: any[];

  @Column({ type: 'json', nullable: true })
  topics: any[];

  @Column({ length: 128, nullable: true })
  locationName: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  locationLng: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  locationLat: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  shareCount: number;

  @Column({ default: 0 })
  collectCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending'
  })
  status: string;

  @Column({ default: false })
  isEssence: boolean;

  @Column({ default: false })
  isTop: boolean;

  @Column({ length: 256, nullable: true })
  auditReason: string;

  @Column({ type: 'datetime', nullable: true })
  auditedAt: Date;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;

  @DeleteDateColumn()
  deleteTime: Date;
}
```

### 4.8 评论实体

```typescript
// src/modules/community/entities/comment.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, Index
} from 'typeorm';

@Entity('community_comment', { comment: '评论表' })
export class Comment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  commentId: string;

  @Column({
    type: 'enum',
    enum: ['post', 'song', 'album', 'news']
  })
  targetType: string;

  @Column({ length: 32 })
  @Index()
  targetId: string;

  @Column({ length: 32 })
  userId: string;

  @Column({ length: 64 })
  authorNickname: string;

  @Column({ length: 512, nullable: true })
  authorAvatar: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 32, nullable: true })
  parentId: string;

  @Column({ length: 32, nullable: true })
  replyToUserId: string;

  @Column({ length: 64, nullable: true })
  replyToNickname: string;

  @Column({ default: 0 })
  likeCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  })
  status: string;

  @CreateDateColumn()
  createTime: Date;

  @DeleteDateColumn()
  deleteTime: Date;
}
```

### 4.9 点赞记录实体

```typescript
// src/modules/community/entities/like.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('community_like', { comment: '点赞记录表' })
@Unique(['userId', 'targetType', 'targetId'])
export class Like {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32 })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['post', 'comment', 'song', 'news']
  })
  targetType: string;

  @Column({ length: 32 })
  @Index()
  targetId: string;

  @CreateDateColumn()
  createTime: Date;
}
```

### 4.10 积分记录实体

```typescript
// src/modules/point/entities/point-record.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index
} from 'typeorm';

@Entity('point_record', { comment: '积分记录表' })
export class PointRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  recordId: string;

  @Column({ length: 32 })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['earn', 'spend']
  })
  type: string;

  @Column({ comment: '变动数量' })
  amount: number;

  @Column({ comment: '变动后余额' })
  balance: number;

  @Column({ length: 32 })
  sourceType: string;

  @Column({ length: 64 })
  sourceName: string;

  @Column({ length: 32, nullable: true })
  relatedId: string;

  @Column({ length: 256, nullable: true })
  description: string;

  @CreateDateColumn()
  createTime: Date;
}
```

### 4.11 任务配置实体

```typescript
// src/modules/point/entities/task.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('point_task', { comment: '任务配置表' })
export class Task {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  taskId: string;

  @Column({ length: 64 })
  name: string;

  @Column({ length: 256, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'once', 'achievement']
  })
  type: string;

  @Column({ length: 32 })
  conditionType: string;

  @Column({ default: 1 })
  conditionTarget: number;

  @Column({ type: 'json', nullable: true })
  conditionExtra: any;

  @Column({ default: 0 })
  rewardPoints: number;

  @Column({ default: 0 })
  rewardExp: number;

  @Column({ length: 32, nullable: true })
  rewardBadge: string;

  @Column({ nullable: true })
  dailyMax: number;

  @Column({ nullable: true })
  totalMax: number;

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'disabled'],
    default: 'active'
  })
  status: string;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
```

### 4.12 用户任务进度实体

```typescript
// src/modules/point/entities/user-task.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Unique
} from 'typeorm';

@Entity('point_user_task', { comment: '用户任务进度表' })
@Unique(['userId', 'taskId'])
export class UserTask {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32 })
  userId: string;

  @Column({ length: 32 })
  taskId: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 1 })
  target: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  dailyProgress: number;

  @Column({ type: 'date', nullable: true })
  dailyDate: Date;

  @Column({ default: 0 })
  totalCompleted: number;

  @UpdateDateColumn()
  updateTime: Date;
}
```

### 4.13 签到记录实体

```typescript
// src/modules/point/entities/signin-record.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index
} from 'typeorm';

@Entity('point_signin_record', { comment: '签到记录表' })
@Unique(['userId', 'date'])
export class SigninRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32 })
  @Index()
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'datetime' })
  signinAt: Date;

  @Column({ default: 0 })
  rewardPoints: number;

  @Column({ default: 0 })
  rewardExp: number;

  @Column({ default: false })
  isDouble: boolean;

  @Column({ default: 1 })
  continuousDays: number;

  @CreateDateColumn()
  createTime: Date;
}
```

### 4.14 消息实体

```typescript
// src/modules/message/entities/message.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index
} from 'typeorm';

@Entity('message', { comment: '消息表' })
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, unique: true })
  messageId: string;

  @Column({ length: 32 })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['system', 'like', 'comment', 'follow', 'level_up', 'task_complete']
  })
  type: string;

  @Column({ length: 128 })
  title: string;

  @Column({ length: 512 })
  content: string;

  @Column({ length: 32, nullable: true })
  senderUserId: string;

  @Column({ length: 64, nullable: true })
  senderNickname: string;

  @Column({ length: 512, nullable: true })
  senderAvatar: string;

  @Column({ length: 32, nullable: true })
  relatedType: string;

  @Column({ length: 32, nullable: true })
  relatedId: string;

  @Column({ length: 256, nullable: true })
  relatedContent: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createTime: Date;
}
```

### 4.15 关注关系实体

```typescript
// src/modules/user/entities/follow.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm';

@Entity('user_follow', { comment: '关注关系表' })
@Unique(['userId', 'followedUserId'])
export class Follow {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32 })
  @Index()
  userId: string;

  @Column({ length: 32 })
  @Index()
  followedUserId: string;

  @CreateDateColumn()
  createTime: Date;
}
```

---

## 五、API接口规范

### 5.1 接口通用规范

**Base URL:** `https://api.xuliang-fan.com/v1`

**请求头：**
```
Content-Type: application/json
Authorization: Bearer <access_token>
X-Request-ID: <uuid>
```

**统一响应格式：**
```typescript
// src/common/dto/response.dto.ts
export class ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
  timestamp: number;
}
```

**分页响应：**
```typescript
// src/common/dto/pagination.dto.ts
export class PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export class PaginatedResponse<T> {
  list: T[];
  pagination: PaginationDto;
}
```

### 5.2 认证模块（若依复用+扩展）

#### 5.2.1 微信登录
```typescript
// src/modules/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: '微信登录' })
  async wxLogin(@Body() dto: WxLoginDto): Promise<ApiResponse<LoginResponse>> {
    return this.authService.wxLogin(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新Token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<ApiResponse<TokenPair>> {
    return this.authService.refreshToken(dto);
  }
}
```

**WxLoginDto：**
```typescript
export class WxLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;                    // 微信登录code

  @IsString()
  @IsOptional()
  encryptedData?: string;          // 加密数据

  @IsString()
  @IsOptional()
  iv?: string;                     // 加密IV

  @IsString()
  @IsOptional()
  inviteCode?: string;             // 邀请码
}
```

**LoginResponse：**
```typescript
export class LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userInfo: UserInfoDto;
  isNewUser: boolean;
}
```

#### 5.2.2 JWT Guard（若依风格）
```typescript
// src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 复用若依的JWT鉴权逻辑
  // 支持Token自动刷新
}
```

### 5.3 用户模块（若依复用+扩展）

```typescript
// src/modules/user/user.controller.ts
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Req() req): Promise<ApiResponse<UserProfileDto>> {
    return this.userService.getProfile(req.user.userId);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新用户信息' })
  async updateProfile(
    @Req() req,
    @Body() dto: UpdateProfileDto
  ): Promise<ApiResponse<void>> {
    return this.userService.updateProfile(req.user.userId, dto);
  }

  @Get('rankings')
  @ApiOperation({ summary: '获取排行榜' })
  async getRankings(
    @Query() query: RankingQueryDto
  ): Promise<ApiResponse<PaginatedResponse<RankingItemDto>>> {
    return this.userService.getRankings(query);
  }

  @Post(':userId/follow')
  @ApiOperation({ summary: '关注用户' })
  async follow(
    @Req() req,
    @Param('userId') targetUserId: string
  ): Promise<ApiResponse<void>> {
    return this.userService.follow(req.user.userId, targetUserId);
  }
}
```

### 5.4 音乐模块（新增）

```typescript
// src/modules/music/song.controller.ts
@Controller('songs')
export class SongController {
  @Get()
  @ApiOperation({ summary: '获取歌曲列表' })
  async list(@Query() query: SongListQueryDto): Promise<ApiResponse<PaginatedResponse<SongDto>>> {
    return this.songService.list(query);
  }

  @Get(':songId')
  @ApiOperation({ summary: '获取歌曲详情' })
  async detail(@Param('songId') songId: string): Promise<ApiResponse<SongDetailDto>> {
    return this.songService.detail(songId);
  }

  @Post(':songId/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '收藏歌曲' })
  async like(
    @Req() req,
    @Param('songId') songId: string
  ): Promise<ApiResponse<void>> {
    return this.songService.like(req.user.userId, songId);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索歌曲' })
  async search(@Query('q') keyword: string): Promise<ApiResponse<SongDto[]>> {
    return this.songService.search(keyword);
  }
}
```

### 5.5 社区模块（新增）

```typescript
// src/modules/community/post.controller.ts
@Controller('posts')
export class PostController {
  @Get()
  @ApiOperation({ summary: '获取帖子列表' })
  async list(@Query() query: PostListQueryDto): Promise<ApiResponse<PaginatedResponse<PostDto>>> {
    return this.postService.list(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '发布帖子' })
  async create(
    @Req() req,
    @Body() dto: CreatePostDto
  ): Promise<ApiResponse<PostDto>> {
    return this.postService.create(req.user.userId, dto);
  }

  @Post(':postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '点赞帖子' })
  async like(
    @Req() req,
    @Param('postId') postId: string
  ): Promise<ApiResponse<void>> {
    return this.postService.like(req.user.userId, postId);
  }
}
```

### 5.6 积分模块（新增）

```typescript
// src/modules/point/signin.controller.ts
@Controller('points')
@UseGuards(JwtAuthGuard)
export class SigninController {
  @Post('signin')
  @ApiOperation({ summary: '每日签到' })
  async signin(@Req() req): Promise<ApiResponse<SigninResultDto>> {
    return this.signinService.signin(req.user.userId);
  }

  @Get('signin/calendar')
  @ApiOperation({ summary: '获取签到日历' })
  async calendar(
    @Req() req,
    @Query('month') month: string
  ): Promise<ApiResponse<SigninCalendarDto>> {
    return this.signinService.getCalendar(req.user.userId, month);
  }
}

// src/modules/point/task.controller.ts
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  async list(@Req() req): Promise<ApiResponse<TaskListDto>> {
    return this.taskService.list(req.user.userId);
  }

  @Post(':taskId/complete')
  @ApiOperation({ summary: '完成任务' })
  async complete(
    @Req() req,
    @Param('taskId') taskId: string
  ): Promise<ApiResponse<TaskCompleteResultDto>> {
    return this.taskService.complete(req.user.userId, taskId);
  }
}
```

---

## 六、核心业务逻辑

### 6.1 微信登录流程

```typescript
// src/modules/auth/auth.service.ts
@Injectable()
export class AuthService {
  async wxLogin(dto: WxLoginDto): Promise<ApiResponse<LoginResponse>> {
    // 1. 调用微信 jscode2session
    const wxSession = await this.wxService.code2Session(dto.code);
    // { openid, session_key, unionid }

    // 2. 根据 openid 查询用户
    let user = await this.userRepo.findOne({ where: { openid: wxSession.openid } });
    let isNewUser = false;

    if (!user) {
      // 3. 新用户注册
      isNewUser = true;
      user = await this.registerUser(wxSession, dto);
    }

    // 4. 更新登录信息
    await this.updateLoginInfo(user);

    // 5. 生成 JWT Token
    const tokens = await this.generateTokens(user);

    // 6. 缓存用户信息到Redis
    await this.cacheUser(user);

    // 7. 异步记录登录日志（若依内置）
    this.logService.recordLogin(user);

    return {
      code: 0,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 7200,
        userInfo: this.mapToUserInfo(user),
        isNewUser
      }
    };
  }

  private async registerUser(wxSession: WxSession, dto: WxLoginDto): Promise<User> {
    const user = new User();
    user.userName = this.generateUserName();
    user.nickName = `良迷${this.generateRandomSuffix()}`;
    user.openid = wxSession.openid;
    user.unionid = wxSession.unionid;
    user.avatar = '/default-avatar.png';
    user.inviteCode = this.generateInviteCode();

    if (dto.inviteCode) {
      const inviter = await this.userRepo.findOne({ where: { inviteCode: dto.inviteCode } });
      if (inviter) {
        user.invitedBy = inviter.userName;
        // 异步给邀请人发奖励
        await this.pointQueue.add('invite_reward', { inviterId: inviter.userName });
      }
    }

    return this.userRepo.save(user);
  }
}
```

### 6.2 签到业务

```typescript
// src/modules/point/signin.service.ts
@Injectable()
export class SigninService {
  async signin(userId: string): Promise<SigninResultDto> {
    const today = dayjs().format('YYYY-MM-DD');

    // 1. 检查今日是否已签到（Redis + 数据库双重检查）
    const cacheKey = `signin:${userId}:${today}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      throw new BusinessException('今日已签到', 4002);
    }

    const existing = await this.signinRepo.findOne({
      where: { userId, date: today }
    });
    if (existing) {
      throw new BusinessException('今日已签到', 4002);
    }

    // 2. 计算连续签到天数
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const yesterdayRecord = await this.signinRepo.findOne({
      where: { userId, date: yesterday }
    });
    const continuousDays = yesterdayRecord ? yesterdayRecord.continuousDays + 1 : 1;

    // 3. 计算奖励
    const isDouble = continuousDays >= 7;
    const basePoints = 10;
    const rewardPoints = isDouble ? basePoints * 2 : basePoints;
    const rewardExp = isDouble ? 10 : 5;

    // 4. 开启事务
    await this.dataSource.transaction(async manager => {
      // 4.1 插入签到记录
      const record = new SigninRecord();
      record.userId = userId;
      record.date = today;
      record.signinAt = new Date();
      record.rewardPoints = rewardPoints;
      record.rewardExp = rewardExp;
      record.isDouble = isDouble;
      record.continuousDays = continuousDays;
      await manager.save(record);

      // 4.2 更新用户积分和经验
      await manager.increment(User, { userName: userId }, 'pointsBalance', rewardPoints);
      await manager.increment(User, { userName: userId }, 'exp', rewardExp);

      // 4.3 插入积分记录
      const pointRecord = new PointRecord();
      pointRecord.recordId = this.generateId();
      pointRecord.userId = userId;
      pointRecord.type = 'earn';
      pointRecord.amount = rewardPoints;
      pointRecord.sourceType = 'signin';
      pointRecord.sourceName = '每日签到';
      pointRecord.description = `连续签到${continuousDays}天`;
      await manager.save(pointRecord);
    });

    // 5. 缓存签到状态
    await this.redis.setex(cacheKey, 86400, '1');

    // 6. 检查等级提升
    await this.userService.checkLevelUp(userId);

    // 7. 发送签到成功消息
    await this.messageQueue.add('signin_success', { userId, rewardPoints, continuousDays });

    return {
      success: true,
      reward: { points: rewardPoints, exp: rewardExp, isDouble },
      continuousDays,
      nextReward: { day: continuousDays + 1, points: 10, isDouble: continuousDays + 1 >= 7 }
    };
  }
}
```

### 6.3 内容审核流程

```typescript
// src/modules/community/post.service.ts
@Injectable()
export class PostService {
  async create(userId: string, dto: CreatePostDto): Promise<PostDto> {
    // 1. 参数校验
    if (dto.content.length > 2000) {
      throw new BusinessException('内容长度超过限制', 1001);
    }

    // 2. 敏感词过滤
    const filtered = await this.sensitiveWordService.filter(dto.content);
    if (filtered.hasSensitive) {
      throw new BusinessException('内容包含敏感词', 3002);
    }

    // 3. 保存帖子（pending状态）
    const post = new Post();
    post.postId = this.generateId();
    post.userId = userId;
    post.content = dto.content;
    post.media = dto.media;
    post.topics = dto.topics;
    post.status = 'pending';
    await this.postRepo.save(post);

    // 4. 异步审核（Bull队列）
    await this.auditQueue.add('content_audit', {
      targetType: 'post',
      targetId: post.postId,
      content: dto.content,
      media: dto.media
    }, { delay: 0 });

    // 5. 图片鉴黄（异步）
    if (dto.media?.length > 0) {
      await this.auditQueue.add('image_audit', {
        postId: post.postId,
        images: dto.media.filter(m => m.type === 'image').map(m => m.url)
      });
    }

    return this.mapToDto(post);
  }
}

// 审核消费者
// src/modules/community/consumers/audit.consumer.ts
@Processor('content_audit')
export class AuditConsumer {
  @Process('content_audit')
  async handleContentAudit(job: Job<AuditJob>) {
    const { targetType, targetId, content } = job.data;

    // 1. 调用微信内容安全API
    const wxResult = await this.wxService.msgSecCheck(content);

    // 2. 根据审核结果更新状态
    if (wxResult.errcode === 0) {
      await this.postRepo.update({ postId: targetId }, { status: 'approved' });
    } else {
      await this.postRepo.update({ postId: targetId }, {
        status: 'rejected',
        auditReason: wxResult.errmsg
      });
    }
  }
}
```

### 6.4 点赞业务（防并发）

```typescript
// src/modules/community/post.service.ts
async like(userId: string, postId: string): Promise<void> {
  const lockKey = `lock:like:${userId}:${postId}`;

  // 1. 获取分布式锁（Redis）
  const lock = await this.redlock.acquire([lockKey], 1000);
  try {
    // 2. 检查是否已点赞
    const existing = await this.likeRepo.findOne({
      where: { userId, targetType: 'post', targetId: postId }
    });

    if (existing) {
      // 取消点赞
      await this.likeRepo.remove(existing);
      await this.postRepo.decrement({ postId }, 'likeCount', 1);
      await this.redis.srem(`user:likes:${userId}:post`, postId);
    } else {
      // 点赞
      const like = new Like();
      like.userId = userId;
      like.targetType = 'post';
      like.targetId = postId;
      await this.likeRepo.save(like);
      await this.postRepo.increment({ postId }, 'likeCount', 1);
      await this.redis.sadd(`user:likes:${userId}:post`, postId);

      // 异步：发送通知 + 积分奖励
      await this.notificationQueue.add('post_liked', { userId, postId });
      await this.pointQueue.add('reward', {
        userId,
        sourceType: 'post_liked',
        sourceName: '帖子被点赞'
      });
    }
  } finally {
    await lock.release();
  }
}
```

---

## 七、缓存设计

### 7.1 Redis缓存策略

```typescript
// src/config/redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  keyPrefix: 'xuliang:',
};

// 缓存Key定义
export const CacheKeys = {
  // 用户
  userProfile: (userId: string) => `user:profile:${userId}`,
  userToken: (userId: string) => `user:token:${userId}`,

  // 歌曲
  songDetail: (songId: string) => `song:detail:${songId}`,
  songList: (category: string, sort: string, page: number, limit: number) =>
    `songs:list:${category}:${sort}:${page}:${limit}`,

  // 帖子
  postDetail: (postId: string) => `post:detail:${postId}`,
  postHotList: (page: number, limit: number) => `posts:hot:${page}:${limit}`,

  // 排行榜
  ranking: (type: string, period: string) => `ranking:${type}:${period}`,

  // 签到
  signinStatus: (userId: string, date: string) => `signin:${userId}:${date}`,

  // 限流
  rateLimit: (key: string) => `rate_limit:${key}`,

  // 分布式锁
  lock: (resource: string) => `lock:${resource}`,
};
```

### 7.2 缓存装饰器（NestJS风格）

```typescript
// src/common/decorators/cache.decorator.ts
export const Cacheable = (ttl: number, keyGenerator?: (...args: any[]) => string) => {
  return applyDecorators(
    SetMetadata('cache_ttl', ttl),
    SetMetadata('cache_key_generator', keyGenerator),
  );
};

// 使用示例
@Controller('songs')
export class SongController {
  @Get()
  @Cacheable(3600) // 缓存1小时
  async list(@Query() query: SongListQueryDto) {
    return this.songService.list(query);
  }

  @Get(':songId')
  @Cacheable(3600, (songId: string) => CacheKeys.songDetail(songId))
  async detail(@Param('songId') songId: string) {
    return this.songService.detail(songId);
  }
}
```

---

## 八、定时任务

```typescript
// src/modules/job/tasks/signin-reset.task.ts
@Injectable()
export class SigninResetTask {
  constructor(
    private readonly redis: RedisService,
    private readonly userRepo: Repository<User>,
  ) {}

  // 每天凌晨重置任务进度
  @Cron('0 0 0 * * *', { timeZone: 'Asia/Shanghai' })
  async resetDailyTasks() {
    this.logger.log('开始重置每日任务进度');

    // 1. 重置所有用户的每日任务进度
    await this.userTaskRepo.update(
      { type: 'daily' },
      { dailyProgress: 0, dailyDate: null }
    );

    // 2. 清除签到缓存
    const keys = await this.redis.keys('signin:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    this.logger.log('每日任务重置完成');
  }

  // 每小时计算热门帖子排行
  @Cron('0 0 * * * *')
  async calculateHotPosts() {
    const hotPosts = await this.postRepo.query(`
      SELECT post_id, (
        LOG10(GREATEST(view_count, 1)) +
        (like_count * 2 + comment_count * 3) / POWER(
          TIMESTAMPDIFF(HOUR, create_time, NOW()) + 2, 1.5
        )
      ) as score
      FROM community_post
      WHERE status = 'approved'
        AND create_time > DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY score DESC
      LIMIT 100
    `);

    // 缓存到Redis
    await this.redis.setex('posts:hot:ranking', 3600, JSON.stringify(hotPosts));
  }

  // 每天凌晨生成用户统计日报
  @Cron('0 30 2 * * *')
  async generateDailyReport() {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    // 统计昨日数据
    const stats = await this.userRepo.query(`
      SELECT
        COUNT(*) as new_users,
        SUM(login_days) as total_logins,
        (SELECT COUNT(*) FROM community_post WHERE DATE(create_time) = ?) as new_posts
      FROM sys_user
      WHERE DATE(create_time) = ?
    `, [yesterday, yesterday]);

    // 保存到统计表或发送通知
    this.logger.log(`昨日统计: ${JSON.stringify(stats[0])}`);
  }
}
```

---

## 九、部署配置

### 9.1 Docker Compose（开发环境）

```yaml
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: xuliang-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: xuliang
      MYSQL_USER: xuliang
      MYSQL_PASSWORD: xuliang_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    command: --default-authentication-plugin=mysql_native_password

  redis:
    image: redis:7-alpine
    container_name: xuliang-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: xuliang-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USERNAME=xuliang
      - DB_PASSWORD=xuliang_password
      - DB_DATABASE=xuliang
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mysql
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

volumes:
  mysql_data:
  redis_data:
```

### 9.2 Dockerfile

```dockerfile
# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 安装生产依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./

# 创建日志和上传目录
RUN mkdir -p logs uploads

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 9.3 环境变量配置

```bash
# .env.example
# 应用
NODE_ENV=production
PORT=3000

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=xuliang
DB_PASSWORD=xuliang_password
DB_DATABASE=xuliang
DB_SYNC=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d

# 微信
WECHAT_APPID=wx_appid
WECHAT_SECRET=wx_secret

# OSS
OSS_TYPE=minio  # minio / aliyun
OSS_ENDPOINT=localhost:9000
OSS_ACCESS_KEY=xuliang
OSS_SECRET_KEY=xuliang_password
OSS_BUCKET=xuliang

# 日志
LOG_LEVEL=info
LOG_PATH=./logs
```

---

## 十、开发计划

| 阶段 | 周期 | 任务 | 里程碑 |
|------|------|------|--------|
| 第一阶段 | 第1-2周 | 若依Nest框架搭建、数据库设计、微信登录 | 完成基础框架、登录可用 |
| 第二阶段 | 第3-4周 | 用户模块扩展、音乐模块、内容模块 | 完成用户信息/歌曲/专辑/动态API |
| 第三阶段 | 第5-6周 | 社区模块、帖子评论点赞、内容审核 | 完成发帖/评论/点赞/话题 |
| 第四阶段 | 第7-8周 | 积分模块、任务系统、签到功能 | 完成积分/任务/签到/排行 |
| 第五阶段 | 第9-10周 | 消息模块、管理后台、文件上传 | 完成推送/后台/上传 |
| 第六阶段 | 第11-12周 | 性能优化、安全加固、测试上线 | 压测通过、部署上线 |

---

## 十一、附录

### 11.1 package.json 核心依赖

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/bull": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "typeorm": "^0.3.0",
    "mysql2": "^3.0.0",
    "ioredis": "^5.0.0",
    "bull": "^4.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "dayjs": "^1.11.0",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.0",
    "bcryptjs": "^2.4.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### 11.2 若依Nest框架参考

| 项目 | 地址 | 说明 |
|------|------|------|
| Nest-Ruoyi-Admin | https://github.com/linlingqin77/Nest-Ruoyi-Admin | 若依Nest版本 |
| nest-admin | https://github.com/taozhi1010/nest-admin | 另一Nest版若依 |
| RuoYi-Nest | https://github.com/q986171791/RuoYi-Nest | 若依官方收录 |

---

**文档版本**：v3.0（若依Nest版）  
**创建日期**：2026年6月11日  
**最后更新**：2026年6月11日
