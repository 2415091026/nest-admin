<template>
  <div class="app-container message-send-container">
    <div class="header-banner">
      <div class="banner-content">
        <el-icon class="banner-icon"><Promotion /></el-icon>
        <div class="banner-text">
          <h2>系统消息发布中心</h2>
          <p>在此向全体在线及离线用户广播系统通知，支持多终端 WebSocket 零延迟同步下发</p>
        </div>
      </div>
      <!-- 柔和浅色发光装饰背景 -->
      <div class="banner-glow-orb"></div>
    </div>

    <el-row :gutter="24" class="layout-row">
      <!-- 左栏：消息发送表单 -->
      <el-col :xs="24" :sm="24" :md="11" :lg="10" class="layout-col">
        <div class="card-glass-panel send-form-card">
          <div class="card-header">
            <el-icon class="header-icon"><Message /></el-icon>
            <h3>新建系统广播消息</h3>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            class="custom-form"
          >
            <el-form-item label="消息标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入极简且具备吸引力的标题"
                maxlength="100"
                show-word-limit
                class="custom-input"
              />
            </el-form-item>

            <el-form-item label="消息类型" prop="messageType">
              <div class="type-selector-grid">
                <div
                  v-for="item in messageTypes"
                  :key="item.value"
                  class="type-card"
                  :class="[item.colorClass, { active: form.messageType === item.value }]"
                  @click="form.messageType = item.value"
                >
                  <div class="type-card-glow"></div>
                  <el-icon class="type-icon">
                    <component :is="item.icon" />
                  </el-icon>
                  <span class="type-label">{{ item.label }}</span>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="消息正文内容" prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="6"
                placeholder="请输入要向全网广播的消息内容，支持 HTML 或文本形式..."
                class="custom-textarea"
              />
            </el-form-item>

            <el-form-item class="form-actions">
              <!-- 发送按钮：采用高逼格的科技感系统蓝色 -->
              <el-button
                type="primary"
                class="send-btn"
                :loading="submitting"
                @click="submitMessage"
              >
                <template #loading>
                  <span class="spinner-loader"></span>
                </template>
                <el-icon v-if="!submitting" class="mr-2"><Position /></el-icon>
                <span>立即全网广播推送</span>
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-col>

      <!-- 右栏：已发历史列表 -->
      <el-col :xs="24" :sm="24" :md="13" :lg="14" class="layout-col">
        <div class="card-glass-panel list-card">
          <div class="card-header list-header">
            <div class="header-left">
              <el-icon class="header-icon"><Collection /></el-icon>
              <h3>历史广播推送记录</h3>
            </div>
            <el-button
              link
              type="primary"
              icon="Refresh"
              class="refresh-btn"
              @click="fetchHistory"
            >
              刷新记录
            </el-button>
          </div>

          <div v-loading="loading" class="history-list-wrapper">
            <div v-if="historyList.length > 0" class="history-stack">
              <div
                v-for="msg in historyList"
                :key="msg.messageId"
                class="history-item-card"
              >
                <!-- 亮色发光大类图标 -->
                <div class="msg-icon-orb" :class="getTypeConfig(msg.messageType).colorClass">
                  <el-icon :size="18">
                    <component :is="getTypeConfig(msg.messageType).icon" />
                  </el-icon>
                </div>

                <div class="msg-content-body">
                  <div class="msg-card-header">
                    <div class="msg-meta-left">
                      <span class="badge-tag" :class="getTypeConfig(msg.messageType).colorClass">
                        {{ getTypeConfig(msg.messageType).label }}
                      </span>
                      <strong class="msg-title">{{ msg.title }}</strong>
                    </div>
                    <span class="msg-time">{{ formatTime(msg.createTime) }}</span>
                  </div>
                  <p class="msg-detail">{{ msg.content }}</p>
                  <div class="msg-footer">
                    <span class="sender-info">
                      <el-icon class="mr-1"><User /></el-icon>
                      发布账号 ID: {{ msg.senderId || '系统' }}
                    </span>
                    <!-- 绿光在线状态指示器 -->
                    <span class="status-indicator">
                      <span class="blink-dot"></span>
                      已全网送达
                    </span>
                  </div>
                </div>
              </div>

              <!-- 分页器 -->
              <div class="pagination-area">
                <el-pagination
                  v-model:current-page="queryParams.pageNum"
                  v-model:page-size="queryParams.pageSize"
                  :total="total"
                  layout="prev, pager, next"
                  background
                  @current-change="fetchHistory"
                  class="custom-pagination"
                />
              </div>
            </div>

            <!-- 缺省提示 -->
            <div v-else class="empty-placeholder">
              <el-icon class="empty-icon"><Memo /></el-icon>
              <p>暂无历史广播推送记录</p>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="SystemMessageSend">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Promotion,
  Message,
  Collection,
  Position,
  Bell,
  ChatDotSquare,
  Present,
  User,
  Memo
} from '@element-plus/icons-vue';
import { sendSystemMessage, listSystemMessages } from '@/api/system/message';

