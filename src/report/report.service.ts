import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ExcelService } from 'src/excel/excel.service';

import { ReportCreateDto } from './dto/report-create.dto';
import { ReportEntity } from './entity/report.entïty';

@Injectable()
export class ReportService {
  constructor(
    private readonly excelService: ExcelService,

    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>,
  ) { }

  async create(dto: ReportCreateDto) {
    const excel = await this.excelService.readXlsx(dto.path);

    const rows = excel.data;

    if (!rows.length) {
      throw new BadRequestException(
        'Nenhum dado encontrado no XLSX',
      );
    }

    let shop = 'Sem nome';

    let grossTotalAmount = 0;
    let netTotalAmount = 0;
    let totalFeesAmount = 0;

    let pixTransactionCount = 0;
    let pixTotalAmount = 0;

    let debitTransactionCount = 0;
    let debitTotalAmount = 0;

    let creditTransactionCount = 0;
    let creditTotalAmount = 0;

    const sellers = new Set<string>();

    for (const row of rows) {
      const status = String(
        row['status da venda'] || '',
      ).toLowerCase();

      /*
        IGNORA CANCELADAS
      */

      if (
        status.includes('cancelada') ||
        status.includes('chargeback')
      ) {
        continue;
      }

      /*
        LOJA
      */

      const establishmentName =
        row['nome do estabelecimento'];

      if (establishmentName) {
        shop = establishmentName;
        sellers.add(establishmentName);
      }

      /*
        VALOR ORIGINAL
      */

      const originalAmount = Number(
        row['valor da venda original'] || 0,
      );

      /*
        VALOR LÍQUIDO
      */

      let netAmount = row['valor líquido'];

      /*
        PIX / recebimento mesmo dia
      */

      if (
        netAmount === '-' ||
        netAmount === null ||
        netAmount === undefined ||
        netAmount === ''
      ) {
        netAmount = originalAmount;
      }

      netAmount = Number(netAmount);

      /*
        TAXAS
      */

      let feesAmount =
        row[
        'valor total das taxas descontadas (MDR+recebimento automático)'
        ];

      if (
        feesAmount === '-' ||
        feesAmount === null ||
        feesAmount === undefined ||
        feesAmount === ''
      ) {
        feesAmount = 0;
      }

      feesAmount = Number(feesAmount);

      /*
        SOMATÓRIOS
      */

      grossTotalAmount += originalAmount;
      netTotalAmount += netAmount;
      totalFeesAmount += feesAmount;

      /*
        MODALIDADE
      */

      const modality = String(
        row['modalidade'] || '',
      ).toLowerCase();

      switch (modality) {
        case 'pix':
          pixTransactionCount++;
          pixTotalAmount += originalAmount;
          break;

        case 'débito':
        case 'debito':
          debitTransactionCount++;
          debitTotalAmount += originalAmount;
          break;

        case 'crédito':
        case 'credito':
          creditTransactionCount++;
          creditTotalAmount += originalAmount;
          break;
      }
    }

    /*
      TOTAL DE TRANSAÇÕES
    */

    const totalTransactions =
      pixTransactionCount +
      debitTransactionCount +
      creditTransactionCount;

    /*
      TICKET MÉDIO
    */

    let averageTicket =
      totalTransactions > 0
        ? grossTotalAmount / totalTransactions
        : 0;

    /*
      GARANTE PRECISÃO DECIMAL
    */

    grossTotalAmount = Number(
      grossTotalAmount.toFixed(2),
    );

    netTotalAmount = Number(
      netTotalAmount.toFixed(2),
    );

    totalFeesAmount = Number(
      totalFeesAmount.toFixed(2),
    );

    averageTicket = Number(
      averageTicket.toFixed(2),
    );

    const report = this.reportRepository.create({
      name: dto.name,

      shop,

      grossTotalAmount,

      totalSellers: totalTransactions,

      pixTransactionCount,
      pixTotalAmount: Number(
        pixTotalAmount.toFixed(2),
      ),

      debitTransactionCount,
      debitTotalAmount: Number(
        debitTotalAmount.toFixed(2),
      ),

      creditTransactionCount,
      creditTotalAmount: Number(
        creditTotalAmount.toFixed(2),
      ),

      netTotalAmount,

      totalFeesAmount,

      averageTicket,
    });

    return await this.reportRepository.save(report);
  }
  async get() {
    return await this.reportRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getById(id: number) {
    return await this.reportRepository.findOne({
      where: { id },
    });
  }

  async getByShop(shop: string) {
    return await this.reportRepository.find({
      where: {
        shop,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async update(id: number, data: Partial<ReportEntity>) {
    await this.reportRepository.update(id, data);

    return this.getById(id);
  }

  async delete(id: number) {
    return await this.reportRepository.delete(id);
  }
}