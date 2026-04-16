/**
 * Cursor = base64-encoded JSON of the last item's sort keys.
 * Simple implementation using created_at + id as the sort key.
 */
export function encodeCursor(item) {
  if (!item) return null;
  return Buffer.from(JSON.stringify({
    created_at: item.created_at.toISOString(),
    id: item.id
  })).toString('base64url');
}

export function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch { return null; }
}

export function paginateWhere(cursor) {
  const c = decodeCursor(cursor);
  if (!c) return {};
  return {
    OR: [
      { created_at: { lt: new Date(c.created_at) } },
      { created_at: new Date(c.created_at), id: { lt: c.id } },
    ]
  };
}

/**
 * Generic paginate function for cursor-based pagination
 * @param {Object} model - Prisma model
 * @param {Object} where - Where clause
 * @param {Object} options - orderBy, cursor, limit, include
 */
export async function paginate(model, where, options = {}) {
  const { cursor, limit = 50, orderBy, include } = options;

  const items = await model.findMany({
    where: {
      ...where,
      ...paginateWhere(cursor),
    },
    orderBy: orderBy || { created_at: 'desc' },
    take: limit + 1, // Fetch one extra to determine if there's a next page
    include,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? encodeCursor(items[limit - 1]) : null;

  return {
    data,
    pagination: {
      next_cursor: nextCursor,
      has_more: hasMore,
      limit,
    },
  };
}
