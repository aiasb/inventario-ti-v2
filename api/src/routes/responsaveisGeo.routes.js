import { simpleCrudRouter } from './simpleCrud.js';

export default simpleCrudRouter({
  table: 'responsaveis_geo',
  columns: ['nome', 'matricula', 'cpf', 'area_id', 'funcao', 'departamento', 'setor', 'legenda'],
  snakeToCamel: { area_id: 'areaId' },
  modulo: 'responsaveisGeo',
  empresa: 'geotecnologia',
});
