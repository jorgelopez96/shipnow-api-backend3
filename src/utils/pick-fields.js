export const pickFields = (data, fields) =>
  Object.fromEntries(fields.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));
