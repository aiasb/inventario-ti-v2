import { simpleCrudRouter } from './simpleCrud.js';

// Cadastro compartilhado entre TI e Geotecnologia — gerido por quem tiver
// permissão em "cadastros" (TI) OU "cadastrosGeo" (Geotecnologia).
export default simpleCrudRouter({
  table: 'status_ativo',
  columns: ['nome'],
  snakeToCamel: {},
  modulo: ['cadastros', 'cadastrosGeo'],
});
