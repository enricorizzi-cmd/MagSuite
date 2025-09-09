const express = require('express');
const events = require('./events');

const router = express.Router();

router.post('/orders', (req, res) => {
  const order = { ...req.body, id: Date.now() };
  events.emit('order.created', order);
  res.status(201).json(order);
});

router.post('/movements', (req, res) => {
  const movement = { ...req.body, id: Date.now() };
  events.emit('movement', movement);
  res.status(201).json(movement);
});

router.post('/inventory', (req, res) => {
  const inventory = { ...req.body };
  events.emit('inventory.updated', inventory);
  res.status(200).json({ status: 'ok' });
});

module.exports = { router };
