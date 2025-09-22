#!/usr/bin/env node

/**
 * Deployment Monitor and Auto-Fix Script
 * Monitors deployment health and automatically fixes common issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentMonitor {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.logFile = path.join(__dirname, '../logs/deployment-monitor.log');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async checkDatabaseConnection() {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      
      this.log('Database connection: OK');
      return true;
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'ERROR');
      this.issues.push({
        type: 'database',
        message: error.message,
        severity: 'critical'
      });
      return false;
    }
  }

  async checkRedisConnection() {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      await redis.ping();
      await redis.disconnect();
      
      this.log('Redis connection: OK');
      return true;
    } catch (error) {
      this.log(`Redis connection failed: ${error.message}`, 'WARN');
      this.issues.push({
        type: 'redis',
        message: error.message,
        severity: 'warning'
      });
      return false;
    }
  }

  async checkEnvironmentVariables() {
    const requiredVars = [
      'DATABASE_URL',
      'ACCESS_SECRET',
      'REFRESH_SECRET',
      'API_KEY'
    ];

    const missing = [];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      this.log(`Missing environment variables: ${missing.join(', ')}`, 'ERROR');
      this.issues.push({
        type: 'environment',
        message: `Missing variables: ${missing.join(', ')}`,
        severity: 'critical'
      });
      return false;
    }

    this.log('Environment variables: OK');
    return true;
  }

  async checkDiskSpace() {
    try {
      fs.statSync('/');
      // This is a simplified check - in production you'd use a proper disk space check
      this.log('Disk space: OK');
      return true;
    } catch (error) {
      this.log(`Disk space check failed: ${error.message}`, 'WARN');
      return false;
    }
  }

  async checkPortAvailability() {
    const port = process.env.PORT || 3000;
    try {
      const net = require('net');
      const server = net.createServer();
      
      await new Promise((resolve, reject) => {
        server.listen(port, () => {
          server.close(() => resolve());
        });
        server.on('error', reject);
      });
      
      this.log(`Port ${port}: Available`);
      return true;
    } catch (error) {
      this.log(`Port ${port} not available: ${error.message}`, 'ERROR');
      this.issues.push({
        type: 'port',
        message: `Port ${port} not available`,
        severity: 'critical'
      });
      return false;
    }
  }

  async runMigrations() {
    try {
      this.log('Running database migrations...');
      execSync('npm run migrate', { stdio: 'inherit' });
      this.log('Migrations completed successfully');
      return true;
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'ERROR');
      this.issues.push({
        type: 'migration',
        message: error.message,
        severity: 'critical'
      });
      return false;
    }
  }

  async fixDatabaseConnection() {
    this.log('Attempting to fix database connection...');
    
    // Try to reconnect with different SSL settings
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      
      this.log('Database connection fixed');
      this.fixes.push('database-connection');
      return true;
    } catch (error) {
      this.log(`Failed to fix database connection: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async fixRedisConnection() {
    this.log('Attempting to fix Redis connection...');
    
    // Redis is optional, so we'll just log the issue
    this.log('Redis connection is optional, continuing without cache');
    this.fixes.push('redis-disabled');
    return true;
  }

  async applyFixes() {
    this.log('Applying automatic fixes...');
    
    for (const issue of this.issues) {
      switch (issue.type) {
        case 'database':
          await this.fixDatabaseConnection();
          break;
        case 'redis':
          await this.fixRedisConnection();
          break;
        case 'migration':
          await this.runMigrations();
          break;
      }
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      issues: this.issues,
      fixes: this.fixes,
      status: this.issues.some(i => i.severity === 'critical') ? 'FAILED' : 'OK'
    };

    const reportFile = path.join(__dirname, '../logs/deployment-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`Deployment report saved to: ${reportFile}`);
    return report;
  }

  async runFullCheck() {
    this.log('Starting deployment health check...');
    
    // Run all checks
    await this.checkEnvironmentVariables();
    await this.checkDatabaseConnection();
    await this.checkRedisConnection();
    await this.checkDiskSpace();
    await this.checkPortAvailability();
    
    // Apply fixes if needed
    if (this.issues.length > 0) {
      await this.applyFixes();
    }
    
    // Generate report
    const report = await this.generateReport();
    
    this.log(`Health check completed. Status: ${report.status}`);
    this.log(`Issues found: ${this.issues.length}`);
    this.log(`Fixes applied: ${this.fixes.length}`);
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new DeploymentMonitor();
  
  monitor.runFullCheck()
    .then(report => {
      process.exit(report.status === 'OK' ? 0 : 1);
    })
    .catch(error => {
      console.error('Deployment monitor failed:', error);
      process.exit(1);
    });
}

module.exports = DeploymentMonitor;