// 消息大类选择配置项
const messageTypes = [
  { value: '1', label: '系统通知', icon: Bell, colorClass: 'type-system' },
  { value: '2', label: '社交互动', icon: ChatDotSquare, colorClass: 'type-social' },
  { value: '3', label: '业务提醒', icon: Present, colorClass: 'type-biz' }
];

const formRef = ref(null);
const submitting = ref(false);
const loading = ref(false);
const historyList = ref([]);
const total = ref(0);

const form = reactive({
  title: '',
  messageType: '1',
  content: ''
});

const queryParams = reactive({
  pageNum: 1,
  pageSize: 5,
  messageType: undefined,
  readStatus: undefined
});

const rules = {
  title: [
    { required: true, message: '请输入消息标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符之间', trigger: 'blur' }
  ],
  messageType: [
    { required: true, message: '请选择消息大类', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入广播消息内容', trigger: 'blur' }
  ]
};

// 获取已发送的群发广播消息列表
const fetchHistory = async () => {
  loading.value = true;
  try {
    const res = await listSystemMessages(queryParams);
    if (res.code === 200 || res.data) {
      const data = res.data || res;
      // 过滤出全员群发的消息
      historyList.value = (data.list || []).filter(msg => msg.receiverType === '0');
      total.value = historyList.value.length; // 由于是前端本地过滤展示，简化处理
    }
  } catch (err) {
    console.error('获取广播历史失败：', err);
  } finally {
    loading.value = false;
  }
};

// 提交发送消息
const submitMessage = () => {
  if (!formRef.value) return;
  formRef.value.validate(async (valid) => {
    if (valid) {
      ElMessageBox.confirm(
        '您正在向全网用户广播一条系统消息，发布后将无法撤回，且所有在线用户将同步收到弹窗通知。确认发布？',
        '重要操作确认',
        {
          confirmButtonText: '确认全网推送',
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'custom-message-box'
        }
      ).then(async () => {
        submitting.value = true;
        try {
          const res = await sendSystemMessage(form);
          if (res.code === 200 || res.msg === 'success' || !res.code) {
            ElMessage.success('全网广播推送成功！WebSocket 实时下发已完成。');
            form.title = '';
            form.content = '';
            form.messageType = '1';
            fetchHistory();
          }
        } catch (err) {
          console.error('发送失败：', err);
          ElMessage.error(err.message || '广播推送失败，请稍后重试');
        } finally {
          submitting.value = false;
        }
      }).catch(() => {});
    }
  });
};

// 工具：动态获取消息大类的配置
const getTypeConfig = (type) => {
  return messageTypes.find(t => t.value === type) || {
    label: '广播通知',
    icon: Bell,
    colorClass: 'type-system'
  };
};

// 工具：友好化时间展示
const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  try {
    const date = new Date(timeStr.replace(/-/g, '/'));
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return timeStr;
  }
};

