import PDFDocument from 'pdfkit';

/**
 * Gera um PDF tabular genérico (usado pelos relatórios de Geotecnologia) —
 * cabeçalho repetido a cada página, colunas com largura proporcional a
 * `weight`, quebra de página automática.
 */
export function renderTabularPdf({ title, subtitle, columns, rows }) {
  const landscape = columns.length > 5;
  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: landscape ? 'landscape' : 'portrait' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.font('Helvetica-Bold').fontSize(15).text(title, { align: 'center' });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9.5).fillColor('#666').text(subtitle, { align: 'center' });
    doc.fillColor('#000');
  }
  doc.moveDown(0.8);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const pageWidth = right - left;
  const totalWeight = columns.reduce((sum, c) => sum + (c.weight || 1), 0);
  const colWidths = columns.map((c) => (pageWidth * (c.weight || 1)) / totalWeight);

  function drawHeader() {
    let x = left;
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8.5);
    columns.forEach((c, i) => {
      doc.text(c.label, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    doc.moveDown(0.5);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#999').stroke();
    doc.moveDown(0.3);
  }

  drawHeader();
  doc.font('Helvetica').fontSize(8.5);

  const bottomLimit = doc.page.height - doc.page.margins.bottom - 30;
  for (const row of rows) {
    if (doc.y > bottomLimit) {
      doc.addPage();
      drawHeader();
      doc.font('Helvetica').fontSize(8.5);
    }
    let x = left;
    const y = doc.y;
    columns.forEach((c, i) => {
      const value = c.value(row);
      doc.text(value === null || value === undefined || value === '' ? '—' : String(value), x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    doc.moveDown(0.7);
  }

  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(9.5).fillColor('#777').text('Nenhum registro encontrado para os filtros selecionados.');
    doc.fillColor('#000');
  }

  doc.end();
  return done;
}
