/**
 * 徐良歌曲下载与入库同步脚本 (Cookie 鉴权与风控防护版)
 *
 * 优化点：
 * 1. 【关键鉴权修复】网易云 API (localhost:3000) 的鉴权凭证应通过 Cookie 传递。
 *    将原先无效的 `Authorization: Bearer <token>` 头部修改为原生的 `Cookie: MUSIC_U=<token>`。
 *    这才是网易云官方识别 VIP 和高版权下载权限的真实字段。
 * 2. 【状态修正】将入库时的 status 字段由 'published' 改为单字符 '0'，匹配若依基类对正常发布状态的定义。
 * 3. 【物理去重】若本地已下载音频，直接读取文件大小并同步数据库，不再请求播放直链接口。
 * 4. 【熔断保护】直链获取遇到失败时触发 5 秒冷静期，若连续 5 次获取失败说明 Token 被暂时封禁，脚本自动熔断退出。
 */

const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { finished } = require("stream/promises");

const mysql = require("./server/node_modules/mysql2/promise");
const yaml = require("./server/node_modules/js-yaml");

const CONFIG = {
  artistId: "5929",
  apiBase: "http://localhost:3000",
  token:
    "004A92FC58D335E75852336FA8F9C7069BCECDD59F40D8499A06A877B5A4FBB4B3EE47E225D6B52B1D513DC6A03FD3EA4E94978DD525DAB82C4A43D97E91EAC172909ACF187FA732E7D3844771BF7D646D8E4B80E3B227DE0EB4BA5A94D98617897A72F19BCEC34BDE87F962FFA5B405B41BFD81DCDB1A16073470013A1BA08630EA9EAB04DA8DEFD5AF53C440AA9D92B43D47AC82B6B23462DF8E00AAC941EECEC86D18B7BFC8D23F568B3377819478345C916BBE9D3D0D9C89D953E2FE33D99CF7EAD12DD7C0F99871A0C6C6758F9362C9DF63596C594627BA636ABA3DB6D43EA1B7757ACE1709127031DD02EE1A867BE2AF2F6A1F74B56EE6F07CCB60476BFE3719718B1FDB830E544D4028776CF86501313E1C71D607D0C6D42B80CA52564D069E03D50984D24CB61AE5EFB45663D6D90E39C157355FA5E6641E81386D9BBD181876DB3A3620C3E4E10EFC6A52D94D1C7AD7F7A3ACFB09C60A4D8AC5626F7684065A017F55B7074E124D68312C6CF4E8F301732E3C6A6D456CE22494E0F115CF272418A325316D393847525B67ACB43C80E8C96387C9872B958CCAE9F9C2E6EDC1F51496FD92B04BCC269D0D3150E6E38B79FA9B9073E57BB333E0CE3237C310FC2E49C06A7A019B5C76AB55FB813AC7E4495973251AC09E7C13E73E8750354FC2FC96A983000849C604C6FB31D7F2",
  outputDir: path.join(__dirname, "songs"),
  delayMs: 1500,
  ymlConfigPath: path.join(__dirname, "server", "src", "config", "dev.yml"),
};

function sanitizeFilename(name) {
  return name.replace(/[\\\/:\*\?"<>\|]/g, "_").trim();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    console.error("⚠️ 读取 COS 配置失败:", e.message);
    return null;
  }
}

// 从 dev.yml 读取 MySQL 配置
function getDbConfig() {
  try {
    if (!fs.existsSync(CONFIG.ymlConfigPath)) {
      throw new Error(`找不到配置文件: ${CONFIG.ymlConfigPath}`);
    }
    const fileContents = fs.readFileSync(CONFIG.ymlConfigPath, "utf8");
    const doc = yaml.load(fileContents);

    const dbConfig = doc.db?.mysql || doc.mysql;
    if (!dbConfig) {
      throw new Error("未找到 MySQL 配置节点");
    }
    return {
      host: dbConfig.host || "127.0.0.1",
      user: dbConfig.username || "root",
      password: dbConfig.password || "123456",
      database: dbConfig.database || "nest-admin",
      port: dbConfig.port || 3306,
    };
  } catch (e) {
    console.error("⚠️ 读取数据库配置失败，使用默认连接配置。错误:", e.message);
    return {
      host: "127.0.0.1",
      user: "root",
      password: "123456",
      database: "nest-admin",
      port: 3306,
    };
  }
}

// 下载音频文件
async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`网络请求音频失败，状态码: ${response.status}`);
  }
  const fileStream = fs.createWriteStream(destPath);
  await finished(Readable.fromWeb(response.body).pipe(fileStream));
}

