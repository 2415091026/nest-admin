import { Module } from '@nestjs/common';
import { AppApiController } from './app.controller';

@Module({
  controllers: [AppApiController],
})
export class AppApiModule {}
