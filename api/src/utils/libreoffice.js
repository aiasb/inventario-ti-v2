import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Converte um .docx (já preenchido) para PDF usando o LibreOffice em modo
 * headless, preservando a formatação original do Word (imagens, cabeçalho,
 * rodapé, estilos) — diferente da prévia HTML via mammoth, que é aproximada.
 *
 * Cada chamada usa um perfil de usuário (`-env:UserInstallation`) isolado em
 * diretório próprio, porque o LibreOffice trava a instância por perfil e
 * rejeitaria conversões concorrentes se todas usassem o perfil padrão.
 */
export async function convertDocxBufferToPdf(docxBuffer) {
  const workDir = path.join(os.tmpdir(), `termo-pdf-${randomUUID()}`);
  const profileDir = path.join(workDir, 'profile');
  fs.mkdirSync(profileDir, { recursive: true });

  const inputPath = path.join(workDir, 'termo.docx');
  fs.writeFileSync(inputPath, docxBuffer);

  try {
    await execFileAsync(
      'soffice',
      [
        '--headless',
        '--invisible',
        '--nologo',
        '--norestore',
        '--nolockcheck',
        `-env:UserInstallation=file://${profileDir}`,
        '--convert-to',
        'pdf',
        '--outdir',
        workDir,
        inputPath,
      ],
      { timeout: 60000 }
    );

    const outputPath = path.join(workDir, 'termo.pdf');
    if (!fs.existsSync(outputPath)) {
      throw new Error('LibreOffice não gerou o arquivo PDF.');
    }
    return fs.readFileSync(outputPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
