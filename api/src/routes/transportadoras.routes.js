import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'transportadoras',
  columns: ['nome', 'cnpj', 'telefone', 'email'],
  snakeToCamel: {},
  modulo: 'cadastrosGeo',
  empresa: 'geotecnologia',
});
