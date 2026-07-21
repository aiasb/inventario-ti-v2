import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { swaggerSpec } from './swagger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { idempotency } from './middleware/idempotency.js';

import authRoutes from './routes/auth.routes.js';
import equipamentosRoutes from './routes/equipamentos.routes.js';
import manutencoesRoutes from './routes/manutencoes.routes.js';
import termosRoutes from './routes/termos.routes.js';
import termoModelosRoutes from './routes/termoModelos.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import perfisRoutes from './routes/perfis.routes.js';
import setoresRoutes from './routes/setores.routes.js';
import tiposEquipamentoRoutes from './routes/tiposEquipamento.routes.js';
import fornecedoresRoutes from './routes/fornecedores.routes.js';
import responsaveisRoutes from './routes/responsaveis.routes.js';
import apiTokensRoutes from './routes/apiTokens.routes.js';
import radiosRoutes from './routes/radios.routes.js';
import manutencoesRadiosRoutes from './routes/manutencoesRadios.routes.js';
import areasGeoRoutes from './routes/areasGeo.routes.js';
import frotasRoutes from './routes/frotas.routes.js';
import responsaveisGeoRoutes from './routes/responsaveisGeo.routes.js';
import empresasRoutes from './routes/empresas.routes.js';
import statusAtivoRoutes from './routes/statusAtivo.routes.js';
import insumosRoutes from './routes/insumos.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: config.cors.origins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan('tiny'));

  app.use('/uploads', express.static(path.resolve(config.uploadsDir)));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'inventario-ti-api' }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

  const v1 = express.Router();
  v1.use(idempotency());
  v1.use('/auth', authRoutes);
  v1.use('/equipamentos', equipamentosRoutes);
  v1.use('/manutencoes', manutencoesRoutes);
  v1.use('/termos', termosRoutes);
  v1.use('/termo-modelos', termoModelosRoutes);
  v1.use('/usuarios', usuariosRoutes);
  v1.use('/perfis', perfisRoutes);
  v1.use('/setores', setoresRoutes);
  v1.use('/tipos-equipamento', tiposEquipamentoRoutes);
  v1.use('/fornecedores', fornecedoresRoutes);
  v1.use('/responsaveis', responsaveisRoutes);
  v1.use('/api-tokens', apiTokensRoutes);
  v1.use('/radios', radiosRoutes);
  v1.use('/manutencoes-radios', manutencoesRadiosRoutes);
  v1.use('/areas-geo', areasGeoRoutes);
  v1.use('/frotas', frotasRoutes);
  v1.use('/responsaveis-geo', responsaveisGeoRoutes);
  v1.use('/empresas', empresasRoutes);
  v1.use('/status-ativo', statusAtivoRoutes);
  v1.use('/insumos', insumosRoutes);
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
