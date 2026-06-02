// logger/logger.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, FindOptionsWhere } from 'typeorm';
import { LoggerEntity, LoggerType } from './entity/logger.entity';

@Injectable()
export class LoggerService {
  constructor(
    @InjectRepository(LoggerEntity)
    private loggerRepository: Repository<LoggerEntity>,
  ) {}

  // Buscar todos os logs com filtros
  async findAll(filters?: {
    type?: LoggerType;
    route?: string;
    username?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { type, route, username, startDate, endDate, page = 1, limit = 100 } = filters || {};
    
    const where: FindOptionsWhere<LoggerEntity> = {};
    
    if (type) where.type = type;
    if (route) where.route = route;
    if (username) where.username = username;
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = Between(startDate, new Date());
    } else if (endDate) {
      where.createdAt = Between(new Date(0), endDate);
    }

    const [data, total] = await this.loggerRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  // Buscar logs por ID
  async findOne(id: string) {
    return this.loggerRepository.findOne({
      where: { id },
    });
  }

  // Buscar logs por usuário
  async findByUser(username: string, page = 1, limit = 50) {
    return this.findAll({
      username,
      page,
      limit,
    });
  }

  // Buscar logs por rota
  async findByRoute(route: string, page = 1, limit = 50) {
    return this.findAll({
      route,
      page,
      limit,
    });
  }

  // Buscar logs por tipo
  async findByType(type: LoggerType, page = 1, limit = 50) {
    return this.findAll({
      type,
      page,
      limit,
    });
  }

  // Buscar logs de erro
  async findErrors(page = 1, limit = 50) {
    return this.findAll({
      type: LoggerType.ERROR,
      page,
      limit,
    });
  }

  // Apagar um log específico
  async deleteOne(id: string) {
    const result = await this.loggerRepository.delete(id);
    return { affected: result.affected, id };
  }

  // Apagar múltiplos logs por IDs
  async deleteMany(ids: string[]) {
    const result = await this.loggerRepository.delete(ids);
    return { affected: result.affected, ids };
  }

  // Apagar todos os logs
  async deleteAll() {
    const result = await this.loggerRepository.clear();
    return { affected: result, message: 'Todos os logs foram removidos' };
  }

  // Apagar logs antigos (mais que X dias)
  async deleteOldLogs(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const result = await this.loggerRepository.delete({
      createdAt: LessThan(date),
    });
    
    return { 
      affected: result.affected, 
      deletedUntil: date,
      message: `Logs anteriores a ${date.toLocaleDateString()} foram removidos`
    };
  }

  // Apagar logs por tipo
  async deleteByType(type: LoggerType) {
    const result = await this.loggerRepository.delete({ type });
    return { affected: result.affected, type };
  }

  // Apagar logs por usuário
  async deleteByUser(username: string) {
    const result = await this.loggerRepository.delete({ username });
    return { affected: result.affected, username };
  }

  // Apagar logs por rota
  async deleteByRoute(route: string) {
    const result = await this.loggerRepository.delete({ route });
    return { affected: result.affected, route };
  }

  // Estatísticas dos logs
  async getStats() {
    const total = await this.loggerRepository.count();
    const errors = await this.loggerRepository.count({ where: { type: LoggerType.ERROR } });
    const requests = await this.loggerRepository.count({ where: { type: LoggerType.REQUEST } });
    const responses = await this.loggerRepository.count({ where: { type: LoggerType.RESPONSE } });
    
    // Top rotas mais acessadas
    const topRoutes = await this.loggerRepository
      .createQueryBuilder('logger')
      .select('logger.route', 'route')
      .addSelect('COUNT(*)', 'count')
      .where('logger.route IS NOT NULL')
      .groupBy('logger.route')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Top usuários mais ativos
    const topUsers = await this.loggerRepository
      .createQueryBuilder('logger')
      .select('logger.username', 'username')
      .addSelect('COUNT(*)', 'count')
      .where('logger.username IS NOT NULL')
      .andWhere("logger.username != 'anonymous'")
      .groupBy('logger.username')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Média de tempo de resposta
    const avgResponseTime = await this.loggerRepository
      .createQueryBuilder('logger')
      .select('AVG(logger.responseTime)', 'average')
      .where('logger.responseTime IS NOT NULL')
      .getRawOne();

    // Logs por dia (últimos 7 dias)
    const last7Days = await this.loggerRepository
      .createQueryBuilder('logger')
      .select("DATE(logger.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where("logger.createdAt >= :date", { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
      .groupBy("DATE(logger.createdAt)")
      .orderBy("date", "DESC")
      .getRawMany();

    return {
      total,
      errors,
      requests,
      responses,
      successRate: total > 0 ? ((total - errors) / total * 100).toFixed(2) : 0,
      averageResponseTime: Math.floor(avgResponseTime?.average || 0),
      topRoutes,
      topUsers,
      last7Days,
    };
  }

  // Buscar logs com paginação avançada
  async queryLogs(options: {
    filters?: {
      type?: LoggerType;
      route?: string;
      username?: string;
      statusCode?: number;
      startDate?: Date;
      endDate?: Date;
      minResponseTime?: number;
      maxResponseTime?: number;
    };
    sort?: {
      field: keyof LoggerEntity;
      order: 'ASC' | 'DESC';
    };
    page?: number;
    limit?: number;
  }) {
    const { filters, sort, page = 1, limit = 100 } = options;
    
    const queryBuilder = this.loggerRepository.createQueryBuilder('logger');
    
    // Aplicar filtros
    if (filters) {
      if (filters.type) {
        queryBuilder.andWhere('logger.type = :type', { type: filters.type });
      }
      if (filters.route) {
        queryBuilder.andWhere('logger.route ILIKE :route', { route: `%${filters.route}%` });
      }
      if (filters.username) {
        queryBuilder.andWhere('logger.username ILIKE :username', { username: `%${filters.username}%` });
      }
      if (filters.statusCode) {
        queryBuilder.andWhere('logger.responseStatusCode = :statusCode', { statusCode: filters.statusCode });
      }
      if (filters.startDate && filters.endDate) {
        queryBuilder.andWhere('logger.createdAt BETWEEN :startDate AND :endDate', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      }
      if (filters.minResponseTime) {
        queryBuilder.andWhere('logger.responseTime >= :minTime', { minTime: filters.minResponseTime });
      }
      if (filters.maxResponseTime) {
        queryBuilder.andWhere('logger.responseTime <= :maxTime', { maxTime: filters.maxResponseTime });
      }
    }
    
    // Ordenação
    const sortField = sort?.field || 'createdAt';
    const sortOrder = sort?.order || 'DESC';
    queryBuilder.orderBy(`logger.${sortField}`, sortOrder);
    
    // Paginação
    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }
}