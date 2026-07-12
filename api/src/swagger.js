import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Inventário TI — Usina Caçu — API',
      version: '1.0.0',
      description:
        'API REST de inventário de equipamentos de TI. Base para o painel web e para o futuro aplicativo Android.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Autenticação' },
      { name: 'Equipamentos' },
      { name: 'Manutenções' },
      { name: 'Termos' },
      { name: 'Usuários' },
      { name: 'Integrações' },
    ],
  },
  apis: ['./src/routes/*.js'],
});