onMounted(() => {
  fetchHistory();
});
</script>

<style scoped>
/* 主容器设计，采用与原有若依框架契合的轻量亮色质感 */
.message-send-container {
  min-height: calc(100vh - 84px);
  background-color: #f8fafc;
  color: #1e293b;
  font-family: 'Fira Sans', 'PingFang SC', sans-serif;
  padding: 16px;
}

/* 头部 Banner 卡片：高保真科技感蓝白渐变 */
.header-banner {
  position: relative;
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px 28px;
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.banner-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
}

.banner-icon {
  font-size: 32px;
  color: #007aff;
  filter: drop-shadow(0 4px 10px rgba(0, 122, 255, 0.2));
  animation: float-icon 4s ease-in-out infinite;
}

.banner-text h2 {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: #0f172a;
}

.banner-text p {
  font-size: 13px;
  margin: 0;
  color: #64748b;
  font-weight: 500;
}

/* 浅色微光背景装饰 */
.banner-glow-orb {
  position: absolute;
  right: -40px;
  top: -40px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(0, 122, 255, 0.06) 0%, rgba(0, 122, 255, 0) 70%);
  filter: blur(15px);
  pointer-events: none;
  z-index: 1;
}

@keyframes float-icon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.layout-row {
  margin-bottom: 24px;
}

/* 亮色高级磨砂玻璃拟态面板 (Glassmorphism Light) */
.card-glass-panel {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.card-glass-panel:hover {
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 14px;
}

.header-icon {
  font-size: 18px;
  color: #007aff;
}

.card-header h3 {
  font-size: 15px;
  font-weight: 800;
  margin: 0;
  color: #0f172a;
}

/* 亮色模式表单设计 */
:deep(.el-form-item__label) {
  color: #475569 !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  padding-bottom: 6px !important;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background-color: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  box-shadow: none !important;
  border-radius: 10px !important;
  padding: 8px 12px !important;
  transition: all 0.2s ease !important;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  border-color: #94a3b8 !important;
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  border-color: #007aff !important;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12) !important;
}

:deep(.el-input__inner) {
  color: #0f172a !important;
  font-weight: 500 !important;
}

:deep(.el-textarea__inner) {
  color: #0f172a !important;
  font-weight: 500 !important;
  line-height: 1.5 !important;
}

/* 消息类型选择器：高透气感卡片样式 */
.type-selector-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.type-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 10px;
  border-radius: 12px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.25s ease;
}

.type-card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 30%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.type-icon {
  font-size: 20px;
  color: #64748b;
  transition: transform 0.25s ease, color 0.25s ease;
}

.type-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  transition: color 0.25s ease;
}

.type-card:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.type-card:hover .type-icon {
  transform: translateY(-1px);
}

/* 各类型激活样式：柔和发光 */
.type-system.active {
  border-color: #3b82f6 !important;
  background: rgba(59, 130, 246, 0.05) !important;
}
.type-system.active .type-icon,
.type-system.active .type-label {
  color: #1d4ed8 !important;
}
.type-system.active .type-card-glow {
  background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
  opacity: 1;
}

.type-social.active {
  border-color: #ec4899 !important;
  background: rgba(236, 72, 153, 0.05) !important;
}
.type-social.active .type-icon,
.type-social.active .type-label {
  color: #be185d !important;
}
.type-social.active .type-card-glow {
  background: radial-gradient(circle at center, rgba(236, 72, 153, 0.1) 0%, transparent 70%);
  opacity: 1;
}

.type-biz.active {
  border-color: #f97316 !important;
  background: rgba(249, 115, 22, 0.05) !important;
}
.type-biz.active .type-icon,
.type-biz.active .type-label {
  color: #c2410c !important;
}
.type-biz.active .type-card-glow {
  background: radial-gradient(circle at center, rgba(249, 115, 22, 0.1) 0%, transparent 70%);
  opacity: 1;
}

