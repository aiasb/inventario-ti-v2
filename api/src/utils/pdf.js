import PDFDocument from 'pdfkit';
import { formatDateBR } from './formatDate.js';

const DEFAULT_TEXTO =
  'Declaro para os devidos fins que recebi da Usina Caçu, em perfeito estado de funcionamento, o(s) ' +
  'equipamento(s) abaixo relacionado(s), comprometendo-me a zelar pela sua guarda, conservação e uso ' +
  'adequado, respondendo civil e criminalmente por eventuais danos, extravio ou mau uso, bem como a ' +
  'devolvê-lo(s) ao término do vínculo ou quando solicitado pela empresa.';

/**
 * Gera um PDF do termo a partir dos dados já cadastrados (sem depender de um
 * modelo .docx enviado) — usado para visualização/download rápido em
 * qualquer termo, no painel web e no app mobile.
 */
export function renderTermoPdf(termo) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.font('Helvetica-Bold').fontSize(16).text(termo.modelo?.nome || 'Termo de Responsabilidade', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#555').text('Usina Caçu · Inventário de TI', { align: 'center' });
  doc.fillColor('#000');
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke();
  doc.moveDown(1);

  function campo(label, valor) {
    doc.font('Helvetica-Bold').fontSize(10.5).text(`${label}: `, { continued: true }).font('Helvetica').text(valor);
  }

  campo('Número', termo.numero);
  campo('Colaborador', termo.colaborador);
  if (termo.cargo) campo('Cargo', termo.cargo);
  campo('Data de entrega', formatDateBR(termo.data));
  campo('Assinatura', termo.assinado ? `Assinado em ${formatDateBR(termo.dataAssinatura)}` : 'Pendente');
  campo('Devolução', termo.devolvido ? `Devolvido em ${formatDateBR(termo.dataDevolucao)}` : 'Não devolvido');
  if (termo.responsavel) {
    const partes = [termo.responsavel.nome];
    if (termo.responsavel.cpf) partes.push(`CPF ${termo.responsavel.cpf}`);
    if (termo.responsavel.matricula) partes.push(`Mat. ${termo.responsavel.matricula}`);
    campo('Responsável vinculado', partes.join(' · '));
  }
  doc.moveDown(1);

  doc.font('Helvetica').fontSize(11).text(termo.modelo?.texto || DEFAULT_TEXTO, { align: 'justify' });
  doc.moveDown(1);

  if (termo.observacoes) {
    doc.font('Helvetica-Bold').fontSize(10.5).text('Observações:');
    doc.font('Helvetica').fontSize(10.5).text(termo.observacoes, { align: 'justify' });
    doc.moveDown(1);
  }

  doc.font('Helvetica-Bold').fontSize(12).text('Equipamentos entregues');
  doc.moveDown(0.4);

  const colX = { tipo: 50, modelo: 150, serial: 320, hostname: 430 };
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Tipo', colX.tipo, doc.y, { width: 95 });
  doc.text('Modelo', colX.modelo, doc.y, { width: 160 });
  const headerY = doc.y;
  doc.text('Serial', colX.serial, headerY, { width: 100 });
  doc.text('Hostname', colX.hostname, headerY, { width: 100 });
  doc.moveDown(0.6);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999').stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica').fontSize(9.5);
  for (const eq of termo.equipamentos) {
    if (doc.y > 700) doc.addPage();
    const rowY = doc.y;
    doc.text(eq.tipo || '—', colX.tipo, rowY, { width: 95 });
    doc.text(eq.modelo, colX.modelo, rowY, { width: 160 });
    doc.text(eq.serial, colX.serial, rowY, { width: 100 });
    doc.text(eq.hostname || '—', colX.hostname, rowY, { width: 100 });
    doc.moveDown(0.9);
  }
  if (termo.equipamentos.length === 0) {
    doc.font('Helvetica').fontSize(9.5).fillColor('#777').text('Nenhum equipamento vinculado.');
    doc.fillColor('#000');
  }

  if (doc.y > 680) doc.addPage();
  doc.moveDown(4);
  const sigY = doc.y;
  doc.moveTo(70, sigY).lineTo(250, sigY).strokeColor('#000').stroke();
  doc.moveTo(320, sigY).lineTo(500, sigY).stroke();
  doc.font('Helvetica').fontSize(9);
  doc.text(termo.colaborador, 70, sigY + 4, { width: 180, align: 'center' });
  doc.text('TI · Usina Caçu', 320, sigY + 4, { width: 180, align: 'center' });

  doc.end();
  return done;
}
