const express = require('express');
const fs = require('fs');
const { logPath } = require('./audit');

const router = express.Router();

router.get('/', (req, res) => {
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read log' });
    }
    const lines = data
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    res.json(lines);
  });
});

module.exports = { router };
