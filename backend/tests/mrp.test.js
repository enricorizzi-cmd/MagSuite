const { calculateReorderPoint, calculateOrderQuantity } = require('../src/mrp');

test('calculates reorder point', () => {
  expect(calculateReorderPoint(10, 2, 5)).toBe(25);
});

test('order quantity accounts for current stock', () => {
  const qty = calculateOrderQuantity(10, 2, 50, 5, 1);
  expect(qty).toBe(0);
});
