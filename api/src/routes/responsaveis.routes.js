import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'responsaveis',
  columns: ['nome', 'matricula', 'cpf', 'setor_id'],
  snakeToCamel: { setor_id: 'setorId' },
  modulo: 'responsaveis',
});
