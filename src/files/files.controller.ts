import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  Body,
  Query,
  HttpStatus,
  NotFoundException,
  Res,
} from '@nestjs/common';
import express from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { xlsxStorage } from './external/storage';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Post('upload-xlsx')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: xlsxStorage,
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (ext !== '.xlsx') {
          return cb(new BadRequestException('Apenas arquivos XLSX são permitidos'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    // Verifica se o arquivo foi salvo corretamente
    const fileExists = await this.filesService.fileExists('raw', file.filename);

    if (!fileExists) {
      throw new BadRequestException('Erro ao salvar o arquivo');
    }

    const fileInfo = await this.filesService.getFileInfo('raw', file.filename);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Arquivo armazenado com sucesso',
      data: {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        sizeInMB: fileInfo.sizeInMB,
        createdAt: fileInfo.createdAt,
        type: 'raw',
      },
    };
  }

  @Get()
  async getAllFiles(
    @Query('type') type?: 'raw' | 'processed',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = this.filesService.getAllFiles(type);

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginatedFiles = result.files.slice(start, end);

    return {
      statusCode: HttpStatus.OK,
      message: 'Arquivos listados com sucesso',
      data: {
        files: paginatedFiles,
        total: result.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  @Get('info/:type/:filename')
  async getFileInfo(
    @Param('type') type: 'raw' | 'processed',
    @Param('filename') filename: string,
  ) {
    const fileInfo = await this.filesService.getFileInfo(type, filename);

    return {
      statusCode: HttpStatus.OK,
      message: 'Informações do arquivo obtidas com sucesso',
      data: fileInfo,
    };
  }

  @Put('rename/:type/:oldName')
  async renameFile(
    @Param('type') type: 'raw' | 'processed',
    @Param('oldName') oldName: string,
    @Body('newName') newName: string,
  ) {
    if (!newName) {
      throw new BadRequestException('O novo nome do arquivo é obrigatório');
    }

    const result = await this.filesService.renameFile(type, oldName, newName);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: {
        oldName,
        newName: result.newName,
        oldPath: result.oldPath,
        newPath: result.newPath,
      },
    };
  }

  @Delete(':type/:filename')
  async deleteFile(
    @Param('type') type: 'raw' | 'processed',
    @Param('filename') filename: string,
  ) {
    const result = await this.filesService.deleteFile(type, filename);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: {
        deleted: result.deleted,
        path: result.path,
        filename,
      },
    };
  }

  @Delete('all/:type')
  async deleteAllFiles(
    @Param('type') type: 'raw' | 'processed',
  ) {
    const result = await this.filesService.deleteAllFiles(type);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: {
        deleted: result.deleted,
        type,
      },
    };
  }

  @Get('stats')
  async getStorageStats() {
    const stats = await this.filesService.getStorageStats();

    return {
      statusCode: HttpStatus.OK,
      message: 'Estatísticas do storage obtidas com sucesso',
      data: stats,
    };
  }

  @Post('backup/:type/:filename')
  async backupFile(
    @Param('type') type: 'raw' | 'processed',
    @Param('filename') filename: string,
  ) {
    const backupPath = await this.filesService.backupFile(type, filename);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Backup criado com sucesso',
      data: {
        originalFile: filename,
        backupPath,
        type,
      },
    };
  }

  @Get('check-exists/:type/:filename')
  async checkFileExists(
    @Param('type') type: 'raw' | 'processed',
    @Param('filename') filename: string,
  ) {
    const exists = await this.filesService.fileExists(type, filename);

    return {
      statusCode: HttpStatus.OK,
      message: 'Verificação realizada com sucesso',
      data: {
        filename,
        type,
        exists,
      },
    };
  }

  @Get('download/:type/:filename')
  async downloadFile(
    @Param('type') type: 'raw' | 'processed',
    @Param('filename') filename: string,
    @Res() res: express.Response,
  ) {
    const filePath = this.filesService.getFilePath(type, filename);

    if (!filePath) {
      throw new NotFoundException(`Arquivo ${filename} não encontrado`);
    }

    return res.download(filePath, filename);
  }
}