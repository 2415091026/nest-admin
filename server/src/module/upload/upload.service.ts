import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ResultData } from 'src/common/utils/result';
import { SysUploadEntity } from './entities/upload.entity';
import { ChunkFileDto, ChunkMergeFileDto } from './dto/index';
import { GenerateUUID } from 'src/common/utils/index';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import COS from 'cos-nodejs-sdk-v5';
import Mime from 'mime-types';

@Injectable()
export class UploadService {
  private thunkDir: string;
  private cos = new COS({
    // 必选参数
    SecretId: this.config.get('cos.secretId'),
    SecretKey: this.config.get('cos.secretKey'),
    //可选参数
    FileParallelLimit: 3, // 控制文件上传并发数
    ChunkParallelLimit: 8, // 控制单个文件下分片上传并发数，在同园区上传可以设置较大的并发数
    ChunkSize: 1024 * 1024 * 8, // 控制分片大小，单位 B，在同园区上传可以设置较大的分片大小
  });
  private isLocal: boolean;
  constructor(
    @InjectRepository(SysUploadEntity)
    private readonly sysUploadEntityRep: Repository<SysUploadEntity>,
    @Inject(ConfigService)
    private config: ConfigService,
  ) {
    this.thunkDir = 'thunk';
    this.isLocal = this.config.get('app.file.isLocal');
  }

  /**
   * 单文件上传
   * @param file
   * @returns
   */
  async singleFileUpload(file: Express.Multer.File) {
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    if (fileSize > this.config.get('app.file.maxSize')) {
      return ResultData.fail(500, `文件大小不能超过${this.config.get('app.file.maxSize')}MB`);
    }
    let res;
    if (this.isLocal) {
      res = await this.saveFileLocal(file);
    } else {
      const targetDir = this.config.get('cos.location') || 'image';
      res = await this.saveFileCos(targetDir, file);
    }
    const uploadId = GenerateUUID();
    await this.sysUploadEntityRep.save({ uploadId, ...res, ext: path.extname(res.newFileName), size: file.size });
    return res;
  }

  /**
   * 获取上传任务Id
   * @returns
   */
  async getChunkUploadId() {
    const uploadId = GenerateUUID();
    return ResultData.ok({
      uploadId: uploadId,
    });
  }

  /**
   * 文件切片上传
   */
  async chunkFileUpload(file: Express.Multer.File, body: ChunkFileDto) {
    const rootPath = process.cwd();
    const baseDirPath = path.join(rootPath, this.config.get('app.file.location'));
    const chunckDirPath = path.join(baseDirPath, this.thunkDir, body.uploadId);
    if (!fs.existsSync(chunckDirPath)) {
      this.mkdirsSync(chunckDirPath);
    }
    const chunckFilePath = path.join(chunckDirPath, `${body.uploadId}${body.fileName}@${body.index}`);
    if (fs.existsSync(chunckFilePath)) {
      return ResultData.ok();
    } else {
      fs.writeFileSync(chunckFilePath, file.buffer);
      return ResultData.ok();
    }
  }

  /**
   * 检查切片是否已上传
   * @param uploadId
   * @param index
   */
  async checkChunkFile(body) {
    const rootPath = process.cwd();
    const baseDirPath = path.join(rootPath, this.config.get('app.file.location'));
    const chunckDirPath = path.join(baseDirPath, this.thunkDir, body.uploadId);
    const chunckFilePath = path.join(chunckDirPath, `${body.uploadId}${body.fileName}@${body.index}`);
    if (!fs.existsSync(chunckFilePath)) {
      return ResultData.fail(500, '文件不存在');
    } else {
      return ResultData.ok();
    }
  }

