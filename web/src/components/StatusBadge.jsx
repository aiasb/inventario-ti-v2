const STATUS_MAP = {
  Ativo: { className: 'badge-ativo', label: 'Ativo' },
  Manutencao: { className: 'badge-manutencao', label: 'Manutenção' },
  Estoque: { className: 'badge-estoque', label: 'Estoque' },
  Baixado: { className: 'badge-baixado', label: 'Baixado' },
  Aberta: { className: 'badge-aberta', label: 'Aberta' },
  'Em andamento': { className: 'badge-andamento', label: 'Em andamento' },
  Concluida: { className: 'badge-concluida', label: 'Concluída' },
};

export function StatusBadge({ status, label }) {
  const cfg = STATUS_MAP[status] || { className: 'badge-estoque', label: status || '—' };
  return <span className={`badge ${cfg.className}`}>{label || cfg.label}</span>;
}
