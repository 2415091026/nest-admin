<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="帖子标题" prop="title">
        <el-input
          v-model="queryParams.title"
          placeholder="请输入帖子标题"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="所属板块" prop="categoryId">
        <el-select v-model="queryParams.categoryId" placeholder="全部板块" clearable style="width: 200px">
          <el-option
            v-for="item in categoryOptions"
            :key="item.categoryId"
            :label="item.name"
            :value="item.categoryId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="是否置顶" prop="isTop">
        <el-select v-model="queryParams.isTop" placeholder="是否置顶" clearable style="width: 200px">
          <el-option label="否" value="0" />
          <el-option label="是" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否精华" prop="isEssence">
        <el-select v-model="queryParams.isEssence" placeholder="是否精华" clearable style="width: 200px">
          <el-option label="否" value="0" />
          <el-option label="是" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="帖子状态" clearable style="width: 200px">
          <el-option
            v-for="dict in sys_normal_disable"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="审核状态" prop="auditStatus">
        <el-select v-model="queryParams.auditStatus" placeholder="审核状态" clearable style="width: 200px">
          <el-option label="正常" value="0" />
          <el-option label="已下架" value="1" />
          <el-option label="申诉中" value="2" />
          <el-option label="申诉驳回" value="3" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['forum:post:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['forum:post:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['forum:post:remove']"
        >删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="postList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="帖子ID" align="center" prop="postId" width="80" />
      <el-table-column label="标题" align="left" prop="title" :show-overflow-tooltip="true" />
      <el-table-column label="所属板块" align="center" width="120">
        <template #default="scope">
          <span>{{ getCategoryName(scope.row.categoryId) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="作者" align="center" width="120">
        <template #default="scope">
          <span>{{ scope.row.user?.nickName || scope.row.user?.userName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="数据指标" align="center" width="220">
        <template #default="scope">
          <span style="margin-right: 10px;">👁️ {{ scope.row.viewCount }}</span>
          <span style="margin-right: 10px;">👍 {{ scope.row.likeCount }}</span>
          <span style="margin-right: 10px;">⭐ {{ scope.row.collectCount }}</span>
          <span>💬 {{ scope.row.replyCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="置顶" align="center" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.isTop === '1' ? 'danger' : 'info'">
            {{ scope.row.isTop === '1' ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="精华" align="center" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.isEssence === '1' ? 'warning' : 'info'">
            {{ scope.row.isEssence === '1' ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="80">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="审核状态" align="center" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.auditStatus === '0'" type="success">正常</el-tag>
          <el-tag v-else-if="scope.row.auditStatus === '1'" type="danger">已下架</el-tag>
          <el-tag v-else-if="scope.row.auditStatus === '2'" type="warning" style="cursor: pointer;" @click="handleOpenAppealDialog(scope.row)">申诉中</el-tag>
          <el-tag v-else-if="scope.row.auditStatus === '3'" type="info">申诉驳回</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="发帖时间" align="center" prop="createTime" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="ChatLineRound" @click="handleViewReplies(scope.row)">回帖</el-button>
          <el-button link type="warning" icon="Checked" v-if="scope.row.auditStatus === '2'" @click="handleOpenAppealDialog(scope.row)" v-hasPermi="['forum:post:appeal:handle']">申诉复核</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['forum:post:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['forum:post:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加或修改帖子对话框 -->
    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form ref="postRef" :model="form" :rules="rules" label-width="90px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="帖子标题" prop="title">
              <el-input v-model="form.title" placeholder="请输入帖子标题" maxlength="150" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属板块" prop="categoryId">
              <el-select v-model="form.categoryId" placeholder="请选择所属分类/板块" style="width: 100%;">
                <el-option
                  v-for="item in categoryOptions"
                  :key="item.categoryId"
                  :label="item.name"
                  :value="item.categoryId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio
                  v-for="dict in sys_normal_disable"
                  :key="dict.value"
                  :label="dict.value"
                >{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否置顶" prop="isTop">
              <el-radio-group v-model="form.isTop">
                <el-radio label="0">否</el-radio>
                <el-radio label="1">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否精华" prop="isEssence">
              <el-radio-group v-model="form.isEssence">
                <el-radio label="0">否</el-radio>
                <el-radio label="1">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="正文内容" prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="8"
                placeholder="请输入帖子正文内容..."
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 申诉复核对话框 -->
    <el-dialog title="帖子申诉复核" v-model="appealOpen" width="500px" append-to-body>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="帖子标题">{{ currentAppealRow.title }}</el-descriptions-item>
        <el-descriptions-item label="发帖人">{{ currentAppealRow.user?.nickName || currentAppealRow.user?.userName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申诉时间">{{ parseTime(currentAppealRow.appealTime) }}</el-descriptions-item>
        <el-descriptions-item label="申诉理由">
          <div style="white-space: pre-wrap; word-break: break-all;">{{ currentAppealRow.appealReason || '未填写理由' }}</div>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="success" icon="Check" @click="submitAppealHandle('0')">同意申诉并恢复上架</el-button>
          <el-button type="danger" icon="Close" @click="submitAppealHandle('3')">驳回申诉并永久下架</el-button>
          <el-button @click="appealOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ForumPost">
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { listPost, getPost, addPost, updatePost, delPost, handleAppeal } from "@/api/forum/post";
import { listCategory } from "@/api/forum/category";

const router = useRouter();
const { proxy } = getCurrentInstance();
const { sys_normal_disable } = proxy.useDict("sys_normal_disable");

const postList = ref([]);
const categoryOptions = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");
const appealOpen = ref(false);
const currentAppealRow = ref({});

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    title: undefined,
    categoryId: undefined,
    isTop: undefined,
    isEssence: undefined,
    status: undefined,
    auditStatus: undefined
  },
  rules: {
    title: [{ required: true, message: "帖子标题不能为空", trigger: "blur" }],
    categoryId: [{ required: true, message: "所属板块分类不能为空", trigger: "change" }],
    content: [{ required: true, message: "正文内容不能为空", trigger: "blur" }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询帖子列表 */
const getList = () => {
  loading.value = true;
  listPost(queryParams.value).then(response => {
    postList.value = response.data.list;
    total.value = response.data.total;
    loading.value = false;
  }).catch(() => {
    loading.value = false;
  });
};

/** 查询板块分类选项 */
const getCategoryOptions = () => {
  listCategory({ pageNum: 1, pageSize: 100, status: "0" }).then(response => {
    categoryOptions.value = response.data.list;
  });
};

/** 解析分类板块名称 */
const getCategoryName = (categoryId) => {
  const item = categoryOptions.value.find(opt => opt.categoryId === categoryId);
  return item ? item.name : `板块 (ID: ${categoryId})`;
};

/** 取消按钮 */
const cancel = () => {
  open.value = false;
  reset();
};

/** 表单重置 */
const reset = () => {
  form.value = {
    postId: undefined,
    title: undefined,
    categoryId: undefined,
    content: undefined,
    isTop: "0",
    isEssence: "0",
    status: "0"
  };
  proxy.resetForm("postRef");
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  proxy.resetForm("queryRef");
  handleQuery();
};

/** 多选框选中数据 */
const handleSelectionChange = (selection) => {
  ids.value = selection.map(item => item.postId);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  open.value = true;
  title.value = "发布新帖子";
};

/** 修改按钮操作 */
const handleUpdate = (row) => {
  reset();
  const postId = row.postId || ids.value[0];
  getPost(postId).then(response => {
    form.value = response.data;
    open.value = true;
    title.value = "修改帖子";
  });
};

/** 跳转至回帖管理查看回复 */
const handleViewReplies = (row) => {
  router.push({
    path: '/forum/comment',
    query: { postId: row.postId }
  });
};

/** 提交表单 */
const submitForm = () => {
  proxy.$refs["postRef"].validate(valid => {
    if (valid) {
      if (form.value.postId !== undefined) {
        updatePost(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        });
      } else {
        addPost(form.value).then(response => {
          proxy.$modal.msgSuccess("发布成功");
          open.value = false;
          getList();
        });
      }
    }
  });
};

/** 删除按钮操作 */
const handleDelete = (row) => {
  const postIds = row.postId || ids.value;
  proxy.$modal.confirm('是否确认删除帖子编号为"' + postIds + '"的数据项？').then(() => {
    return delPost(postIds);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess("删除成功");
  }).catch(() => {});
};

/** 打开申诉复核弹窗 */
const handleOpenAppealDialog = (row) => {
  currentAppealRow.value = row;
  appealOpen.value = true;
};

/** 提交申诉复核处理 */
const submitAppealHandle = (status) => {
  const actionText = status === '0' ? '同意申诉并恢复上架' : '驳回申诉并永久下架';
  proxy.$modal.confirm(`是否确认对该帖子执行："${actionText}"？`).then(() => {
    return handleAppeal({
      postId: currentAppealRow.value.postId,
      status: status
    });
  }).then(() => {
    appealOpen.value = false;
    getList();
    proxy.$modal.msgSuccess("申诉处理成功");
  }).catch(() => {});
};

onMounted(() => {
  getCategoryOptions();
  getList();
});
</script>

<style scoped>
.mb8 {
  margin-bottom: 8px;
}
</style>
