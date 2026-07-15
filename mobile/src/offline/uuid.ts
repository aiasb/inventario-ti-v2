/**
 * UUID v4 sem dependência nativa — usado só como chave de deduplicação
 * client-side (header Idempotency-Key), não para fins criptográficos, então
 * Math.random() é suficiente e evita puxar mais um módulo nativo (react-
 * native-get-random-values) para o build local do Android.
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
