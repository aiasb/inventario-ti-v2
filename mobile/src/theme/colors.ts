export const colors = {
  bg: '#0a0d10',
  surfaceFrom: '#141b22',
  surfaceTo: '#10161c',
  border: '#232d38',
  borderSoft: '#1e2630',

  text: '#e8ecef',
  textSecondary: '#7d8a99',
  textMuted: '#54616f',

  accent: '#57b25e',
  accentGradientFrom: '#41a04f',
  accentGradientTo: '#358543',

  statusAtivo: '#57b25e',
  statusManutencao: '#e0b45c',
  statusEstoque: '#6b83e8',
  statusBaixado: '#8b96a2',

  danger: '#d95c4a',

  toastBg: '#152a1a',
  toastBorder: '#3a8f47',
} as const;

export function statusColor(status: string): string {
  switch (status) {
    case 'Ativo':
      return colors.statusAtivo;
    case 'Manutencao':
      return colors.statusManutencao;
    case 'Estoque':
      return colors.statusEstoque;
    case 'Baixado':
      return colors.statusBaixado;
    default:
      return colors.textMuted;
  }
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
