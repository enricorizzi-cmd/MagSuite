#!/usr/bin/env node

/**
 * MagSuite Deployment Automation Script
 * Orchestrates the entire deployment process with monitoring and validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentAutomation {
  constructor() {
    this.apiKey = process.env.RENDER_API_KEY;
    this.serviceId = process.env.RENDER_SERVICE_ID;
    this.baseUrl = process.env.APP_BASE_URL;
    this.logFile = path.join(__dirname, '../logs/deployment-automation.log');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async runCommand(command, description) {
    try {
      this.log(`Running: ${description}`);
      const result = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      this.log(`✅ ${description} completed successfully`);
      return { success: true, output: result };
    } catch (error) {
      this.log(`❌ ${description} failed: ${error.message}`, 'ERROR');
      return { success: false, error: error.message, output: error.stdout };
    }
  }

  async preDeploymentChecks() {
    this.log('🔍 Running pre-deployment checks...');
    
    const checks = [
      {
        command: 'npm run lint',
        description: 'Code linting'
      },
      {
        command: 'npm test',
        description: 'Unit tests'
      },
      {
        command: 'npm run deploy:monitor',
        description: 'Local deployment monitoring'
      }
    ];

    const results = [];
    for (const check of checks) {
      const result = await this.runCommand(check.command, check.description);
      results.push({ ...check, ...result });
      
      if (!result.success) {
        this.log(`❌ Pre-deployment check failed: ${check.description}`, 'ERROR');
        return { success: false, results };
      }
    }

    this.log('✅ All pre-deployment checks passed');
    return { success: true, results };
  }

  async postDeploymentValidation() {
    this.log('🔍 Running post-deployment validation...');
    
    // Wait for deployment to be ready
    this.log('⏳ Waiting for deployment to be ready...');
    await this.sleep(30000); // Wait 30 seconds
    
    const validationSteps = [
      {
        command: 'npm run deploy:validate',
        description: 'Deployment validation'
      },
      {
        command: 'npm run deploy:render',
        description: 'Render service analysis'
      }
    ];

    const results = [];
    for (const step of validationSteps) {
      const result = await this.runCommand(step.command, step.description);
      results.push({ ...step, ...result });
      
      if (!result.success) {
        this.log(`⚠️  Post-deployment validation issue: ${step.description}`, 'WARN');
      }
    }

    // Check if rollback is needed
    const rollbackResult = await this.runCommand(
      'npm run deploy:rollback',
      'Rollback analysis'
    );
    
    if (rollbackResult.success && rollbackResult.output.includes('rollback_recommended')) {
      this.log('🚨 Rollback recommended! Check rollback report for details', 'ERROR');
      return { success: false, needsRollback: true, results };
    }

    this.log('✅ Post-deployment validation completed');
    return { success: true, results };
  }

  async generateDeploymentReport(preResults, postResults) {
    const report = {
      timestamp: new Date().toISOString(),
      deployment: {
        apiKey: this.apiKey ? '***configured***' : 'missing',
        serviceId: this.serviceId || 'missing',
        baseUrl: this.baseUrl || 'missing'
      },
      preDeployment: {
        success: preResults.success,
        checks: preResults.results
      },
      postDeployment: {
        success: postResults.success,
        needsRollback: postResults.needsRollback || false,
        validations: postResults.results
      },
      overall: {
        status: preResults.success && postResults.success ? 'success' : 'failed',
        timestamp: new Date().toISOString()
      }
    };

    const reportFile = path.join(__dirname, '../logs/deployment-automation-report.json');
    const logsDir = path.dirname(reportFile);
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.log(`📄 Deployment report saved to: ${reportFile}`);
    
    return report;
  }

  async printSummary(report) {
    console.log('\n📊 Deployment Automation Summary');
    console.log('=================================');
    console.log(`Overall Status: ${report.overall.status.toUpperCase()}`);
    console.log(`Pre-deployment: ${report.preDeployment.success ? 'PASSED' : 'FAILED'}`);
    console.log(`Post-deployment: ${report.postDeployment.success ? 'PASSED' : 'FAILED'}`);
    
    if (report.postDeployment.needsRollback) {
      console.log('🚨 ROLLBACK RECOMMENDED');
    }
    
    console.log('\nPre-deployment Checks:');
    report.preDeployment.checks.forEach((check, index) => {
      const status = check.success ? '✅' : '❌';
      console.log(`  ${index + 1}. ${status} ${check.description}`);
    });
    
    console.log('\nPost-deployment Validations:');
    report.postDeployment.validations.forEach((validation, index) => {
      const status = validation.success ? '✅' : '⚠️';
      console.log(`  ${index + 1}. ${status} ${validation.description}`);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runFullDeployment() {
    try {
      this.log('🚀 Starting MagSuite deployment automation...');
      
      // Check configuration
      if (!this.apiKey || !this.serviceId || !this.baseUrl) {
        this.log('❌ Missing required configuration. Please set:', 'ERROR');
        this.log('   RENDER_API_KEY, RENDER_SERVICE_ID, APP_BASE_URL', 'ERROR');
        return false;
      }
      
      // Pre-deployment checks
      const preResults = await this.preDeploymentChecks();
      if (!preResults.success) {
        this.log('❌ Pre-deployment checks failed. Aborting deployment.', 'ERROR');
        return false;
      }
      
      this.log('📤 Deployment would be triggered here (manual step)');
      this.log('   Please trigger deployment through Render dashboard or CLI');
      
      // Post-deployment validation
      const postResults = await this.postDeploymentValidation();
      
      // Generate report
      const report = await this.generateDeploymentReport(preResults, postResults);
      await this.printSummary(report);
      
      const success = report.overall.status === 'success';
      this.log(`✅ Deployment automation completed. Status: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      return success;
      
    } catch (error) {
      this.log(`❌ Deployment automation failed: ${error.message}`, 'ERROR');
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const automation = new DeploymentAutomation();
  
  automation.runFullDeployment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Deployment automation failed:', error);
      process.exit(1);
    });
}

module.exports = DeploymentAutomation;
