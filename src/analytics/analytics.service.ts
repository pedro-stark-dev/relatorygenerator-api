// analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportEntity } from '../report/entity/report.entïty';

// Definindo interfaces para os tipos
// analytics/analytics.service.ts (adicione no início do arquivo)
export interface GlobalAnalyticsResponse {
  summary: {
    totalShops: number;
    totalReports: number;
    periodStart: Date;
    periodEnd: Date;
  };
  performance: {
    totalRevenue: number;
    totalNetRevenue: number;
    totalFees: number;
    effectiveFeeRate: number;
    totalTransactions: number;
    averageTicket: number;
    averageTransactionValue: number;
  };
  modalityDistribution: any;
  monthlyTrend: any[];
  allReports: any[];
}

export interface ShopAnalyticsResponse {
  shopInfo: {
    name: string;
    totalReports: number;
    firstReport: Date;
    lastReport: Date;
  };
  performance: {
    totalRevenue: number;
    totalNetRevenue: number;
    totalFees: number;
    effectiveFeeRate: number;
    totalTransactions: number;
    averageTicket: number;
  };
  modalityBreakdown: any;
  preferredModality: any;
  growth: any;
  monthlyEvolution: any[];
  latestReports: any[];
  allReports: any[];
}

export interface ComparativeAnalyticsResponse {
  summary: {
    totalShops: number;
    totalRevenue: number;
    averageRevenuePerShop: number;
    topPerformer: any;
  };
  rankings: {
    byRevenue: any[];
    byTicket: any[];
    byTransactions: any[];
  };
  allShops: any[];
}
export interface MonthlyEvolution {
  month: string;
  grossAmount: number;
  netAmount: number;
  transactions: number;
  date: Date;
}

export interface LatestReport {
  id: number;
  name: string;
  createdAt: Date;
  grossAmount: number;
  netAmount: number;
  transactions: number;
  averageTicket: number;
}

