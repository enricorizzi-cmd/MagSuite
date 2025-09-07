const calculateReorderPoint = (avgDemand, leadTime, safetyStock = 0) => {
  if (isNaN(avgDemand) || isNaN(leadTime) || isNaN(safetyStock)) {
    throw new Error('Invalid numeric parameters');
  }
  return avgDemand * leadTime + safetyStock;
};

const calculateOrderQuantity = (avgDemand, leadTime, currentStock = 0, safetyStock = 0, reviewPeriod = 1) => {
  const rop = calculateReorderPoint(avgDemand, leadTime, safetyStock);
  const needed = rop + avgDemand * reviewPeriod - currentStock;
  return needed > 0 ? needed : 0;
};

module.exports = { calculateReorderPoint, calculateOrderQuantity };
