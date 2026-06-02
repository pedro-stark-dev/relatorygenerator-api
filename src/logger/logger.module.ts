import { Module } from '@nestjs/common';
import { LoggerController } from './logger.controller';
import { LoggerService } from './logger.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerEntity } from './entity/logger.entity';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerInterceptor } from './interceptor/logger.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([LoggerEntity])],
  controllers: [LoggerController],
  providers: [LoggerService,
     {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    }
  ]
})
export class LoggerModule {}
