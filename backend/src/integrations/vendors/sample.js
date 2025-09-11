// Example connector plugin showing the interface
// Not used by default; register via registerPlugin('sample', require('./vendors/sample'))

// const db = require('../../db');
// const events = require('../../events');

module.exports = {
  // Pull data from external system into MagSuite
  async pull(_connector, _payload) {
    // Example: fetch new items and insert into items table
    // await db.query('INSERT INTO items(name, sku) VALUES($1,$2)', ['Item X', 'SKU-X']);
  },

  // Push local domain events to external system
  async push(_connector, _event, _payload) {
    // Example: send receiving.created payload to ERP
  },

  // Handle incoming webhooks
  async webhook(_connector, _body) {
    // Example: process incoming changes and emit local events if needed
    // events.emit('items.updated', connector.company_id, body)
  },
};