/* 发送按钮：系统靛蓝色调 */
.form-actions {
  margin-top: 24px;
  margin-bottom: 0 !important;
}

.send-btn {
  width: 100% !important;
  height: 44px !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
  font-size: 14px !important;
  letter-spacing: 0.5px !important;
  background: linear-gradient(135deg, #007aff 0%, #0051c5 100%) !important;
  border: none !important;
  color: #ffffff !important;
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
  cursor: pointer;
  transition: all 0.25s ease !important;
}

.send-btn:hover {
  background: linear-gradient(135deg, #2f93ff 0%, #0047af 100%) !important;
  box-shadow: 0 6px 20px rgba(0, 122, 255, 0.35) !important;
  transform: translateY(-0.5px);
}

/* 右侧列表头部与按钮 */
.list-header {
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-btn {
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #007aff !important;
}

.refresh-btn:hover {
  color: #2f93ff !important;
}

.history-list-wrapper {
  min-height: 400px;
}

.history-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 历史广播卡片：轻透白底微描边 */
.history-item-card {
  display: flex;
  gap: 16px;
  padding: 18px;
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid #e2e8f0;
  transition: all 0.25s ease;
}

.history-item-card:hover {
  background-color: rgba(255, 255, 255, 0.95);
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
}

.msg-icon-orb {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.03);
}

/* 亮色图标底圈 */
.msg-icon-orb.type-system {
  background-color: #eff6ff;
  color: #2563eb;
}
.msg-icon-orb.type-social {
  background-color: #fdf2f8;
  color: #db2777;
}
.msg-icon-orb.type-biz {
  background-color: #fff7ed;
  color: #ea580c;
}

.msg-content-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.msg-meta-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 胶囊状类型标签 */
.badge-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 20px;
  border: 1px solid currentColor;
}

.badge-tag.type-system {
  color: #2563eb;
  background-color: rgba(37, 99, 235, 0.06);
}
.badge-tag.type-social {
  color: #db2777;
  background-color: rgba(219, 39, 119, 0.06);
}
.badge-tag.type-biz {
  color: #ea580c;
  background-color: rgba(234, 88, 12, 0.06);
}

.msg-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.msg-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.msg-detail {
  font-size: 12px;
  line-height: 1.5;
  color: #475569;
  margin: 0;
  font-weight: 500;
}

.msg-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}

.sender-info {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #16a34a;
  font-weight: 700;
}

.blink-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #16a34a;
  box-shadow: 0 0 6px #16a34a;
  animation: indicator-blink 1.8s infinite;
}

@keyframes indicator-blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* 分页器 */
.pagination-area {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.custom-pagination :deep(.el-pager li) {
  background-color: #ffffff !important;
  color: #64748b !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
}

.custom-pagination :deep(.el-pager li.is-active) {
  background-color: #007aff !important;
  color: #ffffff !important;
  border-color: #007aff !important;
  font-weight: 700;
}

.custom-pagination :deep(.btn-prev),
.custom-pagination :deep(.btn-next) {
  background-color: #ffffff !important;
  color: #64748b !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
}

/* 缺省占位 */
.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #94a3b8;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.empty-placeholder p {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
}

@media (max-width: 768px) {
  .layout-col {
    margin-bottom: 16px;
  }
  .type-selector-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<!-- 全局 Dialog/MessageBox 亮色玻璃重绘 -->
<style>
.custom-message-box {
  background-color: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
  backdrop-filter: blur(15px) !important;
  -webkit-backdrop-filter: blur(15px) !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08) !important;
}
.custom-message-box .el-message-box__title {
  color: #0f172a !important;
  font-weight: 700 !important;
}
.custom-message-box .el-message-box__content {
  color: #475569 !important;
  font-weight: 500 !important;
}
</style>
