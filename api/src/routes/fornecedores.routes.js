import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'fornecedores',
  columns: ['nome', 'cnpj', 'telefone', 'email'],
  snakeToCamel: {},
  modulo: 'cadastros',
});
