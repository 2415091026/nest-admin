<template>
  <div class="app-container">
    <!-- 帖子查询定位栏 -->
    <el-form :inline="true" label-width="80px" class="demo-form-inline">
      <el-form-item label="帖子ID">
        <el-input-number
          v-model="targetPostId"
          placeholder="请输入帖子ID"
          :min="1"
          controls-position="right"
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">查询回帖</el-button>
        <el-button icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 正在管理的帖子信息条 -->
    <div v-if="postInfo" class="post-info-bar">
      <el-icon class="info-icon"><Document /></el-icon>
      <span class="info-label">正在管理帖子：</span>
      <strong class="post-title">[{{ postInfo.postId }}] {{ postInfo.title }}</strong>
      <span class="post-author">（作者：{{ postInfo.user?.nickName || postInfo.user?.userName || '-' }}）</span>
    </div>

    <!-- 树形数据表格展示评论层级盖楼 -->
    <el-table
      v-loading="loading"
      :data="commentTree"
      row-key="commentId"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      default-expand-all
    >
      <el-table-column label="评论ID" prop="commentId" width="100" align="center" />
      <el-table-column label="回复内容" prop="content" align="left" :show-overflow-tooltip="true" />
      <el-table-column label="作者" align="center" width="160">
        <template #default="scope">
          <span>{{ scope.row.user?.nickName || scope.row.user?.userName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="被回复人" align="center" width="160">
        <template #default="scope">
          <span v-if="scope.row.replyToNickName" class="reply-target">
            @{{ scope.row.replyToNickName }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="获得赞数" prop="likeCount" width="110" align="center">
        <template #default="scope">
          <span>👍 {{ scope.row.likeCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发表时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button
            link
            type="primary"
            icon="Delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['forum:comment:remove']"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!loading && commentTree.length === 0" class="no-data-hint">
      <el-empty :description="targetPostId ? '该帖子下暂无回帖数据' : '请输入上方帖子ID开始查询'" />
    </div>
  </div>
</template>

<script setup name="ForumComment">
import { ref, onMounted, getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router';
import { listComment, delComment } from "@/api/forum/comment";
import { getPost } from "@/api/forum/post";

const route = useRoute();
const { proxy } = getCurrentInstance();

const loading = ref(false);
const targetPostId = ref(undefined);
const commentTree = ref([]);
const postInfo = ref(null);

/** 查询指定帖子的回帖盖楼树 */
const getCommentList = () => {
  if (!targetPostId.value) {
    commentTree.value = [];
    postInfo.value = null;
    return;
  }
  
  loading.value = true;
  
  // 1. 查询帖子详情（用于展示说明条）
  getPost(targetPostId.value).then(response => {
    postInfo.value = response.data;
  }).catch(() => {
    postInfo.value = null;
  });

  // 2. 获取该帖子下的树形评论列表
  listComment(targetPostId.value).then(response => {
    commentTree.value = response.data || [];
    loading.value = false;
  }).catch(() => {
    commentTree.value = [];
    loading.value = false;
  });
};

/** 搜索按钮操作 */
const handleQuery = () => {
  getCommentList();
};

/** 重置查询 */
const handleReset = () => {
  targetPostId.value = undefined;
  commentTree.value = [];
  postInfo.value = null;
};

/** 删除某条评论/回复 */
const handleDelete = (row) => {
  proxy.$modal.confirm('确定删除该条回复内容吗？（如果是父级回复，软删除后其子回复依然保留）').then(() => {
    return delComment(row.commentId);
  }).then(() => {
    getCommentList();
    proxy.$modal.msgSuccess("删除成功");
  }).catch(() => {});
};

onMounted(() => {
  // 解析路由传入的 postId
  const queryPostId = route.query.postId;
  if (queryPostId) {
    targetPostId.value = Number(queryPostId);
    getCommentList();
  }
});
</script>

<style scoped>
.post-info-bar {
  display: flex;
  align-items: center;
  background-color: #f4f4f5;
  border-left: 5px solid #909399;
  padding: 10px 15px;
  margin-bottom: 20px;
  border-radius: 4px;
  font-size: 14px;
}

.info-icon {
  margin-right: 8px;
  color: #606266;
  font-size: 16px;
}

.info-label {
  color: #606266;
}

.post-title {
  color: #303133;
}

.post-author {
  color: #909399;
  font-size: 13px;
}

.reply-target {
  color: #e6a23c;
  font-weight: bold;
}

.no-data-hint {
  margin-top: 50px;
}
</style>
