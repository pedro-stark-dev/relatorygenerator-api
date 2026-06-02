import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  type?: 'raw' | 'processed';
}

export interface FileListResponse {
  files: FileInfo[];
  total: number;
}

@Injectable()
export class FilesService {
  /**
   * Retorna diretório base para o tipo de arquivo
   */
  getStoragePath(type: 'raw' | 'processed' = 'raw'): string {
    const dir = join(process.cwd(), 'uploads', type);
    
    fs.mkdirSync(dir, {
      recursive: true,
    });

    return dir;
  }

  /**
   * Procura um arquivo no diretório
   */
  findFile(
    type: 'raw' | 'processed',
    filename: string,
  ): string | null {
    const basePath = join(process.cwd(), 'uploads', type);

    if (!fs.existsSync(basePath)) {
      return null;
    }

    const filePath = join(basePath, filename);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }

    return null;
  }

  /**
   * Caminho completo do arquivo
   */
  getFilePath(
    type: 'raw' | 'processed',
    filename: string,
  ): string {
    const found = this.findFile(type, filename);

    if (!found) {
      throw new NotFoundException(`Arquivo ${filename} não encontrado`);
    }

    return found;
  }

  /**
   * Lista todos os arquivos
   */
  getAllFiles(type?: 'raw' | 'processed'): FileListResponse {
    const typesToScan = type ? [type] : ['raw', 'processed'];
    const allFiles: FileInfo[] = [];

    for (const currentType of typesToScan) {
      const basePath = join(process.cwd(), 'uploads', currentType);

      if (!fs.existsSync(basePath)) {
        continue;
      }

      const files = fs.readdirSync(basePath);

      for (const file of files) {
        const filePath = join(basePath, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          allFiles.push({
            name: file,
            path: filePath,
            size: stat.size,
            createdAt: stat.birthtime,
            modifiedAt: stat.mtime,
            type: currentType as 'raw' | 'processed',
          });
        }
      }
    }

    allFiles.sort(
      (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime(),
    );

    return {
      files: allFiles,
      total: allFiles.length,
    };
  }

  /**
   * Renomeia arquivo
   */
  async renameFile(
    type: 'raw' | 'processed',
    oldName: string,
    newName: string,
  ) {
    if (!newName?.trim()) {
      throw new BadRequestException('Novo nome inválido');
    }

    if (!newName.endsWith('.xlsx')) {
      throw new BadRequestException('Arquivo deve ser .xlsx');
    }

    const invalidChars = /[<>:"|?*\\/]/;
    if (invalidChars.test(newName)) {
      throw new BadRequestException('Nome contém caracteres inválidos');
    }

    const oldPath = this.findFile(type, oldName);

    if (!oldPath) {
      throw new NotFoundException(`Arquivo ${oldName} não encontrado`);
    }

    const basePath = join(process.cwd(), 'uploads', type);
    const newPath = join(basePath, newName);

    if (fs.existsSync(newPath)) {
      throw new BadRequestException(`Arquivo ${newName} já existe`);
    }

    fs.renameSync(oldPath, newPath);

    return {
      oldPath,
      newPath,
      newName,
      message: 'Arquivo renomeado com sucesso',
    };
  }

  /**
   * Remove arquivo
   */
  async deleteFile(type: 'raw' | 'processed', filename: string) {
    const filePath = this.findFile(type, filename);

    if (!filePath) {
      throw new NotFoundException(`Arquivo ${filename} não encontrado`);
    }

    fs.unlinkSync(filePath);

    return {
      deleted: true,
      path: filePath,
      message: `Arquivo ${filename} removido com sucesso`,
    };
  }

  /**
   * Remove todos os arquivos de um tipo
   */
  async deleteAllFiles(type: 'raw' | 'processed') {
    const targetPath = join(process.cwd(), 'uploads', type);

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('Diretório não encontrado');
    }

    const files = fs.readdirSync(targetPath);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = join(targetPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    return {
      deleted: deletedCount,
      message: `${deletedCount} arquivo(s) removido(s) com sucesso`,
    };
  }

  /**
   * Informações do arquivo
   */
  async getFileInfo(type: 'raw' | 'processed', filename: string) {
    const filePath = this.findFile(type, filename);

    if (!filePath) {
      throw new NotFoundException(`Arquivo ${filename} não encontrado`);
    }

    const stats = fs.statSync(filePath);

    return {
      name: filename,
      path: filePath,
      size: stats.size,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      extension: path.extname(filename),
      type,
    };
  }

  /**
   * Verifica existência
   */
  async fileExists(type: 'raw' | 'processed', filename: string): Promise<boolean> {
    return this.findFile(type, filename) !== null;
  }

  /**
   * Estatísticas do storage
   */
  async getStorageStats() {
    const result = {
      totalFiles: 0,
      totalSize: 0,
      totalSizeInMB: '0',
      byType: {
        raw: {
          files: 0,
          size: 0,
          sizeInMB: '0',
        },
        processed: {
          files: 0,
          size: 0,
          sizeInMB: '0',
        },
      },
    };

    for (const type of ['raw', 'processed'] as const) {
      const files = this.getAllFiles(type);

      let totalSize = 0;

      for (const file of files.files) {
        totalSize += file.size;
      }

      result.byType[type] = {
        files: files.total,
        size: totalSize,
        sizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
      };

      result.totalFiles += files.total;
      result.totalSize += totalSize;
    }

    result.totalSizeInMB = (result.totalSize / (1024 * 1024)).toFixed(2);

    return result;
  }

  /**
   * Cria backup
   */
  async backupFile(type: 'raw' | 'processed', filename: string): Promise<string> {
    const filePath = this.findFile(type, filename);

    if (!filePath) {
      throw new NotFoundException(`Arquivo ${filename} não encontrado`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${filename.replace('.xlsx', '')}_backup_${timestamp}.xlsx`;
    const backupPath = join(process.cwd(), 'uploads', type, backupName);

    fs.copyFileSync(filePath, backupPath);

    return backupPath;
  }
}