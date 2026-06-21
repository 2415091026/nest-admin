/**
 * 歌词数据获取与同步脚本
 * 
 * 逻辑：
 * 1. 从 server/src/config/dev.yml 读取线上的 MySQL 数据库连接配置。
 * 2. 从 music_song 表中获取所有未同步歌词（lyrics 为 null 或空字符串）的歌曲。
 * 3. 逐个调用本地网易云 API (http://localhost:3000/lyric?id=xxx) 获取歌词信息。
 * 4. 将标准 LRC 歌词写入 lyrics 字段，若有翻译则将 has_translation 设为 1，否则为 0。
 * 5. 每次请求后延迟，并内置连续失败熔断机制以防止接口风控。
 */

const fs = require("fs");
const path = require("path");

const mysql = require("./server/node_modules/mysql2/promise");
const yaml = require("./server/node_modules/js-yaml");

const CONFIG = {
  apiBase: "http://localhost:3000",
  ymlConfigPath: path.join(__dirname, "server", "src", "config", "dev.yml"),
  delayMs: 1500,        // 每次请求接口之间的延时，避免网易云风控
  forceUpdate: false,   // 是否强制更新已有歌词的歌曲（false 代表只同步 lyrics 为空或 null 的歌曲）
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 从 dev.yml 中读取 MySQL 连接配置
function getDbConfig() {
  try {
    if (!fs.existsSync(CONFIG.ymlConfigPath)) {
      throw new Error(`找不到配置文件: ${CONFIG.ymlConfigPath}`);
    }
    const fileContents = fs.readFileSync(CONFIG.ymlConfigPath, "utf8");
    const doc = yaml.load(fileContents);

    const dbConfig = doc.db?.mysql || doc.mysql;
    if (!dbConfig) {
      throw new Error("在配置文件中未找到 MySQL 配置项");
    }
    return {
      host: dbConfig.host,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port || 3306,
    };
  } catch (e) {
    console.error("❌ 读取数据库配置失败:", e.message);
    process.exit(1);
  }
}

async function main() {
  console.log("============== 开始初始化歌词同步脚本 ==============");

  const dbConfig = getDbConfig();
  console.log(`正在尝试连接线上 MySQL 数据库... 地址: ${dbConfig.host}:${dbConfig.port}, 库名: ${dbConfig.database}`);

  let pool;
  try {
    pool = mysql.createPool(dbConfig);
    console.log("🎉 线上数据库连接池初始化成功！");
  } catch (err) {
    console.error("❌ 数据库连接池初始化失败！错误:", err.message);
    return;
  }

  try {
    // 1. 从数据库中查询歌曲
    console.log("正在从 music_song 表中获取曲目列表...");
    const [songs] = await pool.execute(
      "SELECT song_id, name, netease_song_id, lyrics FROM music_song"
    );

    console.log(`查询到总歌曲数: ${songs.length} 首。`);

    // 2. 筛选出需要更新的曲目
    const targetSongs = songs.filter(song => {
      // 必须有网易云唯一 ID
      if (!song.netease_song_id) return false;
      // 如果未开启强制更新，且已经有歌词，则跳过
      if (!CONFIG.forceUpdate && song.lyrics && song.lyrics.trim() !== "") {
        return false;
      }
      return true;
    });

    console.log(`筛选出待同步歌词的有效曲目数: ${targetSongs.length} 首。`);

    if (targetSongs.length === 0) {
      console.log("没有需要同步歌词的歌曲，脚本结束。");
      return;
    }

    let consecutiveErrors = 0;
    let successCount = 0;

    // 3. 循环拉取歌词并同步
    for (let i = 0; i < targetSongs.length; i++) {
      const song = targetSongs[i];
      const songId = song.song_id;
      const neteaseId = song.netease_song_id;
      const name = song.name;

      console.log(`\n[${i + 1}/${targetSongs.length}] 正在同步歌词: ${name} (网易云 ID: ${neteaseId})`);

      const lyricUrl = `${CONFIG.apiBase}/lyric?id=${neteaseId}`;
      
      try {
        const res = await fetch(lyricUrl);
        if (!res.ok) {
          throw new Error(`网络响应错误，状态码: ${res.status}`);
        }

        const data = await res.json();
        if (data.code !== 200) {
          throw new Error(`网易云接口返回异常代码: ${data.code}`);
        }

        // 解析歌词
        const lrcLyric = data.lrc?.lyric || "";
        const tlyric = data.tlyric?.lyric || "";
        const hasTranslation = tlyric.trim() !== "" ? 1 : 0;

        if (!lrcLyric.trim()) {
          console.log(`  -> ⚠️ 未获取到该歌曲的有效歌词`);
          // 如果该歌确实没有歌词（如纯音乐），我们也需要标记更新为已处理，防止下次重复请求，这里只将 lyrics 设为空串 ''，而不是 null
          await pool.execute(
            "UPDATE music_song SET lyrics = '', has_translation = ? WHERE song_id = ?",
            [hasTranslation, songId]
          );
          consecutiveErrors = 0; // 重置连续错误
          continue;
        }

        // 更新至数据库
        await pool.execute(
          "UPDATE music_song SET lyrics = ?, has_translation = ? WHERE song_id = ?",
          [lrcLyric, hasTranslation, songId]
        );

        console.log(`  -> 🎉 歌词同步成功！是否有翻译: ${hasTranslation ? "是" : "否"}`);
        successCount++;
        consecutiveErrors = 0; // 重置连续错误

        // 适当延时防止风控
        await sleep(CONFIG.delayMs);

      } catch (err) {
        consecutiveErrors++;
        console.error(`  -> ❌ 获取/更新歌词失败: ${err.message}. 连续失败数: ${consecutiveErrors}`);

        if (consecutiveErrors >= 5) {
          console.error("❌ 连续 5 次获取歌词失败，可能触发接口风控或网络异常，脚本自动熔断退出！");
          break;
        }

        // 失败后等待较长时间
        await sleep(5000);
      }
    }

    console.log(`\n============== 同步统计 ==============`);
    console.log(`待同步总数: ${targetSongs.length}`);
    console.log(`成功同步数: ${successCount}`);
    console.log(`======================================`);

  } catch (error) {
    console.error("执行歌词同步脚本时发生致命错误:", error);
  } finally {
    if (pool) {
      await pool.end();
      console.log("数据库连接池已关闭。");
    }
  }
}

main();
