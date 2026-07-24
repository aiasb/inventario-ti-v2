import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'modelos_radio',
  columns: ['codigo_chb', 'nome', 'serial', 'tipo', 'valor'],
  snakeToCamel: { codigo_chb: 'codigoChb' },
  modulo: 'cadastrosGeo',
  empresa: 'geotecnologia',
});
