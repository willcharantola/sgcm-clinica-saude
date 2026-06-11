import { Injectable } from '@nestjs/common';
import { GeneratePdfDto } from './dto/generate-pdf.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  async generate(dto: GeneratePdfDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('LAUDO DE EXAME MÉDICO', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Sistema de Gestão de Clínica Médica — SGCM', { align: 'center' });

      doc.moveDown(1.5);

      // Código de validação em destaque
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('CÓDIGO DE VALIDAÇÃO:', { continued: true })
        .font('Helvetica')
        .text(` ${dto.validationCode}`);

      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Informações principais
      this.field(doc, 'Paciente', dto.patientName);
      this.field(doc, 'Médico', `${dto.doctorName}  |  CRM: ${dto.doctorCrm}`);
      this.field(doc, 'Tipo de Exame', dto.examType);
      this.field(doc, 'Data do Exame', dto.examDate.toLocaleDateString('pt-BR'));
      this.field(doc, 'Data de Emissão', dto.issuedAt.toLocaleDateString('pt-BR'));

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Resultado
      doc.fontSize(12).font('Helvetica-Bold').text('Resultado:');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(dto.result, { lineGap: 4 });

      doc.moveDown(2);

      // Rodapé
      doc
        .fontSize(9)
        .fillColor('gray')
        .text(
          `Este laudo pode ser verificado em: /reports/validate/${dto.validationCode}`,
          { align: 'center' },
        );

      doc.end();
    });
  }

  private field(doc: any, label: string, value: string): void {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`${label}: `, { continued: true })
      .font('Helvetica')
      .text(value);
    doc.moveDown(0.3);
  }
}
