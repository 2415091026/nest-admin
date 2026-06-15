import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicAlbumEntity } from './entities/music-album.entity';
import { MusicSongEntity } from './entities/music-song.entity';
import { AlbumService } from './album.service';
import { AlbumController } from './album.controller';
import { SongService } from './song.service';
import { SongController } from './song.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MusicAlbumEntity, MusicSongEntity])],
  controllers: [AlbumController, SongController],
  providers: [AlbumService, SongService],
  exports: [AlbumService, SongService],
})
export class MusicModule {}
