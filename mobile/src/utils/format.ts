export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export interface WarrantyInfo {
  days: number | null;
  percent: number; // 0-100, elapsed proportion of the warranty window
  label: string;
  tone: 'ok' | 'warning' | 'expired';
}

export function warrantyInfo(aquisicao: string | null, garantia: string | null): WarrantyInfo {
  const days = daysUntil(garantia);
  if (days === null || !aquisicao) {
    return { days: null, percent: 0, label: '—', tone: 'ok' };
  }
  const start = new Date(aquisicao).getTime();
  const end = new Date(garantia as string).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const percent = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 100;

  if (days < 0) return { days, percent: 100, label: 'expirada', tone: 'expired' };
  if (days <= 120) return { days, percent, label: `${days} dias restantes`, tone: 'warning' };
  return { days, percent, label: `${days} dias restantes`, tone: 'ok' };
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours}h`;
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

export function initials(name: string): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function nextHostname(prefix: string, existing: string[]): string {
  let max = 0;
  const re = new RegExp(`UCACU-${prefix}-(\\d+)`);
  for (const h of existing) {
    const match = h?.match(re);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `UCACU-${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ageInYears(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const acquired = new Date(iso);
  if (Number.isNaN(acquired.getTime())) return null;
  const days = (Date.now() - acquired.getTime()) / (1000 * 60 * 60 * 24);
  return days / 365.25;
}

export function formatAge(years: number | null | undefined): string {
  if (years === null || years === undefined) return '—';
  return `${years.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos`;
}
