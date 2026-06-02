import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportEntity } from './entity/report.entïty';
import { ExcelModule } from 'src/excel/excel.module';
import { ExcelService } from 'src/excel/excel.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    ReportEntity
  ]),
],
  controllers: [ReportController],
  providers: [ReportService, ExcelService]
})
export class ReportModule {}
