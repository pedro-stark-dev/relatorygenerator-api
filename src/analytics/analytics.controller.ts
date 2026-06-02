// analytics/analytics.controller.ts
import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Dashboard resumido para home
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboardSummary() {
    return await this.analyticsService.getDashboardSummary();
  }

  // Análise global de todas as lojas
  @Get('global')
  @HttpCode(HttpStatus.OK)
  async getGlobalAnalytics() {
    return await this.analyticsService.getGlobalAnalytics();
  }

  // Análise comparativa entre lojas
  @Get('comparative')
  @HttpCode(HttpStatus.OK)
  async getComparativeAnalytics() {
    return await this.analyticsService.getComparativeAnalytics();
  }

  // Análise de tendências (últimos N meses)
  @Get('trends')
  @HttpCode(HttpStatus.OK)
  async getTrendsAnalytics(@Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 6;
    return await this.analyticsService.getTrendsAnalytics(monthsNumber);
  }

  // Análise por loja específica
  @Get('shop/:shopName')
  @HttpCode(HttpStatus.OK)
  async getShopAnalytics(@Param('shopName') shopName: string) {
    return await this.analyticsService.getShopAnalytics(shopName);
  }

  // Resumo rápido (para cards na dashboard)
  @Get('summary/quick')
  @HttpCode(HttpStatus.OK)
  async getQuickSummary() {
    const dashboard: any = await this.analyticsService.getDashboardSummary();
    
    if (!dashboard || !dashboard.summary) {
      return {
        success: false,
        message: 'Nenhum dado encontrado',
        data: null,
      };
    }
    
    return {
      success: true,
      data: {
        totalRevenue: dashboard.summary.totalRevenue,
        totalTransactions: dashboard.summary.totalTransactions,
        totalShops: dashboard.summary.totalShops,
        totalReports: dashboard.summary.totalReports,
        averageTicket: dashboard.summary.averageTicket,
      },
    };
  }

  // Top lojas por faturamento
  @Get('top/revenue')
  @HttpCode(HttpStatus.OK)
  async getTopShopsByRevenue(@Query('limit') limit?: string) {
    const comparative: any = await this.analyticsService.getComparativeAnalytics();
    
    if (!comparative || !comparative.rankings) {
      return {
        success: false,
        message: 'Nenhum dado encontrado',
        data: [],
      };
    }
    
    const limitNumber = limit ? parseInt(limit, 10) : 5;
    return {
      success: true,
      data: comparative.rankings.byRevenue.slice(0, limitNumber),
    };
  }

  // Top lojas por ticket médio
  @Get('top/ticket')
  @HttpCode(HttpStatus.OK)
  async getTopShopsByTicket(@Query('limit') limit?: string) {
    const comparative: any = await this.analyticsService.getComparativeAnalytics();
    
    if (!comparative || !comparative.rankings) {
      return {
        success: false,
        message: 'Nenhum dado encontrado',
        data: [],
      };
    }
    
    const limitNumber = limit ? parseInt(limit, 10) : 5;
    return {
      success: true,
      data: comparative.rankings.byTicket.slice(0, limitNumber),
    };
  }

  // Análise mensal detalhada
  @Get('monthly/:year')
  @HttpCode(HttpStatus.OK)
  async getMonthlyAnalytics(@Param('year') year: string) {
    const trends: any = await this.analyticsService.getTrendsAnalytics(12);
    
    if (!trends || !trends.trends) {
      return {
        success: false,
        message: 'Nenhum dado encontrado',
        data: null,
      };
    }
    
    const yearNumber = parseInt(year, 10);
    const monthlyData = trends.trends.filter((t: any) => t.month.startsWith(year));
    
    return {
      success: true,
      data: {
        year: yearNumber,
        months: monthlyData,
        total: monthlyData.reduce((sum: number, m: any) => sum + m.grossAmount, 0),
        average: monthlyData.length > 0 
          ? monthlyData.reduce((sum: number, m: any) => sum + m.grossAmount, 0) / monthlyData.length 
          : 0,
      },
    };
  }

  // Comparação entre duas lojas específicas
  @Get('compare')
  @HttpCode(HttpStatus.OK)
  async compareShops(
    @Query('shop1') shop1: string,
    @Query('shop2') shop2: string,
  ) {
    if (!shop1 || !shop2) {
      return {
        success: false,
        message: 'É necessário fornecer os nomes de duas lojas: shop1 e shop2',
      };
    }

    const shop1Data: any = await this.analyticsService.getShopAnalytics(shop1);
    const shop2Data: any = await this.analyticsService.getShopAnalytics(shop2);

    // Verificar se os dados existem
    if (!shop1Data || !shop1Data.data) {
      return {
        success: false,
        message: `Loja "${shop1}" não encontrada`,
      };
    }

    if (!shop2Data || !shop2Data.data) {
      return {
        success: false,
        message: `Loja "${shop2}" não encontrada`,
      };
    }

    // Calcular diferenças
    const revenueDiff = shop2Data.data.performance.totalRevenue - shop1Data.data.performance.totalRevenue;
    const revenuePercent = shop1Data.data.performance.totalRevenue > 0 
      ? (revenueDiff / shop1Data.data.performance.totalRevenue) * 100 
      : 0;

    const ticketDiff = shop2Data.data.performance.averageTicket - shop1Data.data.performance.averageTicket;
    const ticketPercent = shop1Data.data.performance.averageTicket > 0 
      ? (ticketDiff / shop1Data.data.performance.averageTicket) * 100 
      : 0;

    return {
      success: true,
      data: {
        shop1: {
          name: shop1,
          revenue: shop1Data.data.performance.totalRevenue,
          transactions: shop1Data.data.performance.totalTransactions,
          averageTicket: shop1Data.data.performance.averageTicket,
          reports: shop1Data.data.shopInfo.totalReports,
        },
        shop2: {
          name: shop2,
          revenue: shop2Data.data.performance.totalRevenue,
          transactions: shop2Data.data.performance.totalTransactions,
          averageTicket: shop2Data.data.performance.averageTicket,
          reports: shop2Data.data.shopInfo.totalReports,
        },
        comparison: {
          revenueDifference: revenueDiff,
          revenuePercentage: Number(revenuePercent.toFixed(2)),
          ticketDifference: ticketDiff,
          ticketPercentage: Number(ticketPercent.toFixed(2)),
          betterPerformer: revenueDiff > 0 ? shop2 : shop1,
        },
      },
    };
  }

  // Health check da API de analytics
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return {
      status: 'ok',
      service: 'Analytics Service',
      timestamp: new Date().toISOString(),
    };
  }
}