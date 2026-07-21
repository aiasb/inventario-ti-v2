import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'fornecedores_geo',
  columns: ['nome', 'cnpj', 'telefone', 'email'],
  snakeToCamel: {},
  modulo: 'cadastrosGeo',
  empresa: 'geotecnologia',
});
