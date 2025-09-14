#!/usr/bin/env node

/**
 * Render Deployment Helper
 * Provides utilities for managing Render deployments
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class RenderDeploymentHelper {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.render.com/v1';
    this.serviceId = process.env.RENDER_SERVICE_ID; // Set this in your environment
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

  async getServiceStatus() {
    if (!this.serviceId) {
      throw new Error('RENDER_SERVICE_ID environment variable not set');
    }

    const response = await this.makeRequest(`/services/${this.serviceId}`);
    return response.data;
  }

  async getDeployments() {
    if (!this.serviceId) {
      throw new Error('RENDER_SERVICE_ID environment variable not set');
    }

    const response = await this.makeRequest(`/services/${this.serviceId}/deploys`);
    return response.data;
  }

  async getDeploymentLogs(deployId) {
    if (!this.serviceId) {
      throw new Error('RENDER_SERVICE_ID environment variable not set');
    }

    const response = await this.makeRequest(`/services/${this.serviceId}/deploys/${deployId}/logs`);
    return response.data;
  }

  async triggerDeployment() {
    if (!this.serviceId) {
      throw new Error('RENDER_SERVICE_ID environment variable not set');
    }

    const response = await this.makeRequest(`/services/${this.serviceId}/deploys`, 'POST', {
      clearCache: true
    });
    return response.data;
  }

  async getEnvironmentVariables() {
    if (!this.serviceId) {
      throw new Error('RENDER_SERVICE_ID environment variable not set');
    }

    const response = await this.makeRequest(`/services/${this.serviceId}/env-vars`);
    return response.data;
  }

  async updateEnvironmentVariable(key, value) {
    if (!this.serviceId) {
      throw new Error('RENDER_SERVICE_ID environment variable not set');
    }

    const response = await this.makeRequest(`/services/${this.serviceId}/env-vars`, 'POST', {
      key,
      value
    });
    return response.data;
  }

  async analyzeDeploymentIssues() {
    const issues = [];
    
    try {
      // Get service status
      const service = await this.getServiceStatus();
      
      if (service.status !== 'live') {
        issues.push({
          type: 'service_status',
          severity: 'critical',
          message: `Service status: ${service.status}`,
          details: service
        });
      }

      // Get recent deployments
      const deployments = await this.getDeployments();
      const recentDeployments = deployments.slice(0, 5);

      for (const deploy of recentDeployments) {
        if (deploy.status === 'build_failed' || deploy.status === 'update_failed') {
          issues.push({
            type: 'deployment_failure',
            severity: 'critical',
            message: `Deployment ${deploy.id} failed: ${deploy.status}`,
            deployId: deploy.id,
            details: deploy
          });

          // Get logs for failed deployment
          try {
            const logs = await this.getDeploymentLogs(deploy.id);
            issues[issues.length - 1].logs = logs;
          } catch (error) {
            console.warn(`Could not fetch logs for deployment ${deploy.id}:`, error.message);
          }
        }
      }

      // Check environment variables
      const envVars = await this.getEnvironmentVariables();
      const requiredVars = ['DATABASE_URL', 'ACCESS_SECRET', 'REFRESH_SECRET', 'API_KEY'];
      
      for (const requiredVar of requiredVars) {
        const envVar = envVars.find(v => v.key === requiredVar);
        if (!envVar || !envVar.value) {
          issues.push({
            type: 'missing_env_var',
            severity: 'critical',
            message: `Missing environment variable: ${requiredVar}`,
            variable: requiredVar
          });
        }
      }

    } catch (error) {
      issues.push({
        type: 'api_error',
        severity: 'critical',
        message: `Failed to analyze deployment: ${error.message}`,
        error: error.message
      });
    }

    return issues;
  }

  async generateDeploymentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      serviceId: this.serviceId,
      issues: await this.analyzeDeploymentIssues(),
      recommendations: []
    };

    // Generate recommendations based on issues
    for (const issue of report.issues) {
      switch (issue.type) {
        case 'deployment_failure':
          report.recommendations.push({
            type: 'retry_deployment',
            message: 'Retry the failed deployment after fixing the underlying issue',
            action: `Check logs for deployment ${issue.deployId}`
          });
          break;
        case 'missing_env_var':
          report.recommendations.push({
            type: 'set_env_var',
            message: `Set the missing environment variable: ${issue.variable}`,
            action: `Use updateEnvironmentVariable('${issue.variable}', 'your_value')`
          });
          break;
        case 'service_status':
          report.recommendations.push({
            type: 'check_service',
            message: 'Service is not live, check service configuration',
            action: 'Review service settings in Render dashboard'
          });
          break;
      }
    }

    return report;
  }

  async saveReport(report) {
    const reportFile = path.join(__dirname, '../logs/render-deployment-report.json');
    const logsDir = path.dirname(reportFile);
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`Deployment report saved to: ${reportFile}`);
    
    return reportFile;
  }
}

// CLI interface
if (require.main === module) {
  const apiKey = process.env.RENDER_API_KEY || process.argv[2];
  
  if (!apiKey) {
    console.error('Please provide Render API key as environment variable RENDER_API_KEY or as first argument');
    process.exit(1);
  }

  const helper = new RenderDeploymentHelper(apiKey);
  
  helper.generateDeploymentReport()
    .then(report => {
      console.log('Deployment Analysis Report:');
      console.log('========================');
      console.log(`Issues found: ${report.issues.length}`);
      console.log(`Recommendations: ${report.recommendations.length}`);
      
      if (report.issues.length > 0) {
        console.log('\nIssues:');
        report.issues.forEach((issue, index) => {
          console.log(`${index + 1}. [${issue.severity}] ${issue.message}`);
        });
      }
      
      if (report.recommendations.length > 0) {
        console.log('\nRecommendations:');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.message}`);
          console.log(`   Action: ${rec.action}`);
        });
      }
      
      return helper.saveReport(report);
    })
    .then(reportFile => {
      console.log(`\nFull report saved to: ${reportFile}`);
    })
    .catch(error => {
      console.error('Failed to generate deployment report:', error);
      process.exit(1);
    });
}

module.exports = RenderDeploymentHelper;
