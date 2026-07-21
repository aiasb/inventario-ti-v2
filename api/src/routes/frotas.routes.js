import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'frotas',
  columns: ['numero', 'nome'],
  snakeToCamel: {},
  modulo: 'cadastrosGeo',
  searchColumn: 'nome',
  empresa: 'geotecnologia',
});
