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
      <el-table-column label="操作" width="220" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Notebook" @click="showLyricDialog(scope.row)">歌词</el-button>
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
        <button 
          class="lyric-toggle-btn" 
          :class="{ 'active': lyricVisible }" 
          @click="showLyricDialog(playingSong)" 
          title="查看歌词"
        >词</button>
        <el-icon class="close-icon" @click="closePlayer" title="关闭播放器">
          <Close />
        </el-icon>
      </div>
    </div>

    <!-- QQ音乐风格全屏歌词弹层 -->
    <transition name="slide-up">
      <div class="lyric-overlay" v-if="lyricVisible && lyricSong">
        <!-- 高斯模糊的背景图 -->
        <div 
          class="lyric-bg-blur" 
          :style="{ backgroundImage: `url(${lyricSong.albumCover || ''})` }"
        ></div>
        
        <!-- 头部导航栏 -->
        <div class="lyric-header">
          <div class="header-left">
            <span class="song-title">{{ lyricSong.name }}</span>
            <span class="album-desc">专辑：{{ lyricSong.albumName }}</span>
          </div>
          <div class="header-right">
            <el-icon class="close-overlay-icon" @click="lyricVisible = false"><Close /></el-icon>
          </div>
        </div>

        <!-- 主体区域：左CD，右歌词 -->
        <div class="lyric-body">
          <!-- 左侧：唱片区域 -->
          <div class="cd-container">
            <!-- 唱针 -->
            <div class="cd-needle" :class="{ 'playing': playingId === lyricSong.songId && isPlaying }">
              <svg viewBox="0 0 100 150" width="100%" height="100%">
                <path d="M50 0 L50 20 L25 80 L35 120" stroke="#cccccc" stroke-width="4" fill="none" />
                <circle cx="50" cy="5" r="5" fill="#666666" />
                <rect x="30" y="115" width="10" height="20" rx="3" fill="#999999" transform="rotate(-15, 35, 125)" />
              </svg>
            </div>
            <!-- 黑胶唱片 -->
            <div class="cd-vinyl" :class="{ 'playing': playingId === lyricSong.songId && isPlaying }">
              <img :src="lyricSong.albumCover" class="cd-cover" v-if="lyricSong.albumCover" />
              <div class="cd-cover-placeholder" v-else>
                <el-icon><Picture /></el-icon>
              </div>
            </div>
          </div>

          <!-- 右侧：歌词滚动区域 -->
          <div class="lyric-content-panel">
            <div class="lyric-scroll-wrapper" ref="lyricListRef">
              <div class="lyric-lines-container">
                <template v-if="parsedLyrics.length > 0">
                  <div 
                    v-for="(line, index) in parsedLyrics" 
                    :key="index"
                    class="lyric-line"
                    :class="{ 'active': currentLyricIndex === index }"
                  >
                    {{ line.text }}
                  </div>
                </template>
                <div v-else class="no-lyric">
                  暂无歌词
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部控制栏（只有在当前打开的歌词不是当前播放的歌，或未播放时显示，方便一键播放） -->
        <div class="lyric-footer-controls" v-if="playingId !== lyricSong.songId || !isPlaying">
          <button class="lyric-play-btn" @click="handlePlay(lyricSong)">
            <el-icon><VideoPlay /></el-icon>
            <span>立即试听</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup name="Song">
import { ref, reactive, toRefs, getCurrentInstance, nextTick, computed, watch } from 'vue';
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

// 歌词显示相关响应式状态
const lyricVisible = ref(false);
const lyricSong = ref(null);
const parsedLyrics = ref([]);
const lyricListRef = ref(null);

// 解析网易云LRC歌词格式 [mm:ss.xx] 到 [{ time: s, text: '...' }]
const parseLyric = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result = [];
  const pattern = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
  
  for (const line of lines) {
    const match = pattern.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result;
};

// 激活并渲染歌词对话框
const showLyricDialog = (row) => {
  if (!row) return;
  lyricSong.value = row;
  parsedLyrics.value = parseLyric(row.lyrics);
  lyricVisible.value = true;
  nextTick(() => {
    scrollToCurrentLyric(true);
  });
};

// 计算当前播放进度在歌词数组中的激活行索引
const currentLyricIndex = computed(() => {
  if (!playingSong.value || playingSong.value.songId !== lyricSong.value?.songId) {
    return -1;
  }
  if (parsedLyrics.value.length === 0) return -1;
  const time = currentTime.value;
  
  for (let i = 0; i < parsedLyrics.value.length; i++) {
    if (time < parsedLyrics.value[i].time) {
      return i - 1 >= 0 ? i - 1 : 0;
    }
  }
  return parsedLyrics.value.length - 1;
});

