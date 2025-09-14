#!/usr/bin/env node

/**
 * Automated Deployment Validator
 * Validates deployment health and provides rollback capabilities
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class DeploymentValidator {
  constructor(apiKey, serviceId, baseUrl = 'https://your-app.onrender.com') {
    this.apiKey = apiKey;
    this.serviceId = serviceId;
    this.baseUrl = baseUrl;
    this.renderApiUrl = 'https://api.render.com/v1';
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
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
      req.end();
    });
  }

  async checkHealthEndpoint() {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/health`);
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        data: response.data,
        httpStatus: response.status
      };
    } catch (error) {
      return {
        status: 'unreachable',
        error: error.message
      };
    }
  }

  async checkDiagnosticsEndpoint() {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/health/diagnostics`);
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        data: response.data,
        httpStatus: response.status
      };
    } catch (error) {
      return {
        status: 'unreachable',
        error: error.message
      };
    }
  }

  async checkReadinessEndpoint() {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/readyz`);
      return {
        status: response.status === 200 ? 'ready' : 'not_ready',
        data: response.data,
        httpStatus: response.status
      };
    } catch (error) {
      return {
        status: 'unreachable',
        error: error.message
      };
    }
  }

  async getRenderServiceStatus() {
    try {
      const response = await this.makeRequest(`${this.renderApiUrl}/services/${this.serviceId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.data;
    } catch (error) {
      return { error: error.message };
    }
  }

  async getRecentDeployments() {
    try {
      const response = await this.makeRequest(`${this.renderApiUrl}/services/${this.serviceId}/deploys`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.data.slice(0, 5); // Last 5 deployments
    } catch (error) {
      return { error: error.message };
    }
  }

  async validateDeployment() {
    console.log('🔍 Starting deployment validation...');
    
    const results = {
      timestamp: new Date().toISOString(),
      health: await this.checkHealthEndpoint(),
      diagnostics: await this.checkDiagnosticsEndpoint(),
      readiness: await this.checkReadinessEndpoint(),
      renderStatus: await this.getRenderServiceStatus(),
      recentDeployments: await this.getRecentDeployments()
    };

    // Analyze results
    const issues = [];
    const warnings = [];

    // Check health endpoint
    if (results.health.status !== 'healthy') {
      issues.push({
        type: 'health_endpoint',
        severity: 'critical',
        message: `Health endpoint returned ${results.health.status}`,
        details: results.health
      });
    }

    // Check diagnostics
    if (results.diagnostics.status === 'unreachable') {
      issues.push({
        type: 'diagnostics_unreachable',
        severity: 'critical',
        message: 'Diagnostics endpoint is unreachable',
        details: results.diagnostics
      });
    } else if (results.diagnostics.data?.overall?.status === 'critical') {
      issues.push({
        type: 'critical_diagnostics',
        severity: 'critical',
        message: 'Diagnostics show critical issues',
        details: results.diagnostics.data
      });
    }

    // Check readiness
    if (results.readiness.status !== 'ready') {
      issues.push({
        type: 'not_ready',
        severity: 'critical',
        message: 'Service is not ready',
        details: results.readiness
      });
    }

    // Check Render service status
    if (results.renderStatus.status !== 'live') {
      issues.push({
        type: 'render_service',
        severity: 'critical',
        message: `Render service status: ${results.renderStatus.status}`,
        details: results.renderStatus
      });
    }

    // Check recent deployments
    const failedDeployments = results.recentDeployments.filter(d => 
      d.status === 'build_failed' || d.status === 'update_failed'
    );

    if (failedDeployments.length > 0) {
      warnings.push({
        type: 'failed_deployments',
        severity: 'warning',
        message: `${failedDeployments.length} recent deployment(s) failed`,
        details: failedDeployments
      });
    }

    results.issues = issues;
    results.warnings = warnings;
    results.overallStatus = issues.length === 0 ? 'healthy' : 'unhealthy';

    return results;
  }

  async generateReport(results) {
    const report = {
      timestamp: results.timestamp,
      overallStatus: results.overallStatus,
      summary: {
        totalIssues: results.issues.length,
        criticalIssues: results.issues.filter(i => i.severity === 'critical').length,
        warnings: results.warnings.length
      },
      issues: results.issues,
      warnings: results.warnings,
      recommendations: this.generateRecommendations(results),
      details: {
        health: results.health,
        diagnostics: results.diagnostics,
        readiness: results.readiness,
        renderStatus: results.renderStatus
      }
    };

    return report;
  }

  generateRecommendations(results) {
    const recommendations = [];

    if (results.issues.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'rollback',
        message: 'Consider rolling back to previous deployment',
        details: 'Critical issues detected that may require rollback'
      });
    }

    if (results.warnings.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'investigate',
        message: 'Investigate warning conditions',
        details: 'Non-critical issues that should be addressed'
      });
    }

    if (results.diagnostics.data?.recommendations?.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'fix_configuration',
        message: 'Address configuration issues',
        details: results.diagnostics.data.recommendations
      });
    }

    return recommendations;
  }

  async saveReport(report) {
    const reportFile = path.join(__dirname, '../logs/deployment-validation-report.json');
    const logsDir = path.dirname(reportFile);
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportFile}`);
    
    return reportFile;
  }

  async printSummary(report) {
    console.log('\n📊 Deployment Validation Summary');
    console.log('================================');
    console.log(`Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    
    if (report.issues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      report.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.message}`);
      });
    }
    
    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      report.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.severity}] ${warning.message}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.message}`);
        console.log(`   ${rec.details}`);
      });
    }
  }

  async runValidation() {
    try {
      console.log('🚀 Starting automated deployment validation...');
      
      const results = await this.validateDeployment();
      const report = await this.generateReport(results);
      
      await this.printSummary(report);
      await this.saveReport(report);
      
      console.log(`\n✅ Validation completed. Status: ${report.overallStatus}`);
      
      return report.overallStatus === 'healthy';
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const apiKey = process.env.RENDER_API_KEY || process.argv[2];
  const serviceId = process.env.RENDER_SERVICE_ID || process.argv[3];
  const baseUrl = process.env.APP_BASE_URL || process.argv[4] || 'https://your-app.onrender.com';
  
  if (!apiKey || !serviceId) {
    console.error('Usage: node deployment-validator.js <api-key> <service-id> [base-url]');
    console.error('Or set environment variables: RENDER_API_KEY, RENDER_SERVICE_ID, APP_BASE_URL');
    process.exit(1);
  }

  const validator = new DeploymentValidator(apiKey, serviceId, baseUrl);
  
  validator.runValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = DeploymentValidator;
