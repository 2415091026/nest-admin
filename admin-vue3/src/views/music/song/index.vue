<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="100px">
      <el-form-item label="歌曲名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入歌曲名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="专辑名称" prop="albumName">
        <el-input
          v-model="queryParams.albumName"
          placeholder="请输入专辑名称"
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
          v-hasPermi="['music:song:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['music:song:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['music:song:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['music:song:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="songList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="歌曲名称" align="left" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="封面" align="center" prop="albumCover" width="110">
        <template #default="scope">
         <image-preview :src="scope.row.albumCover" :width="60" :height="60"/>
        </template>
      </el-table-column>
      <el-table-column label="专辑名称" align="center" prop="albumName" :show-overflow-tooltip="true" />
      <el-table-column label="关联专辑ID" align="center" prop="albumId" width="150" />
      <el-table-column label="网易云ID" align="center" prop="neteaseSongId" />
      <el-table-column label="试听" align="center" width="100">
        <template #default="scope">
          <button v-if="scope.row.audioUrl" class="audio-play-btn" @click="handlePlay(scope.row)">
            <el-icon :size="26" :class="{ 'is-playing': playingId === scope.row.songId && isPlaying }">
              <VideoPause v-if="playingId === scope.row.songId && isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['music:song:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['music:song:remove']">删除</el-button>
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

    <!-- 添加或修改歌曲对话框 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="songRef" :model="form" :rules="rules" label-width="110px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="歌曲名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入歌曲名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联专辑ID" prop="albumId">
              <el-input v-model="form.albumId" placeholder="请输入专辑ID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专辑名称" prop="albumName">
              <el-input v-model="form.albumName" placeholder="请输入专辑名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网易云歌曲ID" prop="neteaseSongId">
              <el-input v-model="form.neteaseSongId" placeholder="请输入网易云歌曲ID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="QQ音乐ID" prop="qqSongId">
              <el-input v-model="form.qqSongId" placeholder="请输入QQ音乐ID" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="专辑封面" prop="albumCover">
              <el-input v-model="form.albumCover" placeholder="请输入专辑封面URL" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="音频链接" prop="audioUrl">
              <el-input v-model="form.audioUrl" placeholder="请输入永久音频流直链" />
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

    <!-- 全局悬浮播放器 (UI-UX Pro Max: Dark Mode OLED) -->
    <div class="global-audio-player" v-if="playingSong">
      <audio
        ref="audioRef"
        :src="playingSong.audioUrl"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="onEnded"
        @error="onError"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      ></audio>
      
      <div class="player-left">
        <el-image
          v-if="playingSong.albumCover"
          :src="playingSong.albumCover"
          class="player-cover"
          fit="cover"
        >
          <template #error>
            <div class="cover-placeholder">
              <el-icon><Picture /></el-icon>
            </div>
          </template>
        </el-image>
        <div class="player-info">
          <div class="song-name">{{ playingSong.name }}</div>
          <div class="singer-name">{{ playingSong.albumName }}</div>
        </div>
      </div>
      
      <div class="player-center">
        <div class="player-controls">
          <el-icon class="control-icon" @click="togglePlay">
            <VideoPause v-if="isPlaying" />
            <VideoPlay v-else />
          </el-icon>
        </div>
        <div class="player-progress">
          <span class="time-text">{{ formatTime(currentTime) }}</span>
          <el-slider
            v-model="currentTime"
            :max="duration"
            :show-tooltip="false"
            @change="onSliderChange"
            class="progress-slider"
          />
          <span class="time-text">{{ formatTime(duration) }}</span>
        </div>
      </div>
      
      <div class="player-right">
        <el-icon class="close-icon" @click="closePlayer" title="关闭播放器">
          <Close />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup name="Song">
import { ref, reactive, toRefs, getCurrentInstance, nextTick } from 'vue';
import { listSong, getSong, delSong, addSong, updateSong } from '@/api/music/song';

const { proxy } = getCurrentInstance();

const songList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");

// 全局音频播放控制
const audioRef = ref(null);
const playingSong = ref(null);
const playingId = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);

const handlePlay = (row) => {
  if (playingId.value === row.songId) {
    togglePlay();
  } else {
    playingSong.value = row;
    playingId.value = row.songId;
    nextTick(() => {
      if (audioRef.value) {
        audioRef.value.play().catch(e => console.error('播放失败:', e));
      }
    });
  }
};

const togglePlay = () => {
  if (!audioRef.value) return;
  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play().catch(e => console.error('播放失败:', e));
  }
};

