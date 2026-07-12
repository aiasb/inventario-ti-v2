import fs from 'node:fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { badRequest } from './errors.js';

/**
 * Preenche um modelo .docx substituindo variáveis no formato %chave%
 * (ex.: %nome%, %cpf%, %serial%) pelos valores em `data`. Só altera os
 * trechos de texto com variáveis — o resto do arquivo (imagens, logo,
 * cabeçalho/rodapé, estilos, fontes) é copiado sem qualquer alteração,
 * então a formatação original do Word é sempre preservada no .docx gerado.
 */
export function renderDocxTemplate(templatePath, data) {
  // Lido como Buffer puro (sem conversão de encoding) para não arriscar
  // corromper conteúdo binário embutido, como imagens.
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);

  let doc;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '%', end: '%' },
      // Se o modelo tiver uma %variavel% que a gente não sabe preencher
      // (nome errado ou não suportada), vira vazio em vez do texto
      // literal "undefined" aparecer no documento.
      nullGetter: () => '',
    });
  } catch {
    throw badRequest('Arquivo .docx inválido ou corrompido.');
  }

  try {
    doc.render(data);
  } catch (err) {
    const details = err.properties?.errors?.map((e) => e.properties?.explanation).filter(Boolean);
    throw badRequest(
      'Não foi possível preencher o modelo. Verifique se as variáveis (%nome%, %cpf% etc.) estão escritas corretamente no documento.',
      details
    );
  }

  return doc.getZip().generate({ type: 'nodebuffer' });
}

/**
 * Preenche o modelo .docx (mesma lógica de renderDocxTemplate) e converte o
 * resultado para HTML, para exibir uma prévia rápida do documento na tela
 * e na impressão.
 *
 * IMPORTANTE: essa prévia é uma conversão aproximada (via mammoth), não uma
 * cópia fiel do Word. Imagens dentro do corpo do documento (ex.: uma logo
 * inserida no meio do texto) são incluídas; mas cabeçalho, rodapé e
 * formatações mais avançadas (cores, marcas d'água, layout de página) não
 * são suportados por essa conversão e não aparecem aqui — só no .docx
 * baixado, que é gerado sem essa limitação.
 */
export async function renderDocxTemplateToHtml(templatePath, data) {
  const buffer = renderDocxTemplate(templatePath, data);
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read('base64');
        return { src: `data:${image.contentType};base64,${base64}` };
      }),
    }
  );
  return html;
}