  /**
   * 递归创建目录 同步方法
   * @param dirname
   * @returns
   */
  mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
      return true;
    } else {
      if (this.mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
      }
    }
  }

  /**
   * 文件切片合并
   */
  async chunkMergeFile(body: ChunkMergeFileDto) {
    const { uploadId, fileName } = body;
    const rootPath = process.cwd();
    const baseDirPath = path.join(rootPath, this.config.get('app.file.location'));
    const sourceFilesDir = path.join(baseDirPath, this.thunkDir, uploadId);

    if (!fs.existsSync(sourceFilesDir)) {
      return ResultData.fail(500, '文件不存在');
    }

    //对文件重命名
    const newFileName = this.getNewFileName(fileName);
    const targetFile = path.join(baseDirPath, newFileName);
    await this.thunkStreamMerge(sourceFilesDir, targetFile);
    //文件相对地址，替换反斜杠以确保 URL/Key 的正斜杠一致性
    const relativeFilePath = targetFile.replace(baseDirPath, '').replace(/\\/g, '/');
    const url = this.joinUrl(this.config.get('app.file.domain'), fileName);
    const targetDir = this.config.get('cos.location') || 'video';
    const key = path.posix.join(targetDir, relativeFilePath);
    const data = {
      fileName: key,
      newFileName: newFileName,
      url: url,
    };
    const stats = fs.statSync(targetFile);

    if (!this.isLocal) {
      if (fs.existsSync(targetFile)) {
        this.uploadLargeFileCos(targetFile, key);
      }
      data.url = this.joinUrl(this.config.get('cos.domain'), key);
      // 写入上传记录
      await this.sysUploadEntityRep.save({ uploadId, ...data, ext: path.extname(data.newFileName), size: stats.size, status: '0' });
      return ResultData.ok(data);
    }
    await this.sysUploadEntityRep.save({ uploadId, ...data, ext: path.extname(data.newFileName), size: stats.size });
    return ResultData.ok(data);
  }

  /**
   * 文件合并
   * @param {string} sourceFiles 源文件目录
   * @param {string} targetFile 目标文件路径
   */
  async thunkStreamMerge(sourceFilesDir, targetFile) {
    const fileList = fs
      .readdirSync(sourceFilesDir)
      .filter((file) => fs.lstatSync(path.join(sourceFilesDir, file)).isFile())
      .sort((a, b) => parseInt(a.split('@')[1]) - parseInt(b.split('@')[1]))
      .map((name) => ({
        name,
        filePath: path.join(sourceFilesDir, name),
      }));

    const fileWriteStream = fs.createWriteStream(targetFile);
    let onResolve: (value) => void;
    const callbackPromise = new Promise((resolve) => {
      onResolve = resolve;
    });
    this.thunkStreamMergeProgress(fileList, fileWriteStream, sourceFilesDir, onResolve);
    return callbackPromise;
  }

  /**
   * 合并每一个切片
   * @param {Array} fileList 文件数据列表
   * @param {WritableStream} fileWriteStream 最终的写入结果流
   * @param {string} sourceFilesDir 源文件目录
   */
  thunkStreamMergeProgress(fileList, fileWriteStream, sourceFilesDir, onResolve) {
    if (!fileList.length) {
      // 删除临时目录
      fs.rmdirSync(sourceFilesDir, { recursive: true });
      onResolve();
      return;
    }

    const { filePath: chunkFilePath } = fileList.shift();
    const currentReadStream = fs.createReadStream(chunkFilePath);

    // 把结果往最终的生成文件上进行拼接
    currentReadStream.pipe(fileWriteStream, { end: false });

    currentReadStream.on('end', () => {
      // 拼接完之后进入下一次循环
      this.thunkStreamMergeProgress(fileList, fileWriteStream, sourceFilesDir, onResolve);
    });
  }

  /**
   * 保存文件到本地
   * @param file
   */
  async saveFileLocal(file: Express.Multer.File) {
    const rootPath = process.cwd();
    //文件根目录
    const baseDirPath = path.join(rootPath, this.config.get('app.file.location'));

    //对文件名转码
    const originalname = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
    //重新生成文件名加上时间戳
    const newFileName = this.getNewFileName(originalname);
    //文件路径
    const targetFile = path.join(baseDirPath, newFileName);
    //文件目录
    const sourceFilesDir = path.dirname(targetFile);
    //文件相对地址，替换反斜线
    const relativeFilePath = targetFile.replace(baseDirPath, '').replace(/\\/g, '/');

    if (!fs.existsSync(sourceFilesDir)) {
      this.mkdirsSync(sourceFilesDir);
    }
    fs.writeFileSync(targetFile, file.buffer);

    //文件服务完整路径
    const fileName = path.posix.join(this.config.get('app.file.serveRoot'), relativeFilePath);
    const url = this.joinUrl(this.config.get('app.file.domain'), fileName);
    return {
      fileName: fileName,
      newFileName: newFileName,
      url: url,
    };
  }
  /**
   * 生成新的文件名
   * @param originalname
   * @returns
   */
  getNewFileName(originalname: string): string {
    if (!originalname) {
      return originalname;
    }
    const index = originalname.lastIndexOf('.');
    if (index === -1) {
      return `${originalname}_${new Date().getTime()}`;
    }
    const name = originalname.substring(0, index);
    const ext = originalname.substring(index + 1);
    return `${name}_${new Date().getTime()}.${ext}`;
  }

  /**
   *
   * @param targetFile
   * @param file
   * @returns
   */
  async saveFileCos(targetDir: string, file: Express.Multer.File) {
    //对文件名转码
    const originalname = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
    //重新生成文件名加上时间戳
    const newFileName = this.getNewFileName(originalname);
    const targetFile = path.posix.join(targetDir, newFileName);
    await this.uploadCos(targetFile, file.buffer);
    const url = this.joinUrl(this.config.get('cos.domain'), targetFile);
    return {
      fileName: targetFile,
      newFileName: newFileName,
      url: url,
    };
  }

  /**
   * 普通文件上传cos
   * @param targetFile
   * @param uploadBody
   * @returns
   */
  async uploadCos(targetFile: string, buffer: COS.UploadBody) {
    try {
      console.log(`[COS] 开始普通文件上传, Key: ${targetFile}`);
      const { statusCode } = await this.cosHeadObject(targetFile);
      if (statusCode !== 200) {
        const data = await this.cos.putObject({
          Bucket: this.config.get('cos.bucket'),
          Region: this.config.get('cos.region'),
          Key: targetFile,
          Body: buffer,
        });
        console.log(`[COS] 普通文件上传成功:`, data);
        return targetFile;
      }
      return targetFile;
    } catch (error) {
      console.error(`[COS] 普通文件上传出错:`, error);
      throw error;
    }
  }

  /**
   * 获取分片上传结果
   * @param uploadId
   * @returns
   */
  async getChunkUploadResult(uploadId: string) {
    const data = await this.sysUploadEntityRep.findOne({
      where: { uploadId },
      select: ['status', 'fileName', 'newFileName', 'url'],
    });

    if (data) {
      return ResultData.ok({
        data: data,
        msg: data.status === '0' ? '上传成功' : '上传中',
      });
    } else {
      return ResultData.fail(500, '文件不存在');
    }
  }

  /**
   *  大文件上传cos
   * @param sourceFile
   * @param targetFile
   * @returns
   */
  async uploadLargeFileCos(sourceFile: string, targetFile: string) {
    try {
      console.log(`[COS] 开始大文件分片上传, 本地路径: ${sourceFile}, COS Key: ${targetFile}`);
      const { statusCode } = await this.cosHeadObject(targetFile);
      if (statusCode !== 200) {
        console.log(`[COS] 文件在 COS 中不存在，开始上传...`);
        const uploadResult = await this.cos.uploadFile({
          Bucket: this.config.get('cos.bucket'),
          Region: this.config.get('cos.region'),
          Key: targetFile,
          FilePath: sourceFile,
          SliceSize: 1024 * 1024 * 5 /* 触发分块上传的阈值，超过5MB使用分块上传，非必须 */,
          onProgress: (progressData) => {
            console.log(`[COS] 上传进度: ${Math.round(progressData.percent * 100)}%`);
            if (progressData.percent === 1) {
              this.sysUploadEntityRep.update({ fileName: targetFile }, { status: '0' });
            }
          },
        });
        console.log(`[COS] 大文件上传成功:`, uploadResult);
      } else {
        console.log(`[COS] 文件已存在于 COS，跳过上传。`);
      }
    } catch (error) {
      console.error(`[COS] 大文件分片上传出错:`, error);
    } finally {
      // 删除本地临时合并的文件
      if (fs.existsSync(sourceFile)) {
        try {
          fs.unlinkSync(sourceFile);
          console.log(`[COS] 清理本地临时文件成功: ${sourceFile}`);
        } catch (err) {
          console.error(`[COS] 清理本地临时文件失败:`, err);
        }
      }
    }
    return targetFile;
  }

  /**
   * 检查cos资源是否存在
   * @param directory
   * @param key
   * @returns
   */
  async cosHeadObject(targetFile: string) {
    try {
      return await this.cos.headObject({
        Bucket: this.config.get('cos.bucket'),
        Region: this.config.get('cos.region'),
        Key: targetFile,
      });
    } catch (error) {
      return error;
    }
  }

  /**
   * 获取cos授权
   * @returns
   */
  async getAuthorization(Key: string) {
    const authorization = COS.getAuthorization({
      SecretId: this.config.get('cos.secretId'),
      SecretKey: this.config.get('cos.secretKey'),
      Method: 'post',
      Key: Key,
      Expires: 60,
    });
    return ResultData.ok({
      sign: authorization,
    });
  }

  /**
   * 安全地拼接 URL 和路径，防止双斜线被压缩
   * @param domain 域名
   * @param paths 路径片段
   * @returns 拼接后的完整 URL
   */
  private joinUrl(domain: string, ...paths: string[]): string {
    const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
    const cleanPath = paths
      .map((p) => {
        let temp = p;
        if (temp.startsWith('/')) {
          temp = temp.slice(1);
        }
        if (temp.endsWith('/')) {
          temp = temp.slice(0, -1);
        }
        return temp;
      })
      .filter(Boolean)
      .join('/');
    return `${cleanDomain}/${cleanPath}`;
  }
}
