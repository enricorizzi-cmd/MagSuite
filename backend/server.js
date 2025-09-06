const express = require('express');

function start(port = process.env.PORT || 3000) {
  const app = express();

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
