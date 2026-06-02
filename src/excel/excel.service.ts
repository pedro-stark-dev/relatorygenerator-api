import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class ExcelService {
  async readXlsx(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Arquivo não encontrado');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    const rows = worksheet.getSheetValues() as any[];

    // 📌 linha 1 é lixo → ignorar
    // 📌 linha 2 é header
    const headerRow = rows[2];

    if (!headerRow) {
      throw new BadRequestException('Header não encontrado');
    }

    const headers = headerRow.slice(1).map((h: any) => String(h).trim());

    const data: any = [];

    // 📌 dados começam na linha 3
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];

      if (!row) continue;

      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header] = row[index + 1] ?? null;
      });

      data.push(obj);
    }

    return {
      sheetName: worksheet.name,
      totalRows: data.length,
      data,
    };
  }

  /**
   * Gera um relatório resumido em UMA ÚNICA PLANILHA
   */
  async generateFullReport(data: any[], outputPath?: string): Promise<Buffer> {
    if (!data || data.length === 0) {
      throw new BadRequestException('Nenhum dado para gerar o relatório');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Excel Dashboard';
    workbook.created = new Date();

    // Criar uma única planilha com tudo
    const sheet = workbook.addWorksheet('DASHBOARD RESUMIDO', {
      pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    // Calcular métricas
    const metrics = this.calculateMetrics(data);

    // Construir o relatório completo na mesma planilha
    let currentRow = 1;

    // 1. TÍTULO PRINCIPAL
    currentRow = this.addTitle(sheet, currentRow, `RELATÓRIO DE VENDAS`);

    // 2. RESULTADOS FINANCEIROS
    currentRow = this.addFinancialSummary(sheet, currentRow, metrics);

    // 3. VENDAS POR MODALIDADE (tabela)
    currentRow = this.addModalidadeTable(sheet, currentRow, metrics);

    // 4. DISTRIBUIÇÃO POR BANDEIRA (tabela)
    currentRow = this.addBandeiraTable(sheet, currentRow, metrics);

    // 5. STATUS DAS VENDAS (tabela)
    currentRow = this.addStatusTable(sheet, currentRow, metrics);

    // 6. PRAZO DE RECEBIMENTO (tabela)
    currentRow = this.addPrazoTable(sheet, currentRow, metrics);

    // 7. TOP 10 TRANSAÇÕES
    currentRow = this.addTopTransacoes(sheet, currentRow, data);

    // 8. RODAPÉ
    this.addFooter(sheet, currentRow, metrics);

    // Salvar arquivo se caminho fornecido
    if (outputPath) {
      const dir = join(process.cwd(), 'uploads', 'processed');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const fullPath = join(dir, outputPath);
      await workbook.xlsx.writeFile(fullPath);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private calculateMetrics(data: any[]) {
    const totalVendas = data.length;
    const valorTotal = data.reduce((sum, item) => sum + (item['valor da venda original'] || 0), 0);
    const valorLiquido = data.reduce((sum, item) => {
      const liquido = item['valor líquido'] !== '-' ? parseFloat(item['valor líquido']) : 0;
      return sum + (isNaN(liquido) ? 0 : liquido);
    }, 0);
    const totalTaxas = valorTotal - valorLiquido;
    const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
    const taxaMedia = valorTotal > 0 ? (totalTaxas / valorTotal * 100).toFixed(2) : '0';

    // Vendas por modalidade
    const vendasPix = data.filter(item => item.modalidade === 'pix').length;
    const vendasDebito = data.filter(item => item.modalidade === 'débito').length;
    const vendasCredito = data.filter(item => item.modalidade === 'crédito').length;
    const valorPix = data.filter(item => item.modalidade === 'pix').reduce((sum, item) => sum + (item['valor da venda original'] || 0), 0);
    const valorDebito = data.filter(item => item.modalidade === 'débito').reduce((sum, item) => sum + (item['valor da venda original'] || 0), 0);
    const valorCredito = data.filter(item => item.modalidade === 'crédito').reduce((sum, item) => sum + (item['valor da venda original'] || 0), 0);

    // Vendas por bandeira
    const bandeiras = new Map<string, number>();
    data.forEach(item => {
      if (item.modalidade === 'débito' && item.bandeira && item.bandeira !== '-') {
        const bandeira = item.bandeira;
        bandeiras.set(bandeira, (bandeiras.get(bandeira) || 0) + 1);
      }
    });

    // Status das vendas
    const statuses = new Map<string, number>();
    data.forEach(item => {
      const status = item['status da venda'] || 'desconhecido';
      statuses.set(status, (statuses.get(status) || 0) + 1);
    });

    // Prazos de recebimento
    const prazos = new Map<string, number>();
    data.forEach(item => {
      const prazo = item['Prazo de recebimento'];
      if (prazo && prazo !== '-') {
        prazos.set(prazo, (prazos.get(prazo) || 0) + 1);
      }
    });

    return {
      totalVendas,
      valorTotal,
      valorLiquido,
      totalTaxas,
      ticketMedio,
      taxaMedia,

      vendasPix,
      vendasDebito,
      vendasCredito,

      valorPix,
      valorDebito,
      valorCredito,

      bandeiras,
      statuses,
      prazos
    };
  }

  private addTitle(sheet: ExcelJS.Worksheet, startRow: number, title: string): number {
    const titleRow = sheet.getRow(startRow);
    titleRow.getCell(1).value = title;
    titleRow.getCell(1).font = { size: 18, bold: true, color: { argb: 'FF1F2937' } };
    sheet.mergeCells(startRow, 1, startRow, 6);

    const subtitleRow = sheet.getRow(startRow + 1);
    subtitleRow.getCell(1).value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    subtitleRow.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };
    sheet.mergeCells(startRow + 1, 1, startRow + 1, 6);

    return startRow + 3;
  }

  private addFinancialSummary(sheet: ExcelJS.Worksheet, startRow: number, metrics: any): number {
    let currentRow = startRow;

    // Título da seção
    const sectionRow = sheet.getRow(currentRow);
    sectionRow.getCell(1).value = '📊 RESUMO FINANCEIRO';
    sectionRow.getCell(1).font = { size: 14, bold: true, color: { argb: 'FF10B981' } };
    sheet.mergeCells(currentRow, 1, currentRow, 6);
    currentRow += 2;

    // Cards de métricas em formato de tabela
    const metricsData = [
      ['Total de Vendas', metrics.totalVendas.toLocaleString(), '🎫 Ticket Médio', `R$ ${metrics.ticketMedio.toFixed(2)}`],
      ['Valor Total Bruto', `R$ ${metrics.valorTotal.toFixed(2)}`, '📈 Taxa MDR Média', `${metrics.taxaMedia}%`],
      ['Valor Total Líquido', `R$ ${metrics.valorLiquido.toFixed(2)}`, '💵 Vendas Débito', metrics.vendasDebito.toLocaleString()],
      ['Valor Total Líquido', `R$ ${metrics.valorLiquido.toFixed(2)}`, '💵 Vendas Crédito', metrics.vendasCredito.toLocaleString()],
      ['Total em Taxas', `R$ ${metrics.totalTaxas.toFixed(2)}`, '💳 Vendas PIX', metrics.vendasPix.toLocaleString()],
    ];

    metricsData.forEach((rowData, idx) => {
      const excelRow = sheet.getRow(currentRow + idx);
      excelRow.getCell(1).value = rowData[0];
      excelRow.getCell(1).font = { bold: true };
      excelRow.getCell(2).value = rowData[1];
      excelRow.getCell(2).font = { color: { argb: 'FF3B82F6' }, bold: true };
      excelRow.getCell(3).value = rowData[2];
      excelRow.getCell(3).font = { bold: true };
      excelRow.getCell(4).value = rowData[3];
      excelRow.getCell(4).font = { color: { argb: 'FF10B981' }, bold: true };

      // Aplicar bordas
      for (let j = 1; j <= 4; j++) {
        const cell = excelRow.getCell(j);
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });

    return currentRow + 6;
  }

  private addModalidadeTable(sheet: ExcelJS.Worksheet, startRow: number, metrics: any): number {
    let currentRow = startRow;

    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = '📊 VENDAS POR MODALIDADE';
    titleRow.getCell(1).font = { size: 14, bold: true, color: { argb: 'FF3B82F6' } };
    sheet.mergeCells(currentRow, 1, currentRow, 6);
    currentRow += 2;

    // Cabeçalho
    const headerRow = sheet.getRow(currentRow);
    headerRow.getCell(1).value = 'Modalidade';
    headerRow.getCell(2).value = 'Quantidade';
    headerRow.getCell(3).value = '% do Total';
    headerRow.getCell(4).value = 'Valor Total';
    headerRow.getCell(5).value = 'Ticket Médio';
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    });
    currentRow++;

    const modalidades = [
      { nome: 'PIX', quantidade: metrics.vendasPix, valor: metrics.valorPix },
      { nome: 'DÉBITO', quantidade: metrics.vendasDebito, valor: metrics.valorDebito },
      { nome: 'CRÉDITO', quantidade: metrics.vendasCredito, valor: metrics.valorCredito }
    ];

    modalidades.forEach(modalidade => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = modalidade.nome;
      row.getCell(2).value = modalidade.quantidade;
      const percentual = metrics.totalVendas > 0 ? ((modalidade.quantidade / metrics.totalVendas) * 100).toFixed(1) : '0';
      row.getCell(3).value = `${percentual}%`;
      row.getCell(4).value = `R$ ${modalidade.valor.toFixed(2)}`;
      const ticketMedio = modalidade.quantidade > 0 ? (modalidade.valor / modalidade.quantidade).toFixed(2) : '0';
      row.getCell(5).value = `R$ ${ticketMedio}`;
      currentRow++;
    });

    return currentRow + 2;
  }

  private addBandeiraTable(sheet: ExcelJS.Worksheet, startRow: number, metrics: any): number {
    let currentRow = startRow;

    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = '🏦 DISTRIBUIÇÃO POR BANDEIRA';
    titleRow.getCell(1).font = { size: 14, bold: true, color: { argb: 'FF8B5CF6' } };
    sheet.mergeCells(currentRow, 1, currentRow, 6);
    currentRow += 2;

    if (metrics.bandeiras.size > 0) {
      // Cabeçalho
      const headerRow = sheet.getRow(currentRow);
      headerRow.getCell(1).value = 'Bandeira';
      headerRow.getCell(2).value = 'Quantidade';
      headerRow.getCell(3).value = '% do Débito';
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
      });
      currentRow++;

      const bandeirasArray = Array.from(metrics.bandeiras.entries());
      bandeirasArray.forEach(([bandeira, quantidade]) => {
        const row = sheet.getRow(currentRow);
        row.getCell(1).value = bandeira;
        row.getCell(2).value = quantidade;
        const percentual = metrics.vendasDebito > 0 ? ((quantidade / metrics.vendasDebito) * 100).toFixed(1) : '0';
        row.getCell(3).value = `${percentual}%`;
        currentRow++;
      });
    } else {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = 'Nenhum dado de bandeira disponível';
      row.getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } };
      currentRow++;
    }

    return currentRow + 2;
  }

  private addStatusTable(sheet: ExcelJS.Worksheet, startRow: number, metrics: any): number {
    let currentRow = startRow;

    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = '✓ STATUS DAS VENDAS';
    titleRow.getCell(1).font = { size: 14, bold: true, color: { argb: 'FFF59E0B' } };
    sheet.mergeCells(currentRow, 1, currentRow, 6);
    currentRow += 2;

    // Cabeçalho
    const headerRow = sheet.getRow(currentRow);
    headerRow.getCell(1).value = 'Status';
    headerRow.getCell(2).value = 'Quantidade';
    headerRow.getCell(3).value = '% do Total';
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
    });
    currentRow++;

    const statusArray = Array.from(metrics.statuses.entries());
    statusArray.forEach(([status, quantidade]) => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = status;
      row.getCell(2).value = quantidade;
      const percentual = metrics.totalVendas > 0 ? ((quantidade / metrics.totalVendas) * 100).toFixed(1) : '0';
      row.getCell(3).value = `${percentual}%`;
      currentRow++;
    });

    return currentRow + 2;
  }

  private addPrazoTable(sheet: ExcelJS.Worksheet, startRow: number, metrics: any): number {
    let currentRow = startRow;

    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = '⏰ PRAZO DE RECEBIMENTO';
    titleRow.getCell(1).font = { size: 14, bold: true, color: { argb: 'FFEC4899' } };
    sheet.mergeCells(currentRow, 1, currentRow, 6);
    currentRow += 2;

    if (metrics.prazos.size > 0) {
      // Cabeçalho
      const headerRow = sheet.getRow(currentRow);
      headerRow.getCell(1).value = 'Prazo de Recebimento';
      headerRow.getCell(2).value = 'Quantidade';
      headerRow.getCell(3).value = '% do Total';
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEC4899' } };
      });
      currentRow++;

      const prazosArray: [string, number][] = Array.from(metrics.prazos.entries());

      // Calcular total com tipagem explícita
      let total = 0;
      for (let i = 0; i < prazosArray.length; i++) {
        total = total + (prazosArray[i][1] as number);
      }

      for (let i = 0; i < prazosArray.length; i++) {
        const prazo = prazosArray[i][0] as string;
        const quantidade = prazosArray[i][1] as number;

        const row = sheet.getRow(currentRow);
        row.getCell(1).value = prazo;
        row.getCell(2).value = quantidade;

        const percentual = total > 0 ? ((quantidade / total) * 100).toFixed(1) : '0';
        row.getCell(3).value = `${percentual}%`;
        currentRow++;
      }
    } else {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = 'Nenhum dado de prazo disponível';
      row.getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } };
      currentRow++;
    }

    return currentRow + 2;
  }

  private addTopTransacoes(sheet: ExcelJS.Worksheet, startRow: number, data: any[]): number {
    let currentRow = startRow;

    const titleRow = sheet.getRow(currentRow);
    titleRow.getCell(1).value = '🏆 TOP 10 MAIORES TRANSACÕES';
    titleRow.getCell(1).font = { size: 14, bold: true, color: { argb: 'FFF59E0B' } };
    sheet.mergeCells(currentRow, 1, currentRow, 6);
    currentRow += 2;

    // Cabeçalho
    const headerRow = sheet.getRow(currentRow);
    headerRow.getCell(1).value = 'Data';
    headerRow.getCell(2).value = 'Valor Bruto';
    headerRow.getCell(3).value = 'Modalidade';
    headerRow.getCell(4).value = 'Bandeira';
    headerRow.getCell(5).value = 'Status';
    headerRow.getCell(6).value = 'Valor Líquido';
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
    });
    currentRow++;

    const sorted = [...data].sort((a, b) =>
      (b['valor da venda original'] || 0) - (a['valor da venda original'] || 0)
    ).slice(0, 10);

    sorted.forEach(item => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = item['data da venda'] ? new Date(item['data da venda']).toLocaleDateString('pt-BR') : '-';
      row.getCell(2).value = `R$ ${(item['valor da venda original'] || 0).toFixed(2)}`;
      row.getCell(2).font = { bold: true, color: { argb: 'FF3B82F6' } };
      row.getCell(3).value = item.modalidade?.toUpperCase() || '-';
      row.getCell(4).value = item.bandeira || '-';
      row.getCell(5).value = item['status da venda'] || '-';
      const liquido = item['valor líquido'] !== '-' ? `R$ ${parseFloat(item['valor líquido']).toFixed(2)}` : '-';
      row.getCell(6).value = liquido;
      currentRow++;
    });

    return currentRow + 2;
  }

  private addFooter(sheet: ExcelJS.Worksheet, startRow: number, metrics: any): void {
    const footerRow = sheet.getRow(startRow);
    footerRow.getCell(1).value = `Relatório gerado automaticamente • Total de ${metrics.totalVendas.toLocaleString()} transações analisadas`;
    footerRow.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF9CA3AF' } };
    sheet.mergeCells(startRow, 1, startRow, 6);

    // Ajustar largura das colunas
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 25;
    sheet.getColumn(4).width = 20;
    sheet.getColumn(5).width = 15;
    sheet.getColumn(6).width = 20;
  }

  async downloadReport(data: any[]): Promise<Buffer> {
    return this.generateFullReport(data);
  }
}