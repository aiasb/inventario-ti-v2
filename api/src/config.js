import 'dotenv/config';

export const config = {
  port: parseInt(process.env.API_PORT || '3000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'inventario',
    password: process.env.DB_PASSWORD || 'inventario',
    database: process.env.DB_NAME || 'inventario_ti',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8080')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  uploadsDir: process.env.UPLOADS_DIR || 'src/uploads',
  // Diretório NÃO servido estaticamente — guarda modelos .docx e documentos
  // gerados, que podem conter dados sensíveis (CPF etc.) e só devem ser
  // baixados através de rotas autenticadas.
  privateFilesDir: process.env.PRIVATE_FILES_DIR || 'src/private-files',
};
