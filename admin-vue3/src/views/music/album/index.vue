<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="100px">
      <el-form-item label="专辑名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入专辑名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="歌手名称" prop="artistName">
        <el-input
          v-model="queryParams.artistName"
          placeholder="请输入歌手名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="网易云专辑ID" prop="neteaseAlbumId">
        <el-input
          v-model="queryParams.neteaseAlbumId"
          placeholder="请输入网易云专辑ID"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
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
          v-hasPermi="['music:album:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['music:album:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['music:album:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['music:album:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="albumList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="专辑名称" align="left" prop="name" :show-overflow-tooltip="true" />

      <el-table-column label="封面" align="center" prop="picUrl" width="110">
        <template #default="scope">
          <image-preview :src="scope.row.picUrl" :width="60" :height="60"/>
        </template>
      </el-table-column>
      <el-table-column label="歌手名称" align="center" prop="artistName" />
      <el-table-column label="网易云专辑ID" align="center" prop="neteaseAlbumId" />
      <el-table-column label="发行公司" align="center" prop="company" :show-overflow-tooltip="true" />
      <el-table-column label="包含歌曲数" align="center" prop="size" width="100" />
      <el-table-column label="发行日期" align="center" prop="publishTime" width="120">
      
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['music:album:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['music:album:remove']">删除</el-button>
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

    <!-- 添加或修改专辑对话框 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="albumRef" :model="form" :rules="rules" label-width="110px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="专辑名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入专辑名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="歌手名称" prop="artistName">
              <el-input v-model="form.artistName" placeholder="请输入歌手名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="歌手ID" prop="artistId">
              <el-input v-model="form.artistId" placeholder="请输入歌手ID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网易云专辑ID" prop="neteaseAlbumId">
              <el-input v-model="form.neteaseAlbumId" placeholder="请输入网易云专辑ID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发行公司" prop="company">
              <el-input v-model="form.company" placeholder="请输入发行公司" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专辑类型" prop="type">
              <el-input v-model="form.type" placeholder="如：专辑、EP" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专辑子类型" prop="subType">
              <el-input v-model="form.subType" placeholder="如：录音室版" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发行日期" prop="publishTime">
              <el-date-picker clearable
                v-model="form.publishTime"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择发行日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="包含歌曲数量" prop="size">
              <el-input-number v-model="form.size" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="封面URL" prop="picUrl">
              <el-input v-model="form.picUrl" placeholder="请输入封面图片链接" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="简短描述" prop="briefDesc">
              <el-input v-model="form.briefDesc" type="textarea" placeholder="请输入简短描述" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="详细介绍" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入详细介绍" />
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
  </div>
</template>

<script setup name="Album">
import { ref, reactive, toRefs, getCurrentInstance } from 'vue';
import { listAlbum, getAlbum, delAlbum, addAlbum, updateAlbum } from '@/api/music/album';

const { proxy } = getCurrentInstance();

const albumList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    artistName: undefined,
    neteaseAlbumId: undefined
  },
  rules: {
    name: [{ required: true, message: "专辑名称不能为空", trigger: "blur" }],
    artistId: [{ required: true, message: "歌手ID不能为空", trigger: "blur" }],
    artistName: [{ required: true, message: "歌手名称不能为空", trigger: "blur" }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询专辑列表 */
const getList = () => {
  loading.value = true;
  listAlbum(queryParams.value).then(response => {
    albumList.value = response.data.list;
    total.value = response.data.total;
    loading.value = false;
  });
};

/** 取消按钮 */
const cancel = () => {
  open.value = false;
  reset();
};

/** 表单重置 */
const reset = () => {
  form.value = {
    albumId: undefined,
    name: undefined,
    artistId: undefined,
    artistName: undefined,
    neteaseAlbumId: undefined,
    picUrl: undefined,
    company: undefined,
    publishTime: undefined,
    type: undefined,
    subType: undefined,
    size: 0,
    briefDesc: undefined,
    description: undefined
  };
  proxy.resetForm("albumRef");
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
  ids.value = selection.map(item => item.albumId);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  open.value = true;
  title.value = "添加专辑";
};

/** 修改按钮操作 */
const handleUpdate = (row) => {
  reset();
  const id = row.albumId || ids.value;
  getAlbum(id).then(response => {
    form.value = response.data;
    open.value = true;
    title.value = "修改专辑";
  });
};

/** 提交按钮 */
const submitForm = () => {
  proxy.$refs["albumRef"].validate(valid => {
    if (valid) {
      if (form.value.albumId != null) {
        updateAlbum(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        });
      } else {
        addAlbum(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功");
          open.value = false;
          getList();
        });
      }
    }
  });
};

/** 删除按钮操作 */
const handleDelete = (row) => {
  const albumIds = row.albumId || ids.value;
  proxy.$modal.confirm('是否确认删除专辑ID为"' + albumIds + '"的数据项？').then(() => {
    return delAlbum(albumIds);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess("删除成功");
  }).catch(() => {});
};

/** 导出按钮操作 */
const handleExport = () => {
  proxy.download("music/album/export", {
    ...queryParams.value
  }, `album_${new Date().getTime()}.xlsx`);
};

getList();
</script>
