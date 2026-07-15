import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAccessToken, getApiBaseUrl } from '../api/client';

/** Baixa o PDF do termo e abre o seletor nativo para visualizar/salvar/compartilhar. */
export async function visualizarBaixarTermoPdf(termoId: number, numero: string): Promise<void> {
  const url = `${getApiBaseUrl()}/termos/${termoId}/documento/pdf`;
  const token = getAccessToken();

  const destino = new File(Paths.cache, `${numero}.pdf`);
  const arquivo = await File.downloadFileAsync(url, destino, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  });

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (!podeCompartilhar) {
    throw new Error('Compartilhamento de arquivos não disponível neste dispositivo.');
  }
  await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/pdf', dialogTitle: `Termo ${numero}` });
}
