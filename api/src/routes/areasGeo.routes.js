import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'areas_geo',
  columns: ['nome'],
  snakeToCamel: {},
  modulo: 'cadastrosGeo',
  empresa: 'geotecnologia',
});
