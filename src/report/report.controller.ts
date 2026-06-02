import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';

import { ReportService } from './report.service';
import { ReportCreateDto } from './dto/report-create.dto';
import { ReportUpdateDto } from './dto/report-update.dto';

@Controller('reports')
export class ReportController {
    constructor(
        private readonly reportService: ReportService,
    ) { }

    @Post()
    async create(
        @Body() dto: ReportCreateDto,
    ) {
        return await this.reportService.create(dto);
    }

    @Get()
    async get() {
        return await this.reportService.get();
    }

    @Get(':id')
    async getById(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return await this.reportService.getById(id);
    }
    @Get('shop/:shop')
    async getByShop(
        @Param('shop') shop: string,
    ) {
        return await this.reportService.getByShop(shop);
    }
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ReportUpdateDto,
    ) {
        return await this.reportService.update(id, dto);
    }

    @Delete(':id')
    async delete(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return await this.reportService.delete(id);
    }
}