const onTimeUpdate = (e) => {
  currentTime.value = e.target.currentTime;
};

const onLoadedMetadata = (e) => {
  duration.value = e.target.duration;
};

const onSliderChange = (val) => {
  if (audioRef.value) {
    audioRef.value.currentTime = val;
  }
};

const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
};

const onError = () => {
  proxy.$modal.msgError("音频播放失败或链接失效");
  isPlaying.value = false;
};

const closePlayer = () => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
  playingSong.value = null;
  playingId.value = null;
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;
};

const formatTime = (time) => {
  if (!time || isNaN(time)) return '00:00';
  const m = Math.floor(time / 60).toString().padStart(2, '0');
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    albumName: undefined
  },
  rules: {
    name: [{ required: true, message: "歌曲名称不能为空", trigger: "blur" }],
    albumId: [{ required: true, message: "关联的专辑ID不能为空", trigger: "blur" }],
    albumName: [{ required: true, message: "专辑名称不能为空", trigger: "blur" }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询歌曲列表 */
const getList = () => {
  loading.value = true;
  listSong(queryParams.value).then(response => {
    songList.value = response.data.list;
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
    songId: undefined,
    name: undefined,
    albumId: undefined,
    albumName: undefined,
    albumCover: undefined,
    audioUrl: undefined,
    neteaseSongId: undefined,
    qqSongId: undefined
  };
  proxy.resetForm("songRef");
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
  ids.value = selection.map(item => item.songId);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  open.value = true;
  title.value = "添加歌曲";
};

/** 修改按钮操作 */
const handleUpdate = (row) => {
  reset();
  const id = row.songId || ids.value;
  getSong(id).then(response => {
    form.value = response.data;
    open.value = true;
    title.value = "修改歌曲";
  });
};

/** 提交按钮 */
const submitForm = () => {
  proxy.$refs["songRef"].validate(valid => {
    if (valid) {
      if (form.value.songId != null) {
        updateSong(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        });
      } else {
        addSong(form.value).then(response => {
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
  const songIds = row.songId || ids.value;
  proxy.$modal.confirm('是否确认删除歌曲ID为"' + songIds + '"的数据项？').then(() => {
    return delSong(songIds);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess("删除成功");
  }).catch(() => {});
};

/** 导出按钮操作 */
const handleExport = () => {
  proxy.download("music/song/export", {
    ...queryParams.value
  }, `song_${new Date().getTime()}.xlsx`);
};

getList();
</script>

<style lang="scss" scoped>
.audio-play-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #909399;
  transition: all 0.3s ease;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f4f4f5;
  border: none;
  outline: none;

  &:hover {
    color: #409eff;
    background: #ecf5ff;
    transform: scale(1.1);
  }

  .is-playing {
    color: #409eff;
    animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 全局播放器样式 (UI-UX Pro Max: Dark Mode OLED) */
.global-audio-player {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background-color: #0F0F23;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
  color: #F8FAFC;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease-in-out;
}

.player-left {
  display: flex;
  align-items: center;
  width: 300px;
}

.player-cover {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  margin-right: 15px;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  background-color: #1E1B4B;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cover-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #312E81;
  font-size: 20px;
}

.player-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.song-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  text-shadow: 0 0 10px rgba(248, 250, 252, 0.3); /* Minimal glow */
}

.singer-name {
  font-size: 12px;
  color: #94A3B8;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.player-center {
  flex: 1;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.player-controls {
  margin-bottom: -5px;
}

.control-icon {
  font-size: 36px;
  cursor: pointer;
  color: #F8FAFC;
  transition: all 0.2s;
  
  &:hover {
    color: #F97316; /* CTA Color */
    transform: scale(1.1);
  }
}

.player-progress {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 15px;
}

.time-text {
  font-size: 12px;
  color: #94A3B8;
  min-width: 40px;
  text-align: center;
}

:deep(.progress-slider) {
  flex: 1;
  .el-slider__runway {
    background-color: rgba(255, 255, 255, 0.1);
    height: 4px;
  }
  .el-slider__bar {
    background-color: #F97316;
  }
  .el-slider__button {
    border: 2px solid #F97316;
    background-color: #0F0F23;
    width: 12px;
    height: 12px;
  }
}

.player-right {
  width: 300px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.close-icon {
  font-size: 20px;
  cursor: pointer;
  color: #94A3B8;
  transition: color 0.2s;
  &:hover {
    color: #F8FAFC;
  }
}
</style>