export interface ShopTrend {
  shop: string;
  totalGrossAmount: number;
  totalNetAmount: number;
  totalTransactions: number;
  totalReports: number;
  averageTicket: number;
  lastReport: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ReportEntity)
    private reportRepository: Repository<ReportEntity>,
  ) {}

  // Análise global de todas as lojas
  async getGlobalAnalytics() {
    const reports = await this.reportRepository.find();

    if (!reports.length) {
      return {
        message: 'Nenhum relatório encontrado',
        data: null,
      };
    }

    // Totais globais
    let totalGrossAmount = 0;
    let totalNetAmount = 0;
    let totalFees = 0;
    let totalTransactions = 0;
    let totalPixCount = 0;
    let totalPixAmount = 0;
    let totalDebitCount = 0;
    let totalDebitAmount = 0;
    let totalCreditCount = 0;
    let totalCreditAmount = 0;
    
    const shops = new Set<string>();
    const reportsByMonth: Record<string, any> = {};

    for (const report of reports) {
      totalGrossAmount += Number(report.grossTotalAmount);
      totalNetAmount += Number(report.netTotalAmount);
      totalFees += Number(report.totalFeesAmount);
      totalTransactions += report.totalSellers;
      totalPixCount += report.pixTransactionCount;
      totalPixAmount += Number(report.pixTotalAmount);
      totalDebitCount += report.debitTransactionCount;
      totalDebitAmount += Number(report.debitTotalAmount);
      totalCreditCount += report.creditTransactionCount;
      totalCreditAmount += Number(report.creditTotalAmount);
      
      shops.add(report.shop);

      // Agrupar por mês
      const monthKey = report.createdAt.toISOString().slice(0, 7);
      if (!reportsByMonth[monthKey]) {
        reportsByMonth[monthKey] = {
          month: monthKey,
          grossAmount: 0,
          netAmount: 0,
          transactions: 0,
        };
      }
      reportsByMonth[monthKey].grossAmount += Number(report.grossTotalAmount);
      reportsByMonth[monthKey].netAmount += Number(report.netTotalAmount);
      reportsByMonth[monthKey].transactions += report.totalSellers;
    }

    // Ticket médio global
    const averageTicket = totalTransactions > 0 
      ? totalGrossAmount / totalTransactions 
      : 0;

    // Taxa média efetiva
    const averageFeeRate = totalGrossAmount > 0 
      ? (totalFees / totalGrossAmount) * 100 
      : 0;

    // Distribuição por modalidade (percentual)
    const totalByModality = totalPixAmount + totalDebitAmount + totalCreditAmount;
    const modalityDistribution = {
      pix: {
        amount: totalPixAmount,
        percentage: totalByModality > 0 ? (totalPixAmount / totalByModality) * 100 : 0,
        count: totalPixCount,
      },
      debit: {
        amount: totalDebitAmount,
        percentage: totalByModality > 0 ? (totalDebitAmount / totalByModality) * 100 : 0,
        count: totalDebitCount,
      },
      credit: {
        amount: totalCreditAmount,
        percentage: totalByModality > 0 ? (totalCreditAmount / totalByModality) * 100 : 0,
        count: totalCreditCount,
      },
    };

    // Performance geral
    const performance = {
      totalRevenue: totalGrossAmount,
      totalNetRevenue: totalNetAmount,
      totalFees: totalFees,
      effectiveFeeRate: Number(averageFeeRate.toFixed(2)),
      totalTransactions: totalTransactions,
      averageTicket: Number(averageTicket.toFixed(2)),
      averageTransactionValue: totalTransactions > 0 ? Number((totalGrossAmount / totalTransactions).toFixed(2)) : 0,
    };

    return {
      summary: {
        totalShops: shops.size,
        totalReports: reports.length,
        periodStart: reports[0]?.createdAt,
        periodEnd: reports[reports.length - 1]?.createdAt,
      },
      performance,
      modalityDistribution,
      monthlyTrend: Object.values(reportsByMonth).sort((a, b) => 
        a.month.localeCompare(b.month)
      ),
      allReports: reports,
    };
  }

  // Análise por loja específica
  async getShopAnalytics(shopName: string) {
    const reports = await this.reportRepository.find({
      where: { shop: shopName },
      order: { createdAt: 'DESC' },
    });

    if (!reports.length) {
      return {
        message: `Nenhum relatório encontrado para a loja: ${shopName}`,
        data: null,
      };
    }

    // Totais da loja
    let totalGrossAmount = 0;
    let totalNetAmount = 0;
    let totalFees = 0;
    let totalTransactions = 0;
    let totalPixCount = 0;
    let totalPixAmount = 0;
    let totalDebitCount = 0;
    let totalDebitAmount = 0;
    let totalCreditCount = 0;
    let totalCreditAmount = 0;

    // Evolução mensal
    const monthlyEvolution: MonthlyEvolution[] = [];
    // Últimos relatórios
    const latestReports: LatestReport[] = [];

    for (const report of reports) {
      totalGrossAmount += Number(report.grossTotalAmount);
      totalNetAmount += Number(report.netTotalAmount);
      totalFees += Number(report.totalFeesAmount);
      totalTransactions += report.totalSellers;
      totalPixCount += report.pixTransactionCount;
      totalPixAmount += Number(report.pixTotalAmount);
      totalDebitCount += report.debitTransactionCount;
      totalDebitAmount += Number(report.debitTotalAmount);
      totalCreditCount += report.creditTransactionCount;
      totalCreditAmount += Number(report.creditTotalAmount);

      // Evolução mensal
      const monthKey = report.createdAt.toISOString().slice(0, 7);
      const existingMonth = monthlyEvolution.find(m => m.month === monthKey);
      if (existingMonth) {
        existingMonth.grossAmount += Number(report.grossTotalAmount);
        existingMonth.netAmount += Number(report.netTotalAmount);
        existingMonth.transactions += report.totalSellers;
      } else {
        monthlyEvolution.push({
          month: monthKey,
          grossAmount: Number(report.grossTotalAmount),
          netAmount: Number(report.netTotalAmount),
          transactions: report.totalSellers,
          date: report.createdAt,
        });
      }

      // Últimos 5 relatórios
      if (latestReports.length < 5) {
        latestReports.push({
          id: report.id,
          name: report.name,
          createdAt: report.createdAt,
          grossAmount: Number(report.grossTotalAmount),
          netAmount: Number(report.netTotalAmount),
          transactions: report.totalSellers,
          averageTicket: Number(report.averageTicket),
        });
      }
    }

    // Ticket médio da loja
    const averageTicket = totalTransactions > 0 
      ? totalGrossAmount / totalTransactions 
      : 0;

    // Taxa média efetiva da loja
    const averageFeeRate = totalGrossAmount > 0 
      ? (totalFees / totalGrossAmount) * 100 
      : 0;

    // Modalidade preferida da loja
    const modalityAmounts = [
      { name: 'PIX', amount: totalPixAmount, count: totalPixCount },
      { name: 'Débito', amount: totalDebitAmount, count: totalDebitCount },
      { name: 'Crédito', amount: totalCreditAmount, count: totalCreditCount },
    ];
    
    const preferredModality = modalityAmounts.reduce((prev, current) => 
      (prev.amount > current.amount) ? prev : current
    );

    // Crescimento (comparar primeiro e último relatório)
    const firstReport = reports[reports.length - 1];
    const lastReport = reports[0];
    const growth = {
      revenue: firstReport && lastReport ? 
        Number((((lastReport.grossTotalAmount - firstReport.grossTotalAmount) / firstReport.grossTotalAmount) * 100).toFixed(2)) : 0,
      transactions: firstReport && lastReport ?
        Number((((lastReport.totalSellers - firstReport.totalSellers) / firstReport.totalSellers) * 100).toFixed(2)) : 0,
      ticket: firstReport && lastReport ?
        Number((((lastReport.averageTicket - firstReport.averageTicket) / firstReport.averageTicket) * 100).toFixed(2)) : 0,
    };

    return {
      shopInfo: {
        name: shopName,
        totalReports: reports.length,
        firstReport: reports[reports.length - 1]?.createdAt,
        lastReport: reports[0]?.createdAt,
      },
      performance: {
        totalRevenue: Number(totalGrossAmount.toFixed(2)),
        totalNetRevenue: Number(totalNetAmount.toFixed(2)),
        totalFees: Number(totalFees.toFixed(2)),
        effectiveFeeRate: Number(averageFeeRate.toFixed(2)),
        totalTransactions: totalTransactions,
        averageTicket: Number(averageTicket.toFixed(2)),
      },
      modalityBreakdown: {
        pix: {
          amount: Number(totalPixAmount.toFixed(2)),
          count: totalPixCount,
          percentage: totalTransactions > 0 ? Number(((totalPixCount / totalTransactions) * 100).toFixed(2)) : 0,
          averageValue: totalPixCount > 0 ? Number((totalPixAmount / totalPixCount).toFixed(2)) : 0,
        },
        debit: {
          amount: Number(totalDebitAmount.toFixed(2)),
          count: totalDebitCount,
          percentage: totalTransactions > 0 ? Number(((totalDebitCount / totalTransactions) * 100).toFixed(2)) : 0,
          averageValue: totalDebitCount > 0 ? Number((totalDebitAmount / totalDebitCount).toFixed(2)) : 0,
        },
        credit: {
          amount: Number(totalCreditAmount.toFixed(2)),
          count: totalCreditCount,
          percentage: totalTransactions > 0 ? Number(((totalCreditCount / totalTransactions) * 100).toFixed(2)) : 0,
          averageValue: totalCreditCount > 0 ? Number((totalCreditAmount / totalCreditCount).toFixed(2)) : 0,
        },
      },
      preferredModality,
      growth,
      monthlyEvolution: monthlyEvolution.sort((a, b) => a.month.localeCompare(b.month)),
      latestReports,
      allReports: reports,
    };
  }

  // Análise comparativa entre lojas
  async getComparativeAnalytics() {
    const reports = await this.reportRepository.find();
    
    if (!reports.length) {
      return {
        message: 'Nenhum relatório encontrado',
        data: null,
      };
    }

    // Agrupar por loja
    const shopsMap = new Map<string, ShopTrend>();
    
    for (const report of reports) {
      if (!shopsMap.has(report.shop)) {
        shopsMap.set(report.shop, {
          shop: report.shop,
          totalGrossAmount: 0,
          totalNetAmount: 0,
          totalTransactions: 0,
          totalReports: 0,
          averageTicket: 0,
          lastReport: report.createdAt,
        });
      }
      
      const shopData = shopsMap.get(report.shop)!;
      shopData.totalGrossAmount += Number(report.grossTotalAmount);
      shopData.totalNetAmount += Number(report.netTotalAmount);
      shopData.totalTransactions += report.totalSellers;
      shopData.totalReports++;
      if (report.createdAt > shopData.lastReport) {
        shopData.lastReport = report.createdAt;
      }
    }

    // Calcular ticket médio e classificar
    const shopsArray = Array.from(shopsMap.values()).map(shop => ({
      ...shop,
      averageTicket: shop.totalTransactions > 0 
        ? Number((shop.totalGrossAmount / shop.totalTransactions).toFixed(2))
        : 0,
      totalGrossAmount: Number(shop.totalGrossAmount.toFixed(2)),
      totalNetAmount: Number(shop.totalNetAmount.toFixed(2)),
    }));

    // Ordenar por faturamento
    const rankingByRevenue = [...shopsArray].sort((a, b) => 
      b.totalGrossAmount - a.totalGrossAmount
    );

    // Ordenar por ticket médio
    const rankingByTicket = [...shopsArray].sort((a, b) => 
      b.averageTicket - a.averageTicket
    );

    // Ordenar por transações
    const rankingByTransactions = [...shopsArray].sort((a, b) => 
      b.totalTransactions - a.totalTransactions
    );

    // Estatísticas gerais
    const totalRevenue = shopsArray.reduce((sum, shop) => sum + shop.totalGrossAmount, 0);
    const averageRevenue = totalRevenue / shopsArray.length;

    return {
      summary: {
        totalShops: shopsArray.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageRevenuePerShop: Number(averageRevenue.toFixed(2)),
        topPerformer: rankingByRevenue[0],
      },
      rankings: {
        byRevenue: rankingByRevenue.slice(0, 10),
        byTicket: rankingByTicket.slice(0, 10),
        byTransactions: rankingByTransactions.slice(0, 10),
      },
      allShops: shopsArray,
    };
  }

  // Análise de tendências (últimos N meses)
  async getTrendsAnalytics(months: number = 6) {
    const reports = await this.reportRepository.find({
      order: { createdAt: 'DESC' },
    });

    if (!reports.length) {
      return {
        message: 'Nenhum relatório encontrado',
        data: null,
      };
    }

    // Agrupar por mês
    const monthlyData: Record<string, any> = {};

    for (const report of reports) {
      const monthKey = report.createdAt.toISOString().slice(0, 7);
      
      // Dados mensais globais
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          grossAmount: 0,
          netAmount: 0,
          transactions: 0,
          shops: new Set<string>(),
        };
      }
      monthlyData[monthKey].grossAmount += Number(report.grossTotalAmount);
      monthlyData[monthKey].netAmount += Number(report.netTotalAmount);
      monthlyData[monthKey].transactions += report.totalSellers;
      monthlyData[monthKey].shops.add(report.shop);
    }

    // Converter para array e limitar aos últimos N meses
    const trends = Object.values(monthlyData)
      .map(item => ({
        month: item.month,
        grossAmount: Number(item.grossAmount.toFixed(2)),
        netAmount: Number(item.netAmount.toFixed(2)),
        transactions: item.transactions,
        shopsCount: item.shops.size,
        averageTicket: item.transactions > 0 ? Number((item.grossAmount / item.transactions).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-months);

    // Calcular crescimento
    const firstMonth = trends[0];
    const lastMonth = trends[trends.length - 1];
    const growth = firstMonth && lastMonth ? {
      revenue: Number((((lastMonth.grossAmount - firstMonth.grossAmount) / firstMonth.grossAmount) * 100).toFixed(2)),
      transactions: Number((((lastMonth.transactions - firstMonth.transactions) / firstMonth.transactions) * 100).toFixed(2)),
      ticket: Number((((lastMonth.averageTicket - firstMonth.averageTicket) / firstMonth.averageTicket) * 100).toFixed(2)),
    } : null;

    return {
      period: `${months} meses`,
      trends,
      growth,
    };
  }

  // Dashboard resumido para home
  async getDashboardSummary() {
    const reports = await this.reportRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });

    if (!reports.length) {
      return {
        message: 'Nenhum relatório encontrado',
        data: null,
      };
    }

    // Totais
    let totalGrossAmount = 0;
    let totalNetAmount = 0;
    let totalTransactions = 0;
    const uniqueShops = new Set<string>();

    for (const report of reports) {
      totalGrossAmount += Number(report.grossTotalAmount);
      totalNetAmount += Number(report.netTotalAmount);
      totalTransactions += report.totalSellers;
      uniqueShops.add(report.shop);
    }

    // Últimos 5 relatórios
    const lastReports = reports.slice(0, 5).map(report => ({
      id: report.id,
      name: report.name,
      shop: report.shop,
      grossAmount: Number(report.grossTotalAmount),
      createdAt: report.createdAt,
    }));

    return {
      summary: {
        totalRevenue: Number(totalGrossAmount.toFixed(2)),
        totalNetRevenue: Number(totalNetAmount.toFixed(2)),
        totalTransactions: totalTransactions,
        totalShops: uniqueShops.size,
        totalReports: reports.length,
        averageTicket: totalTransactions > 0 ? Number((totalGrossAmount / totalTransactions).toFixed(2)) : 0,
      },
      lastReports,
      quickStats: {
        revenuePerReport: reports.length > 0 ? Number((totalGrossAmount / reports.length).toFixed(2)) : 0,
        transactionsPerReport: reports.length > 0 ? Number((totalTransactions / reports.length).toFixed(2)) : 0,
      },
    };
  }
}