import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAccessToken, getApiBaseUrl } from '../api/client';

async function compartilhar(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (!podeCompartilhar) {
    throw new Error('Compartilhamento de arquivos não disponível neste dispositivo.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

/** Baixa um PDF de relatório da API e abre o seletor nativo para visualizar/salvar/compartilhar. */
export async function baixarRelatorioPdf(path: string, filename: string, dialogTitle: string): Promise<void> {
  const url = `${getApiBaseUrl()}${path}`;
  const token = getAccessToken();

  const destino = new File(Paths.cache, filename);
  const arquivo = await File.downloadFileAsync(url, destino, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  });

  await compartilhar(arquivo.uri, 'application/pdf', dialogTitle);
}

/** Gera um CSV a partir de cabeçalho + linhas e abre o seletor nativo para salvar/compartilhar. */
export async function compartilharCsv(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][],
  dialogTitle: string
): Promise<void> {
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const arquivo = new File(Paths.cache, filename);
  arquivo.create({ overwrite: true });
  arquivo.write('﻿' + csv);

  await compartilhar(arquivo.uri, 'text/csv', dialogTitle);
}
