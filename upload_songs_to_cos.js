/**
 * 腾讯云 COS 音频文件一键上传脚本
 * 
 * 功能：
 * 1. 自动读取 server/src/config/dev.yml 中的腾讯云 COS 密钥配置。
 * 2. 扫描本地 songs 目录下的所有音频文件 (.mp3, .m4a)。
 * 3. 采用高并发（限制 5 并发）将所有音频文件上传到腾讯云 COS 存储桶下的 songs/ 目录中。
 */

const fs = require("fs");
const path = require("path");
const COS = require("./server/node_modules/cos-nodejs-sdk-v5");
const yaml = require("./server/node_modules/js-yaml");

const CONFIG = {
  ymlConfigPath: path.join(__dirname, "server", "src", "config", "dev.yml"),
  songsDir: path.join(__dirname, "songs"),
};

// 从 dev.yml 读取 COS 配置
function getCosConfig() {
  try {
    if (!fs.existsSync(CONFIG.ymlConfigPath)) {
      throw new Error(`找不到配置文件: ${CONFIG.ymlConfigPath}`);
    }
    const fileContents = fs.readFileSync(CONFIG.ymlConfigPath, "utf8");
    const doc = yaml.load(fileContents);
    return doc.cos;
  } catch (e) {
    console.error("❌ 读取 COS 配置失败:", e.message);
    process.exit(1);
  }
}

async function main() {
  console.log("============== 开始一键同步本地歌曲至腾讯云 COS ==============");
  
  const cosConfig = getCosConfig();
  if (!cosConfig || !cosConfig.secretId || !cosConfig.secretKey) {
    console.error("❌ dev.yml 中未检测到有效的腾讯云 COS 密钥配置，请先检查您的回填配置！");
    return;
  }

  const cosClient = new COS({
    SecretId: cosConfig.secretId,
    SecretKey: cosConfig.secretKey,
  });

  if (!fs.existsSync(CONFIG.songsDir)) {
    console.error(`❌ 本地歌曲文件夹不存在: ${CONFIG.songsDir}，请先运行 download_songs.js 下载歌曲！`);
    return;
  }

  // 读取 songs 文件夹下的所有文件
  const files = fs.readdirSync(CONFIG.songsDir).filter(file => {
    return file.endsWith(".mp3") || file.endsWith(".m4a");
  });

  if (files.length === 0) {
    console.log("ℹ️ songs 文件夹下没有找到可上传的音频文件。");
    return;
  }

  console.log(`🎉 找到 ${files.length} 个待上传的音频文件。开始上传中...`);

  // 控制并发数，避免太多文件同时上传导致网络过载
  const CONCURRENCY = 5;
  let activeUploads = 0;
  let currentIndex = 0;
  let successCount = 0;
  let failCount = 0;

  function uploadNext() {
    if (currentIndex >= files.length) {
      if (activeUploads === 0) {
        console.log(`\n============== 任务完成！成功: ${successCount} 个, 失败: ${failCount} 个 ==============`);
      }
      return;
    }

    const fileName = files[currentIndex++];
    const localFilePath = path.join(CONFIG.songsDir, fileName);
    const key = `songs/${fileName}`;
    activeUploads++;

    console.log(`[上传中] 正在上传: ${fileName} -> cos://${cosConfig.bucket}/${key}`);

    cosClient.putObject({
      Bucket: cosConfig.bucket,
      Region: cosConfig.region,
      Key: key,
      StorageClass: 'STANDARD',
      Body: fs.createReadStream(localFilePath),
    }, function(err, data) {
      activeUploads--;
      if (err) {
        console.error(`❌ 文件 ${fileName} 上传失败! 错误: ${err.message}`);
        failCount++;
      } else {
        successCount++;
        const publicUrl = cosConfig.domain 
          ? `${cosConfig.domain.replace(/\/$/, '')}/${key}`
          : `https://${cosConfig.bucket}.cos.${cosConfig.region}.myqcloud.com/${key}`;
        console.log(`✅ 上传成功: ${fileName}`);
        console.log(`   公网链接: ${publicUrl}`);
      }
      // 继续上传下一个文件
      uploadNext();
    });
  }

  // 启动并发上传
  for (let i = 0; i < Math.min(CONCURRENCY, files.length); i++) {
    uploadNext();
  }
}

main();
