// Trae una sola página de resultados y el total en paralelo: ningún listado devuelve la colección completa.
// Ordena del más nuevo al más viejo por _id, que siempre tiene índice. `refine` suma populate, lean, etc.
export const findPage = async (model, filter, { page, limit }, refine = (query) => query) => {
  const [items, total] = await Promise.all([
    refine(model.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit)),
    model.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
