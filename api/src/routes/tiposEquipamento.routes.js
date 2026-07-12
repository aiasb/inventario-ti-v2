import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'tipos_equipamento',
  columns: ['nome', 'prefixo_hostname', 'possui_hostname'],
  snakeToCamel: { prefixo_hostname: 'prefixoHostname', possui_hostname: 'possuiHostname' },
  modulo: 'cadastros',
});
