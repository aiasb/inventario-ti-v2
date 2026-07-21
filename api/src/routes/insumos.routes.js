import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'insumos',
  columns: ['nome'],
  snakeToCamel: {},
  modulo: 'cadastrosGeo',
  empresa: 'geotecnologia',
});
