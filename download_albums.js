/**
 * 徐良专辑获取与入库同步脚本 (Cookie 鉴权与幂等防重版)
 *
 * 逻辑：
 * 1. 自动连接 MySQL 数据库（从 dev.yml 中读取配置）。
 * 2. 携带 MUSIC_U 登录 Cookie 调用网易云 API (/artist/album) 抓取歌手徐良的所有专辑。
 * 3. 抓取到数据后，对每张专辑进行“先查询后插入/更新”的幂等操作，保证数据不重复。
 */

const fs = require("fs");
const path = require("path");
const mysql = require("./server/node_modules/mysql2/promise");
const yaml = require("./server/node_modules/js-yaml");

const CONFIG = {
  artistId: "5929",
  apiBase: "http://localhost:3000",
  token:
    "004A92FC58D335E75852336FA8F9C7069BCECDD59F40D8499A06A877B5A4FBB4B3EE47E225D6B52B1D513DC6A03FD3EA4E94978DD525DAB82C4A43D97E91EAC172909ACF187FA732E7D3844771BF7D646D8E4B80E3B227DE0EB4BA5A94D98617897A72F19BCEC34BDE87F962FFA5B405B41BFD81DCDB1A16073470013A1BA08630EA9EAB04DA8DEFD5AF53C440AA9D92B43D47AC82B6B23462DF8E00AAC941EECEC86D18B7BFC8D23F568B3377819478345C916BBE9D3D0D9C89D953E2FE33D99CF7EAD12DD7C0F99871A0C6C6758F9362C9DF63596C594627BA636ABA3DB6D43EA1B7757ACE1709127031DD02EE1A867BE2AF2F6A1F74B56EE6F07CCB60476BFE3719718B1FDB830E544D4028776CF86501313E1C71D607D0C6D42B80CA52564D069E03D50984D24CB61AE5EFB45663D6D90E39C157355FA5E6641E81386D9BBD181876DB3A3620C3E4E10EFC6A52D94D1C7AD7F7A3ACFB09C60A4D8AC5626F7684065A017F55B7074E124D68312C6CF4E8F301732E3C6A6D456CE22494E0F115CF272418A325316D393847525B67ACB43C80E8C96387C9872B958CCAE9F9C2E6EDC1F51496FD92B04BCC269D0D3150E6E38B79FA9B9073E57BB333E0CE3237C310FC2E49C06A7A019B5C76AB55FB813AC7E4495973251AC09E7C13E73E8750354FC2FC96A983000849C604C6FB31D7F2",
  ymlConfigPath: path.join(__dirname, "server", "src", "config", "dev.yml"),
};

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

// 写入专辑数据至 MySQL (先查询防重)
async function saveAlbumToDb(connection, albumData) {
  const selectSql = `SELECT album_id FROM music_album WHERE netease_album_id = ? LIMIT 1`;
  const [rows] = await connection.execute(selectSql, [albumData.neteaseAlbumId]);

  if (rows.length > 0) {
    // 记录存在，执行更新
    console.log(`  -> 专辑已存在，执行更新。`);
    const updateSql = `
      UPDATE music_album SET
        name = ?,
        alias = ?,
        artist_id = ?,
        artist_name = ?,
        pic_url = ?,
        blur_pic_url = ?,
        company = ?,
        publish_time = ?,
        type = ?,
        sub_type = ?,
        size = ?,
        description = ?,
        brief_desc = ?,
        update_by = 'system_sync',
        update_time = NOW()
      WHERE netease_album_id = ?
    `;
    const values = [
      albumData.name,
      albumData.aliasJson,
      albumData.artistId,
      albumData.artistName,
      albumData.picUrl,
      albumData.blurPicUrl,
      albumData.company,
      albumData.publishTime,
      albumData.type,
      albumData.subType,
      albumData.size,
      albumData.description,
      albumData.briefDesc,
      albumData.neteaseAlbumId,
    ];
    await connection.execute(updateSql, values);
  } else {
    // 记录不存在，执行插入
    console.log(`  -> 专辑未存在，执行插入。`);
    const insertSql = `
      INSERT INTO music_album (
        name, alias, netease_album_id, artist_id, artist_name,
        pic_url, blur_pic_url, company, publish_time, type,
        sub_type, size, description, brief_desc, status, create_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', 'system_sync')
    `;
    const values = [
      albumData.name,
      albumData.aliasJson,
      albumData.neteaseAlbumId,
      albumData.artistId,
      albumData.artistName,
      albumData.picUrl,
      albumData.blurPicUrl,
      albumData.company,
      albumData.publishTime,
      albumData.type,
      albumData.subType,
      albumData.size,
      albumData.description,
      albumData.briefDesc,
    ];
    await connection.execute(insertSql, values);
  }
}

async function main() {
  console.log("============== 开始获取专辑数据并同步数据库 ==============");

  const dbConfig = getDbConfig();
  console.log(
    `正在连接数据库... ${dbConfig.host}:${dbConfig.port}, 库名: ${dbConfig.database}`,
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
    // 接口地址：获取歌手专辑列表
    // limit 设为 100 以获取尽量多的专辑数据
    const albumApiUrl = `${CONFIG.apiBase}/artist/album?id=${CONFIG.artistId}&limit=100`;
    console.log(`正在获取专辑数据 (携带登录 Cookie)... 接口: ${albumApiUrl}`);

    const res = await fetch(albumApiUrl, {
      headers: {
        Cookie: `MUSIC_U=${CONFIG.token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`请求接口失败，状态码: ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== 200 || !data.hotAlbums) {
      throw new Error(`数据获取失败: code=${data.code}`);
    }

    const albums = data.hotAlbums;
    console.log(`🎉 成功获取到 ${albums.length} 张专辑。开始写入数据库...`);

    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];
      const albumId = String(album.id);
      const albumName = album.name;

      console.log(`\n[${i + 1}/${albums.length}] 处理专辑: ${albumName} (ID: ${albumId})`);

      const aliasJson = JSON.stringify(album.alias || []);
      const publishTime = album.publishTime ? new Date(album.publishTime) : null;
      const artistId = String(album.artist?.id || CONFIG.artistId);
      const artistName = album.artist?.name || "徐良";

      await saveAlbumToDb(connection, {
        name: albumName,
        aliasJson,
        neteaseAlbumId: albumId,
        artistId,
        artistName,
        picUrl: album.picUrl || "",
        blurPicUrl: album.blurPicUrl || "",
        company: album.company || "",
        publishTime,
        type: album.type || "",
        subType: album.subType || "",
        size: album.size || 0,
        description: album.description || "",
        briefDesc: album.briefDesc || "",
      });
    }

    console.log("\n============== 所有专辑数据入库完成！ ==============");
  } catch (err) {
    console.error("❌ 专辑同步执行发生异常:", err.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log("数据库连接已关闭。");
    }
  }
}

main();
