// logger/logger.controller.ts
import { Controller, Get, Delete, Query, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerEntity, LoggerType } from './entity/logger.entity';

@Controller('logs')
export class LoggerController {
  constructor(private readonly loggerService: LoggerService) {}

  // Listar todos os logs
  @Get()
  async findAll(
    @Query('type') type?: LoggerType,
    @Query('route') route?: string,
    @Query('username') username?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.loggerService.findAll({
      type,
      route,
      username,
      page: page ? +page : 1,
      limit: limit ? +limit : 100,
    });
  }

  // Buscar um log específico
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loggerService.findOne(id);
  }

  // Buscar logs de erro
  @Get('errors/list')
  async findErrors(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.loggerService.findErrors(page ? +page : 1, limit ? +limit : 50);
  }

  // Buscar logs por usuário
  @Get('user/:username')
  async findByUser(
    @Param('username') username: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.loggerService.findByUser(username, page ? +page : 1, limit ? +limit : 50);
  }

  // Buscar logs por rota
  @Get('route/:route')
  async findByRoute(
    @Param('route') route: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.loggerService.findByRoute(route, page ? +page : 1, limit ? +limit : 50);
  }

  // Estatísticas dos logs
  @Get('stats/summary')
  async getStats() {
    return this.loggerService.getStats();
  }

  // Deletar um log específico
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loggerService.deleteOne(id);
  }

  // Deletar múltiplos logs
  @Delete('batch/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMany(@Query('ids') ids: string) {
    const idsArray = ids.split(',');
    return this.loggerService.deleteMany(idsArray);
  }

  // Deletar logs antigos
  @Delete('old/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOldLogs(@Query('days') days: string) {
    return this.loggerService.deleteOldLogs(days ? +days : 30);
  }

  // Deletar logs por tipo
  @Delete('type/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteByType(@Param('type') type: LoggerType) {
    return this.loggerService.deleteByType(type);
  }

  // Deletar logs por usuário
  @Delete('user/:username')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteByUser(@Param('username') username: string) {
    return this.loggerService.deleteByUser(username);
  }

  // Deletar todos os logs (cuidado!)
  @Delete('all/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll() {
    return this.loggerService.deleteAll();
  }

  // Query avançada - Correção principal aqui
  @Get('advanced/search')
  async advancedQuery(
    @Query('type') type?: LoggerType,
    @Query('route') route?: string,
    @Query('username') username?: string,
    @Query('statusCode') statusCode?: number,
    @Query('minTime') minTime?: number,
    @Query('maxTime') maxTime?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortField') sortField?: string, // Mudar de keyof LoggerEntity para string
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Validar se o campo de ordenação existe na entidade
    const validFields: (keyof LoggerEntity)[] = [
      'id', 'type', 'route', 'method', 'ipAddress', 
      'username', 'responseStatusCode', 'responseTime', 'createdAt'
    ];
    
    const validSortField = sortField && validFields.includes(sortField as keyof LoggerEntity)
      ? sortField as keyof LoggerEntity
      : 'createdAt';

    return this.loggerService.queryLogs({
      filters: {
        type,
        route,
        username,
        statusCode: statusCode ? +statusCode : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        minResponseTime: minTime ? +minTime : undefined,
        maxResponseTime: maxTime ? +maxTime : undefined,
      },
      sort: { 
        field: validSortField, 
        order: sortOrder || 'DESC' 
      },
      page: page ? +page : 1,
      limit: limit ? +limit : 100,
    });
  }
}