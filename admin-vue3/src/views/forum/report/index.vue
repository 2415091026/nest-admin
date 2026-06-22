<template>
  <div class="app-container">
    <!-- 搜索筛选栏 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="帖子ID" prop="postId">
        <el-input
          v-model="queryParams.postId"
          placeholder="请输入帖子ID"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="处理状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 200px">
          <el-option label="未处理" value="0" />
          <el-option label="已处理" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 列表数据表格 -->
    <el-table v-loading="loading" :data="reportList">
      <el-table-column label="举报ID" align="center" prop="reportId" width="90" />
      
      <!-- 被举报帖子关联展示 -->
      <el-table-column label="被举报帖子" align="left" :show-overflow-tooltip="true">
        <template #default="scope">
          <div v-if="scope.row.post">
            <el-link type="primary" @click="handleViewPost(scope.row.postId)">
              [{{ scope.row.postId }}] {{ scope.row.post.title || '-' }}
            </el-link>
          </div>
          <div v-else>
            <span class="text-muted">帖子已失效 (ID: {{ scope.row.postId }})</span>
          </div>
        </template>
      </el-table-column>

      <!-- 举报人关联展示 -->
      <el-table-column label="举报人" align="center" width="180">
        <template #default="scope">
          <span v-if="scope.row.user">
            {{ scope.row.user.nickName || '-' }} ({{ scope.row.user.userName || '-' }})
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <!-- 举报原因 -->
      <el-table-column label="举报原因" align="center" prop="reason" width="150">
        <template #default="scope">
          <el-tag type="danger" effect="plain">{{ scope.row.reason || '-' }}</el-tag>
        </template>
      </el-table-column>

      <!-- 举报描述 -->
      <el-table-column label="详细说明" align="left" prop="content" :show-overflow-tooltip="true" />

      <!-- 处理状态 -->
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.status === '0'" type="warning">未处理</el-tag>
          <el-tag v-else-if="scope.row.status === '1'" type="success">已处理</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <!-- 举报时间 -->
      <el-table-column label="举报时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ scope.row.createTime || '-' }}</span>
        </template>
      </el-table-column>

      <!-- 操作栏 -->
      <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button
            v-if="scope.row.status === '0'"
            link
            type="primary"
            icon="Check"
            @click="handleProcess(scope.row)"
            v-hasPermi="['forum:post:report:handle']"
          >处理</el-button>
          <span v-else class="text-muted">已处理</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 帖子内容详情预览对话框 -->
    <el-dialog title="被举报帖子详情" v-model="postDialogVisible" width="700px" append-to-body>
      <div v-loading="postLoading" style="min-height: 200px; padding: 10px 20px;">
        <div v-if="currentPost">
          <h2 style="margin-top: 0; margin-bottom: 10px; font-weight: 600; color: #303133;">
            {{ currentPost.title || '-' }}
          </h2>
          <div style="font-size: 13px; color: #909399; margin-bottom: 20px; border-bottom: 1px solid #ebeef5; padding-bottom: 10px;">
            <span style="margin-right: 15px;">发帖人：{{ currentPost.user?.nickName || '-' }}</span>
            <span style="margin-right: 15px;">浏览量：{{ currentPost.viewCount ?? '-' }}</span>
            <span style="margin-right: 15px;">点赞：{{ currentPost.likeCount ?? '-' }}</span>
            <span>收藏：{{ currentPost.collectCount ?? '-' }}</span>
          </div>
          <div style="line-height: 1.8; color: #606266; font-size: 14px; white-space: pre-wrap;">
            {{ currentPost.content || '无正文内容' }}
          </div>
        </div>
        <div v-else-if="!postLoading" style="text-align: center; color: #909399; padding-top: 50px;">
          加载帖子信息失败，帖子可能已被下架或删除。
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="postDialogVisible = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="PostReport">
import { ref, reactive, toRefs, getCurrentInstance } from 'vue'
import { listReport, handleReport } from '@/api/forum/report'
import request from '@/utils/request'

// 获取当前实例上下文以调用组件库内置弹窗与通知
const { proxy } = getCurrentInstance()

const reportList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)

// 帖子详情预览相关变量
const postDialogVisible = ref(false)
const postLoading = ref(false)
const currentPost = ref(null)

// 响应式数据定义
const state = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    postId: undefined,
    status: undefined
  }
})

const { queryParams } = toRefs(state)

/**
 * 获取举报列表数据
 */
const getList = () => {
  loading.value = true
  listReport(queryParams.value).then((response) => {
    reportList.value = response.data.list
    total.value = response.data.total
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

/**
 * 搜索按钮点击操作
 */
const handleQuery = () => {
  queryParams.value.pageNum = 1
  getList()
}

/**
 * 重置查询表单
 */
const resetQuery = () => {
  proxy.resetForm('queryRef')
  handleQuery()
}

/**
 * 处理举报记录（标记为已处理）
 * @param {Object} row 举报行数据
 */
const handleProcess = (row) => {
  proxy.$modal.confirm('是否确认将此条举报记录标记为已处理？').then(() => {
    return handleReport({
      reportId: row.reportId,
      status: '1'
    })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('处理成功')
  }).catch(() => {})
}

/**
 * 查看帖子详情弹窗
 * @param {number} postId 帖子ID
 */
const handleViewPost = (postId) => {
  currentPost.value = null
  postDialogVisible.value = true
  postLoading.value = true
  
  // 直接利用已有的请求通道获取帖子详情
  request({
    url: `/forum/post/${postId}`,
    method: 'get'
  }).then((response) => {
    currentPost.value = response.data
    postLoading.value = false
  }).catch(() => {
    postLoading.value = false
  })
}

// 页面加载时执行查询
getList()
</script>

<style scoped>
.mb8 {
  margin-bottom: 8px;
}
.text-muted {
  color: #909399;
}
</style>
