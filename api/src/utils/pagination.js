export function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildSort(query, allowedColumns, defaultColumn) {
  let column = defaultColumn;
  let direction = 'ASC';
  if (typeof query.sort === 'string' && query.sort.length > 0) {
    let raw = query.sort;
    if (raw.startsWith('-')) {
      direction = 'DESC';
      raw = raw.slice(1);
    }
    if (allowedColumns[raw]) {
      column = allowedColumns[raw];
    }
  }
  if (typeof query.order === 'string' && ['asc', 'desc'].includes(query.order.toLowerCase())) {
    direction = query.order.toUpperCase();
  }
  return `${column} ${direction}`;
}

export function paginatedResponse({ data, total, page, limit }) {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}
