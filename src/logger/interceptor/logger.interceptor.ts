// logger/interceptor/logger.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerEntity, LoggerType } from '../entity/logger.entity';
import { Request } from 'express';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(LoggerEntity)
    private loggerRepository: Repository<LoggerEntity>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Capturar username dos headers (enviado pelo frontend)
    const username = this.getUsernameFromHeaders(request);
    
    // Também pode tentar capturar do user (se tiver auth guard)
    const user = (request as any).user;
    const finalUsername = username || user?.username || 'anonymous';

    const logEntry = this.loggerRepository.create({
      type: LoggerType.REQUEST,
      route: request.route?.path || request.url,
      method: request.method,
      ipAddress: this.getClientIp(request),
      username: finalUsername,
    });

    const savedLog = await this.loggerRepository.save(logEntry);

    return next.handle().pipe(
      tap(async (data) => {
        const responseTime = Date.now() - startTime;
        
        await this.loggerRepository.update(savedLog.id, {
          type: LoggerType.RESPONSE,
          responseStatusCode: response.statusCode,
          responseTime: responseTime,
        });
      }),
      catchError(async (error) => {
        const responseTime = Date.now() - startTime;
        
        await this.loggerRepository.update(savedLog.id, {
          type: LoggerType.ERROR,
          responseStatusCode: error.status || 500,
          errorMessage: error.message,
          responseTime: responseTime,
        });
        
        throw error;
      }),
    );
  }

  private getClientIp(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'] as string;
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.socket?.remoteAddress || request.ip || 'unknown';
  }

  private getUsernameFromHeaders(request: Request): string | null {
    // Tentar capturar de diferentes headers que o frontend pode enviar
    const username = 
      request.headers['x-username'] ||
      request.headers['x-user-name'] ||
      request.headers['username'] ||
      request.headers['user-name'];
    
    if (username && typeof username === 'string') {
      return username;
    }
    
    // Tentar capturar do header X-User-Info (se enviar como JSON)
    const userInfo = request.headers['x-user-info'];
    if (userInfo && typeof userInfo === 'string') {
      try {
        const user = JSON.parse(userInfo);
        return user.username || user.name;
      } catch (e) {
        // Ignora erro de parse
      }
    }
    
    return null;
  }
}