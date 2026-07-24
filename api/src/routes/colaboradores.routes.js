import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'colaboradores',
  columns: ['matricula', 'nome', 'funcao', 'departamento'],
  snakeToCamel: {},
  modulo: 'colaboradores',
  empresa: 'geotecnologia',
});
