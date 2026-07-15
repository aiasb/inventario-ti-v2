import { createApp } from './app.js';
import { runMigrations } from './migrate.js';
import { query } from './db.js';
import { config } from './config.js';

async function main() {
  await runMigrations();
  // Chaves de idempotência só precisam sobreviver o suficiente para cobrir o
  // reenvio de operações da fila offline do app mobile — não há necessidade
  // de retê-las indefinidamente.
  await query(`DELETE FROM idempotency_keys WHERE created_at < now() - interval '7 days'`).catch((err) => {
    console.error('[api] falha ao limpar idempotency_keys antigas:', err);
  });
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[api] Inventário TI ouvindo na porta ${config.port}`);
    console.log(`[api] Documentação: http://localhost:${config.port}/api/docs`);
  });
}

main().catch((err) => {
  console.error('[api] falha ao iniciar:', err);
  process.exit(1);
});
