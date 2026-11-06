export const calculateOrderTotal = (items = []) => {
  const total = items.reduce((sum, { quantity, price }) => sum + quantity * price, 0);
  return Math.round(total * 100) / 100;
};
