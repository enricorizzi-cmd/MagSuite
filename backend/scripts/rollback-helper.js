#!/usr/bin/env node

/**
 * Render Rollback Helper
 * Automates rollback to previous successful deployment
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class RenderRollbackHelper {
  constructor(apiKey, serviceId) {
    this.apiKey = apiKey;
    this.serviceId = serviceId;
    this.baseUrl = 'https://api.render.com/v1';
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
      }

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (error) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async getDeployments() {
    try {
      const response = await this.makeRequest(`/services/${this.serviceId}/deploys`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch deployments: ${error.message}`);
    }
  }

  async getServiceStatus() {
    try {
      const response = await this.makeRequest(`/services/${this.serviceId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch service status: ${error.message}`);
    }
  }

  async rollbackToDeployment(deployId) {
    try {
      console.log(`ðŸ”„ Rolling back to deployment ${deployId}...`);
      
      const response = await this.makeRequest(`/services/${this.serviceId}/deploys`, 'POST', {
        clearCache: true,
        commit: deployId // This would need to be the commit hash, not deploy ID
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to rollback: ${error.message}`);
    }
  }

  async findLastSuccessfulDeployment() {
    const deployments = await this.getDeployments();
    
    // Find the last successful deployment
    const successfulDeployments = deployments.filter(d => 
      d.status === 'live' && d.finishedAt
    );
    
    if (successfulDeployments.length === 0) {
      throw new Error('No successful deployments found');
    }
    
    // Sort by finishedAt date (most recent first)
    successfulDeployments.sort((a, b) => 
      new Date(b.finishedAt) - new Date(a.finishedAt)
    );
    
    return successfulDeployments[0];
  }

  async analyzeDeploymentHealth() {
    const deployments = await this.getDeployments();
    const recentDeployments = deployments.slice(0, 10);
    
    const analysis = {
      total: recentDeployments.length,
      successful: recentDeployments.filter(d => d.status === 'live').length,
      failed: recentDeployments.filter(d => 
        d.status === 'build_failed' || d.status === 'update_failed'
      ).length,
      inProgress: recentDeployments.filter(d => 
        d.status === 'building' || d.status === 'updating'
      ).length
    };
    
    return analysis;
  }

  async shouldRollback() {
    const analysis = await this.analyzeDeploymentHealth();
    const serviceStatus = await this.getServiceStatus();
    
    // Rollback conditions
    const conditions = [
      serviceStatus.status !== 'live',
      analysis.failed > analysis.successful,
      analysis.failed >= 2 // Multiple recent failures
    ];
    
    return {
      shouldRollback: conditions.some(Boolean),
      reasons: conditions.map((condition, _index) => ({
        condition: ['service_not_live', 'more_failures_than_success', 'multiple_failures'][_index],
        met: condition
      })),
      analysis,
      serviceStatus
    };
  }

  async performRollback() {
    try {
      console.log('ðŸ” Analyzing deployment health...');
      
      const rollbackDecision = await this.shouldRollback();
      
      if (!rollbackDecision.shouldRollback) {
        console.log('âœ… No rollback needed - service appears healthy');
        return {
          action: 'no_rollback',
          reason: 'Service appears healthy',
          analysis: rollbackDecision
        };
      }
      
      console.log('âš ï¸  Rollback conditions met:');
      rollbackDecision.reasons.forEach((reason, _index) => {
        if (reason.met) {
          console.log(`   - ${reason.condition}`);
        }
      });
      
      console.log('ðŸ” Finding last successful deployment...');
      const lastSuccessful = await this.findLastSuccessfulDeployment();
      
      console.log(`ðŸ“‹ Last successful deployment:`);
      console.log(`   ID: ${lastSuccessful.id}`);
      console.log(`   Commit: ${lastSuccessful.commit?.id || 'N/A'}`);
      console.log(`   Finished: ${lastSuccessful.finishedAt}`);
      console.log(`   Status: ${lastSuccessful.status}`);
      
      // Note: Actual rollback would require commit hash, not deploy ID
      console.log('âš ï¸  Note: Actual rollback requires commit hash, not deploy ID');
      console.log('   Manual rollback may be required through Render dashboard');
      
      return {
        action: 'rollback_recommended',
        targetDeployment: lastSuccessful,
        analysis: rollbackDecision,
        instructions: [
          '1. Go to Render dashboard',
          '2. Navigate to your service',
          '3. Go to Deploys tab',
          `4. Find deployment ${lastSuccessful.id}`,
          '5. Click "Deploy" to redeploy that commit'
        ]
      };
      
    } catch (error) {
      console.error('âŒ Rollback analysis failed:', error.message);
      return {
        action: 'error',
        error: error.message
      };
    }
  }

  async generateRollbackReport(result) {
    const report = {
      timestamp: new Date().toISOString(),
      serviceId: this.serviceId,
      result,
      recommendations: []
    };
    
    if (result.action === 'rollback_recommended') {
      report.recommendations.push({
        priority: 'high',
        action: 'manual_rollback',
        message: 'Perform manual rollback through Render dashboard',
        details: result.instructions
      });
    } else if (result.action === 'no_rollback') {
      report.recommendations.push({
        priority: 'low',
        action: 'monitor',
        message: 'Continue monitoring deployment health',
        details: 'Service appears stable, no immediate action needed'
      });
    }
    
    return report;
  }

  async saveReport(report) {
    const reportFile = path.join(__dirname, '../logs/rollback-report.json');
    const logsDir = path.dirname(reportFile);
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`ðŸ“„ Rollback report saved to: ${reportFile}`);
    
    return reportFile;
  }

  async printSummary(result) {
    console.log('\nðŸ“Š Rollback Analysis Summary');
    console.log('============================');
    console.log(`Action: ${result.action.toUpperCase()}`);
    
    if (result.targetDeployment) {
      console.log(`Target Deployment: ${result.targetDeployment.id}`);
      console.log(`Commit: ${result.targetDeployment.commit?.id || 'N/A'}`);
    }
    
    if (result.analysis) {
      console.log(`\nDeployment Analysis:`);
      console.log(`  Total recent deployments: ${result.analysis.analysis.total}`);
      console.log(`  Successful: ${result.analysis.analysis.successful}`);
      console.log(`  Failed: ${result.analysis.analysis.failed}`);
      console.log(`  In Progress: ${result.analysis.analysis.inProgress}`);
    }
    
    if (result.instructions) {
      console.log('\nðŸ“‹ Manual Rollback Instructions:');
      result.instructions.forEach((instruction, _index) => {
        console.log(`  ${instruction}`);
      });
    }
  }

  async runRollbackAnalysis() {
    try {
      console.log('ðŸš€ Starting rollback analysis...');
      
      const result = await this.performRollback();
      const report = await this.generateRollbackReport(result);
      
      await this.printSummary(result);
      await this.saveReport(report);
      
      console.log(`\nâœ… Rollback analysis completed. Action: ${result.action}`);
      
      return result.action !== 'error';
    } catch (error) {
      console.error('âŒ Rollback analysis failed:', error);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const apiKey = process.env.RENDER_API_KEY || process.argv[2];
  const serviceId = process.env.RENDER_SERVICE_ID || process.argv[3];
  
  if (!apiKey || !serviceId) {
    console.error('Usage: node rollback-helper.js <api-key> <service-id>');
    console.error('Or set environment variables: RENDER_API_KEY, RENDER_SERVICE_ID');
    process.exit(1);
  }

  const rollbackHelper = new RenderRollbackHelper(apiKey, serviceId);
  
  rollbackHelper.runRollbackAnalysis()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Rollback analysis failed:', error);
      process.exit(1);
    });
}

module.exports = RenderRollbackHelper;