// 写入歌曲数据至 MySQL
async function saveSongToDb(connection, songData) {
  const sql = `
    INSERT INTO music_song (
      name, alias, album_id, album_name, album_cover, audio_url,
      netease_song_id, duration_ms, audio_size, audio_type, bitrate,
      tags, release_date, status, create_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', 'system_sync')
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      alias = VALUES(alias),
      album_id = VALUES(album_id),
      album_name = VALUES(album_name),
      album_cover = VALUES(album_cover),
      audio_url = VALUES(audio_url),
      duration_ms = VALUES(duration_ms),
      audio_size = VALUES(audio_size),
      audio_type = VALUES(audio_type),
      bitrate = VALUES(bitrate),
      tags = VALUES(tags),
      release_date = VALUES(release_date),
      update_by = 'system_sync',
      update_time = NOW()
  `;

  const values = [
    songData.name,
    songData.aliasJson,
    songData.albumId,
    songData.albumName,
    songData.albumCover,
    songData.audioUrl,
    songData.neteaseSongId,
    songData.durationMs,
    songData.audioSize,
    songData.audioType,
    songData.bitrate,
    songData.tagsJson,
    songData.releaseDate,
  ];

  await connection.execute(sql, values);
}

async function main() {
  console.log("============== 开始初始化徐良歌曲下载与入库脚本 ==============");

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`成功创建下载文件夹: ${CONFIG.outputDir}`);
  }

  const cosConfig = getCosConfig();
  if (!cosConfig || !cosConfig.bucket || !cosConfig.region) {
    console.error("❌ 腾讯云 COS 配置无效，请检查 dev.yml 中的 cos 部分！");
    return;
  }
  const cosBaseUrl = (cosConfig.domain || `https://${cosConfig.bucket}.cos.${cosConfig.region}.myqcloud.com`).replace(/\/$/, '');
  console.log(`🎉 腾讯云 COS 域名解析成功: ${cosBaseUrl}`);

  const dbConfig = getDbConfig();
  console.log(
    `正在尝试连接 MySQL 数据库... 地址: ${dbConfig.host}:${dbConfig.port}, 库名: ${dbConfig.database}`,
  );

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("🎉 数据库连接成功！");
  } catch (err) {
    console.error("❌ 数据库连接失败！错误:", err.message);
    return;
  }

  try {
    let rawSongs = [];

    // 1. 获取歌手热门歌曲列表 (携带原生的 Cookie: MUSIC_U=<token>)
    const hotSongsUrl = `${CONFIG.apiBase}/artists?id=${CONFIG.artistId}`;
    console.log(`正在获取热门歌曲列表 (携带登录 Cookie)...`);
    try {
      const hotRes = await fetch(hotSongsUrl, {
        headers: {
          Cookie: `MUSIC_U=${CONFIG.token}`,
        },
      });
      if (hotRes.ok) {
        const hotData = await hotRes.json();
        if (hotData.code === 200 && hotData.hotSongs) {
          rawSongs = rawSongs.concat(hotData.hotSongs);
          console.log(`  -> 拉取到 ${hotData.hotSongs.length} 首热门曲目`);
        }
      }
    } catch (e) {
      console.warn("  -> 获取热门歌曲接口报错:", e.message);
    }

    // 2. 获取歌手全部歌曲列表 (携带原生的 Cookie: MUSIC_U=<token>)
    const allSongsUrl = `${CONFIG.apiBase}/artist/songs?id=${CONFIG.artistId}&limit=200`;
    console.log(`正在获取全量歌曲列表 (携带登录 Cookie)...`);
    try {
      const allRes = await fetch(allSongsUrl, {
        headers: {
          Cookie: `MUSIC_U=${CONFIG.token}`,
        },
      });
      if (allRes.ok) {
        const allData = await allRes.json();
        if (allData.code === 200 && allData.songs) {
          rawSongs = rawSongs.concat(allData.songs);
          console.log(`  -> 拉取到 ${allData.songs.length} 首全量曲目`);
        }
      }
    } catch (e) {
      console.warn("  -> 获取全量歌曲接口报错:", e.message);
    }

    // 3. 数据去重
    const uniqueSongsMap = new Map();
    for (const song of rawSongs) {
      if (!uniqueSongsMap.has(song.id)) {
        uniqueSongsMap.set(song.id, song);
      }
    }
    const songs = Array.from(uniqueSongsMap.values());
    console.log(`去重合并完成！待同步的有效歌曲总数: ${songs.length} 首。`);

    let consecutiveErrors = 0;

    // 4. 遍历处理每首歌曲
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const cleanName = sanitizeFilename(song.name);
      const songId = String(song.id);

      console.log(
        `\n[${i + 1}/${songs.length}] 正在处理: ${cleanName} (网易云 ID: ${songId})`,
      );

      const fileType = "mp3";
      const fileName = `${cleanName}.${fileType}`;
      const destPath = path.join(CONFIG.outputDir, fileName);

      const aliasJson = JSON.stringify(song.alia || song.alias || []);
      const tagsJson = JSON.stringify([]);
      const albumId = String(song.al?.id || "");
      const albumName = song.al?.name || "未知专辑";
      const albumCover = song.al?.picUrl || "";
      const releaseDate = song.publishTime ? new Date(song.publishTime) : null;
      const durationMs = song.dt || 0;

      // 如果本地已经下载过该音频，直接同步数据库，不再请求播放链接口
      if (fs.existsSync(destPath)) {
        console.log(`  -> 物理文件已存在，直接读取本地文件体积并同步数据库。`);
        try {
          const stats = fs.statSync(destPath);
          const audioSize = stats.size;
          await saveSongToDb(connection, {
            name: song.name,
            aliasJson,
            albumId,
            albumName,
            albumCover,
            audioUrl: `${cosBaseUrl}/songs/${encodeURIComponent(fileName)}`,
            neteaseSongId: songId,
            durationMs: durationMs,
            audioSize,
            audioType: fileType,
            bitrate: 128000,
            tagsJson,
            releaseDate,
          });
          console.log(`  -> 数据库同步成功！`);
        } catch (dbErr) {
          console.error(`  -> ⚠️ 数据库同步失败:`, dbErr.message);
        }
        continue;
      }

      // 发起请求获取直链并下载 (携带原生 Cookie)
      const urlQuery = `${CONFIG.apiBase}/song/url/v1?id=${songId}&level=standard&realIP=116.25.146.177`;
      console.log("  -> 获取下载链接:", urlQuery);

      try {
        const urlRes = await fetch(urlQuery, {
          headers: {
            'Cookie': `MUSIC_U=${CONFIG.token}`
          }
        });

        if (!urlRes.ok) {
          console.error(`  -> 获取播放直链失败 (状态码: ${urlRes.status})`);
          continue;
        }

        const urlData = await urlRes.json();
        if (
          urlData.code !== 200 ||
          !urlData.data ||
          urlData.data.length === 0
        ) {
          console.error(`  -> 接口未返回有效的播放链接数据`);
          continue;
        }

        const musicData = urlData.data[0];
        const audioUrl = musicData.url;

        if (!audioUrl) {
          consecutiveErrors++;
          console.warn(
            `  -> ⚠️ 未能获取到有效的音频流地址。当前连续失败数: ${consecutiveErrors}`,
          );

          if (consecutiveErrors >= 5) {
            console.error(
              "❌ 连续 5 次获取音频流直链失败，已被网易云风控屏蔽或 Token 失效，脚本自动熔断退出！",
            );
            break;
          }
          await sleep(5000);
          continue;
        }

        // 成功获取直链，重置错误计数器
        consecutiveErrors = 0;

        if (fs.existsSync(destPath)) {
          console.log(`  -> 物理文件已存在，跳过物理文件下载。`);
        } else {
          console.log(`  -> 正在下载音频至: ${fileName}`);
          await downloadFile(audioUrl, destPath);
          console.log(`  -> 物理文件下载成功！`);
        }

        const audioSize = musicData.size || 0;
        const bitrate = musicData.br || 128000;
        const realDuration = musicData.time || durationMs;
        const realType = musicData.type || fileType;

        // 写入数据库
        await saveSongToDb(connection, {
          name: song.name,
          aliasJson,
          albumId,
          albumName,
          albumCover,
          audioUrl: `${cosBaseUrl}/songs/${encodeURIComponent(fileName)}`,
          neteaseSongId: songId,
          durationMs: realDuration,
          audioSize,
          audioType: realType,
          bitrate,
          tagsJson,
          releaseDate,
        });
        console.log(`  -> 数据库同步成功！`);

        // 请求间隔延时
        await sleep(CONFIG.delayMs);
      } catch (err) {
        console.error(`  -> 歌曲 [${cleanName}] 处理失败，异常:`, err.message);
      }
    }

    console.log(
      "\n============== 所有下载及数据入库同步已完成！ ==============",
    );
    console.log(`音频文件保存在: ${CONFIG.outputDir}`);
    console.log("您可以在数据库表 `music_song` 中查看已同步的完整元数据！");
  } catch (error) {
    console.error("执行同步脚本发生致命错误:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("数据库连接已关闭。");
    }
  }
}

main();
