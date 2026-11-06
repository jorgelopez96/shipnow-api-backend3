export const toErrorEntry = (message, error) => {
  if (error instanceof Error) return [`${message} ${error.message}`, { stack: error.stack }];
  return [`${message} ${String(error)}`, {}];
};
