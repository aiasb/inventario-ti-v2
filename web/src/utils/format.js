export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(value)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function warrantyStatus(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return { className: 'ok', label: '—', days: null };
  if (days < 0) return { className: 'expired', label: 'Vencida', days };
  if (days <= 120) return { className: 'warning', label: `${days}d restantes`, days };
  return { className: 'ok', label: formatDate(dateStr), days };
}

export function ageInYears(dateStr) {
  if (!dateStr) return null;
  const acquired = new Date(dateStr);
  if (Number.isNaN(acquired.getTime())) return null;
  const days = (Date.now() - acquired.getTime()) / (1000 * 60 * 60 * 24);
  return days / 365.25;
}

export function formatAge(years) {
  if (years === null || years === undefined) return '—';
  return `${years.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos`;
}

export function initials(name) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
