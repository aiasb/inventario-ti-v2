import { createApp } from './app.js';
import { runMigrations } from './migrate.js';
import { config } from './config.js';

async function main() {
  await runMigrations();
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
