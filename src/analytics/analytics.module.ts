import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportService } from 'src/report/report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportEntity } from 'src/report/entity/report.entïty';
import { ReportModule } from 'src/report/report.module';
import { ExcelService } from 'src/excel/excel.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReportEntity]), ReportModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportService, ExcelService]
})
export class AnalyticsModule {}
