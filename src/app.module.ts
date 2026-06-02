import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ExcelModule } from './excel/excel.module';
import { FilesModule } from './files/files.module';

import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

import { User } from './user/entity/user.entity';

import { ConfigModule } from '@nestjs/config';

import { ReportModule } from './report/report.module';
import { ReportEntity } from './report/entity/report.entïty';

import { AnalyticsModule } from './analytics/analytics.module';

import { LoggerModule } from './logger/logger.module';
import { LoggerEntity } from './logger/entity/logger.entity';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'jnXXWn0owDaZYhM3DKjoJmFzpOxgq2tk@dpg-d8fj00mgvqtc739cmlrg-a',
      port: 5432,
      username: 'postgres',
      password: 'jnXXWn0owDaZYhM3DKjoJmFzpOxgq2tk',
      database: 'marinhodb',
      entities: [
        User,
        ReportEntity,
        LoggerEntity,
      ],
      synchronize: true,
    }),

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ExcelModule,
    FilesModule,
    UserModule,
    AuthModule,
    ReportModule,
    AnalyticsModule,
    LoggerModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}