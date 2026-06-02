import { Controller, Post, Body, Get, Param, Res, HttpStatus, BadRequestException, Query } from '@nestjs/common';
import type { Response } from 'express'; // Alterado para import type
import { ExcelService } from './excel.service';
import { FilesService } from '../files/files.service';
import { join } from 'path';

// Interface para resultados do processamento em lote
interface BatchProcessResult {
  filename: string;
  success: boolean;
  outputFile?: string;
  totalRows?: number;
  error?: string;
}

@Controller('excel')
export class ExcelController {
  constructor(
    private readonly excelService: ExcelService,
    private readonly filesService: FilesService,
  ) {}

  @Post('read')
  async readExcel(@Body('path') path: string) {
    if (!path) {
      throw new BadRequestException('Caminho do arquivo não informado');
    }
    return this.excelService.readXlsx(path);
  }

  @Post('read-from-upload')
  async readFromUpload(@Body('filename') filename: string, @Body('type') type: 'raw' | 'processed' = 'raw') {
    if (!filename) {
      throw new BadRequestException('Nome do arquivo não informado');
    }

    // Busca o arquivo em todas as pastas de ano/mês
    const allFiles = this.filesService.getAllFiles(type);
    const file = allFiles.files.find(f => f.name === filename);
    
    if (!file) {
      throw new BadRequestException(`Arquivo ${filename} não encontrado`);
    }

    const result = await this.excelService.readXlsx(file.path);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Arquivo lido com sucesso',
      data: result,
    };
  }

  @Post('generate-report')
  async generateReport(
    @Body('data') data: any[],
    @Body('filename') filename?: string,
  ) {
    if (!data || data.length === 0) {
      throw new BadRequestException('Nenhum dado para gerar o relatório');
    }

    const outputFileName = filename || `relatorio_${Date.now()}.xlsx`;
    const buffer = await this.excelService.generateFullReport(data, outputFileName);
    
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Relatório gerado com sucesso',
      data: {
        filename: outputFileName,
        size: buffer.length,
        sizeInMB: (buffer.length / (1024 * 1024)).toFixed(2),
      },
    };
  }

  @Post('generate-report-from-file')
  async generateReportFromFile(
    @Body('filename') filename: string,
    @Body('type') type: 'raw' | 'processed' = 'raw',
    @Body('outputFilename') outputFilename?: string,
  ) {
    if (!filename) {
      throw new BadRequestException('Nome do arquivo não informado');
    }

    // Busca o arquivo
    const allFiles = this.filesService.getAllFiles(type);
    const file = allFiles.files.find(f => f.name === filename);
    
    if (!file) {
      throw new BadRequestException(`Arquivo ${filename} não encontrado`);
    }

    // Lê o arquivo
    const readResult = await this.excelService.readXlsx(file.path);
    
    // Gera o relatório
    const outputFileName = outputFilename || `relatorio_${filename.replace('.xlsx', '')}_${Date.now()}.xlsx`;
    const buffer = await this.excelService.generateFullReport(readResult.data, outputFileName);
    
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Relatório gerado com sucesso',
      data: {
        originalFile: filename,
        reportFile: outputFileName,
        totalRows: readResult.totalRows,
        size: buffer.length,
        sizeInMB: (buffer.length / (1024 * 1024)).toFixed(2),
      },
    };
  }

  @Get('download/:filename')
  async downloadReport(@Param('filename') filename: string, @Res() res: Response) {
    if (!filename) {
      throw new BadRequestException('Nome do arquivo não informado');
    }

    // Busca o arquivo nos diretórios processed
    const allFiles = this.filesService.getAllFiles('processed');
    const file = allFiles.files.find(f => f.name === filename);
    
    if (!file) {
      throw new BadRequestException(`Arquivo ${filename} não encontrado`);
    }

    // Configura o download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', file.size);
    
    // Envia o arquivo
    const fs = require('fs');
    const stream = fs.createReadStream(file.path);
    stream.pipe(res);
  }

  @Get('preview/:filename')
  async previewReport(@Param('filename') filename: string, @Query('limit') limit?: string) {
    if (!filename) {
      throw new BadRequestException('Nome do arquivo não informado');
    }

    // Busca o arquivo
    const allFiles = this.filesService.getAllFiles('processed');
    const file = allFiles.files.find(f => f.name === filename);
    
    if (!file) {
      throw new BadRequestException(`Arquivo ${filename} não encontrado`);
    }

    // Lê o arquivo
    const result = await this.excelService.readXlsx(file.path);
    
    // Limita a quantidade de dados para preview
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const previewData = result.data.slice(0, limitNum);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Preview gerado com sucesso',
      data: {
        filename,
        totalRows: result.totalRows,
        previewRows: previewData.length,
        sheetName: result.sheetName,
        data: previewData,
        columns: Object.keys(previewData[0] || {}),
      },
    };
  }

  @Get('list-reports')
  async listReports() {
    const reports = this.filesService.getAllFiles('processed');
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Relatórios listados com sucesso',
      data: {
        reports: reports.files,
        total: reports.total,
      },
    };
  }

  @Post('generate-dashboard-report')
  async generateDashboardReport(@Body('data') data: any[]) {
    if (!data || data.length === 0) {
      throw new BadRequestException('Nenhum dado para gerar o relatório');
    }

    // Gera um relatório com nome específico para dashboard
    const dashboardName = `dashboard_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
    const buffer = await this.excelService.generateFullReport(data, dashboardName);
    
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Dashboard gerado com sucesso',
      data: {
        filename: dashboardName,
        totalRows: data.length,
        size: buffer.length,
        sizeInMB: (buffer.length / (1024 * 1024)).toFixed(2),
        downloadUrl: `/excel/download/${dashboardName}`,
      },
    };
  }

  @Post('batch-process')
  async batchProcess(@Body('filenames') filenames: string[], @Body('type') type: 'raw' | 'processed' = 'raw') {
    if (!filenames || filenames.length === 0) {
      throw new BadRequestException('Nenhum arquivo informado');
    }

    const results: BatchProcessResult[] = [];
    
    for (const filename of filenames) {
      try {
        // Busca o arquivo
        const allFiles = this.filesService.getAllFiles(type);
        const file = allFiles.files.find(f => f.name === filename);
        
        if (!file) {
          results.push({
            filename,
            success: false,
            error: 'Arquivo não encontrado',
          });
          continue;
        }

        // Lê o arquivo
        const readResult = await this.excelService.readXlsx(file.path);
        
        // Gera o relatório
        const outputFileName = `batch_${filename.replace('.xlsx', '')}_${Date.now()}.xlsx`;
        await this.excelService.generateFullReport(readResult.data, outputFileName);
        
        results.push({
          filename,
          success: true,
          outputFile: outputFileName,
          totalRows: readResult.totalRows,
        });
      } catch (error) {
        results.push({
          filename,
          success: false,
          error: error.message,
        });
      }
    }
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Processamento em lote concluído',
      data: {
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      },
    };
  }
}