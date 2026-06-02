import { Module } from '@nestjs/common';
import { ExcelController } from './excel.controller';
import { ExcelService } from './excel.service';
import { FilesService } from 'src/files/files.service';

@Module({
  controllers: [ExcelController],
  providers: [ExcelService, FilesService]
})
export class ExcelModule {}