// 平滑滚动至当前歌词行并使之居中
const scrollToCurrentLyric = (immediate = false) => {
  if (!lyricListRef.value) return;
  const container = lyricListRef.value;
  const activeEl = container.querySelector('.lyric-line.active');
  if (activeEl) {
    const containerHeight = container.clientHeight;
    const activeOffsetTop = activeEl.offsetTop;
    const activeHeight = activeEl.clientHeight;
    const targetScrollTop = activeOffsetTop - (containerHeight / 2) + (activeHeight / 2);
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: immediate ? 'auto' : 'smooth'
    });
  }
};

// 监听当前激活行变化触发滚动
watch(currentLyricIndex, (newIdx) => {
  if (newIdx !== -1) {
    scrollToCurrentLyric();
  }
});

// 监听播放歌曲的切换，若弹窗打开则联动切换歌词
watch(playingSong, (newSong) => {
  if (lyricVisible.value && newSong) {
    lyricSong.value = newSong;
    parsedLyrics.value = parseLyric(newSong.lyrics);
    nextTick(() => {
      scrollToCurrentLyric(true);
    });
  }
});

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

/* 词字播放栏控制按钮 */
.lyric-toggle-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: transparent;
  color: #94A3B8;
  font-size: 13px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  margin-right: 20px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  
  &:hover {
    color: #F8FAFC;
    border-color: #F8FAFC;
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  &.active {
    color: #0F0F23;
    background-color: #10B981;
    border-color: #10B981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
  }
}

/* 歌词弹层展开动画 (自底向上滑动且渐显) */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 歌词全景覆盖层 */
.lyric-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2050;
  background-color: #0c0c16;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #F8FAFC;
  box-sizing: border-box;
}

.lyric-bg-blur {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 120%;
  height: 120%;
  background-size: cover;
  background-position: center;
  filter: blur(55px) brightness(0.25);
  z-index: -1;
  transform: scale(1.1);
}

/* 头部样式 */
.lyric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 40px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
  
  .header-left {
    display: flex;
    flex-direction: column;
    gap: 5px;
    
    .song-title {
      font-size: 24px;
      font-weight: bold;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }
    
    .album-desc {
      font-size: 14px;
      color: #94A3B8;
    }
  }
  
  .close-overlay-icon {
    font-size: 28px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.3s ease;
    
    &:hover {
      color: #F8FAFC;
      transform: rotate(90deg);
    }
  }
}

/* 主体样式 */
.lyric-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 40px;
  overflow: hidden;
}

/* CD 旋转唱盘区 */
.cd-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  height: 100%;
  max-width: 50%;
}

.cd-needle {
  position: absolute;
  top: 5%;
  left: calc(50% - 10px);
  width: 90px;
  height: 130px;
  z-index: 10;
  transform-origin: 50px 5px;
  transform: rotate(-28deg);
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  pointer-events: none;
  
  &.playing {
    transform: rotate(0deg);
  }
}

.cd-vinyl {
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, #222 12%, #111 50%, #000 100%);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 
              inset 0 0 1px 1px rgba(255, 255, 255, 0.1),
              0 0 0 12px rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: rotate-cd 24s linear infinite;
  animation-play-state: paused;
  border: 4px solid #181818;
  
  &.playing {
    animation-play-state: running;
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.4) 40%, transparent 60%);
    pointer-events: none;
  }
  
  .cd-cover {
    width: 190px;
    height: 190px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #000;
    z-index: 1;
  }

  .cd-cover-placeholder {
    width: 190px;
    height: 190px;
    border-radius: 50%;
    background-color: #1E1B4B;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 48px;
    color: #312E81;
    z-index: 1;
  }
}

@keyframes rotate-cd {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 歌词容器及虚化淡出 */
.lyric-content-panel {
  flex: 1;
  max-width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding-right: 40px;
}

.lyric-scroll-wrapper {
  width: 100%;
  height: 70vh;
  overflow-y: auto;
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 1) 15%,
    rgba(0, 0, 0, 1) 85%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 1) 15%,
    rgba(0, 0, 0, 1) 85%,
    transparent 100%
  );
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.lyric-lines-container {
  padding: 35vh 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lyric-line {
  min-height: 40px;
  line-height: 1.5;
  padding: 5px 20px;
  text-align: center;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.45);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  user-select: none;
  
  &.active {
    color: #10B981;
    font-size: 22px;
    font-weight: 700;
    text-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
    transform: scale(1.05);
  }
}

.no-lyric {
  text-align: center;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.4);
  padding: 40px 0;
}

/* 底部试听控制器 */
.lyric-footer-controls {
  display: flex;
  justify-content: center;
  padding: 30px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent);
  
  .lyric-play-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background-color: #10B981;
    color: #0c0c16;
    font-weight: 600;
    border: none;
    padding: 12px 28px;
    border-radius: 24px;
    cursor: pointer;
    font-size: 15px;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    transition: all 0.2s ease;
    outline: none;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    .el-icon {
      font-size: 18px;
    }
  }
}
</style>
