import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'setores',
  columns: ['nome'],
  snakeToCamel: {},
  modulo: 'cadastros',
});
