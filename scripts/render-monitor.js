#!/usr/bin/env node
/**
 * Poll Render deploy status and logs until the latest deploy is live.
 *
 * References:
 * - Render MCP Server docs: https://render.com/docs/mcp-server
 * - Render API docs: https://render.com/docs/api
 * - Render logs endpoint: https://api-docs.render.com/reference/list-logs
 */

const API_BASE = 'https://api.render.com/v1';
const POLL_INTERVAL_MS = Number(process.env.RENDER_MONITOR_INTERVAL_MS || 15000);
const LOG_WINDOW_MINUTES = Number(process.env.RENDER_MONITOR_LOG_WINDOW_MIN || 15);

const apiKey = process.env.RENDER_API_KEY;
const defaultServiceId = process.env.RENDER_SERVICE_ID;

if (!apiKey) {
  console.error('Missing RENDER_API_KEY. Export it before running this script.');
  process.exit(1);
}

const [, , providedServiceId] = process.argv;
const serviceId = providedServiceId || defaultServiceId;

if (!serviceId) {
  console.error('Service ID not provided. Pass it as an argument or set RENDER_SERVICE_ID.');
  process.exit(1);
}

let lastLogTimestamp = new Date(Date.now() - LOG_WINDOW_MINUTES * 60 * 1000).toISOString();

async function fetchJson(path, { method = 'GET', body, searchParams } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.message || response.statusText;
    throw new Error(`Render API ${response.status}: ${message}`);
  }

  return payload;
}

function unwrapData(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && Array.isArray(value.data)) return value.data;
  if (typeof value === 'object' && value.data) return value.data;
  return value;
}

function normalizeDeploy(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return normalizeDeploy(value[0]);
  if (value.data) return normalizeDeploy(value.data);
  return value;
}

function extractLogs(value) {
  if (!value) return [];
  if (Array.isArray(value.logs)) return value.logs;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value)) return value;
  return [];
}

function getTimestamp(log) {
  return log?.timestamp || log?.createdAt || log?.time || log?.ts;
}

function getMessage(log) {
  return log?.message || log?.msg || log?.log || JSON.stringify(log);
}

function getLevel(log) {
  return log?.level || log?.severity || '';
}

async function getLatestDeploy() {
  const payload = await fetchJson(`/services/${serviceId}/deploys`, { searchParams: { limit: 1 } });
  const deploys = unwrapData(payload);
  return deploys?.[0];
}

async function getDeployById(deployId) {
  try {
    const payload = await fetchJson(`/deploys/${deployId}`);
    return normalizeDeploy(payload);
  } catch (error) {
    // Fallback to service scoped endpoint if direct lookup fails
    try {
      const payload = await fetchJson(`/services/${serviceId}/deploys/${deployId}`);
      return normalizeDeploy(payload);
    } catch (nestedError) {
      throw error;
    }
  }
}

async function streamLogs() {
  const now = new Date().toISOString();
  const params = {
    serviceId,
    limit: 200,
    startTime: lastLogTimestamp,
    endTime: now,
    sort: 'asc'
  };

  let payload;
  try {
    payload = await fetchJson('/logs', { searchParams: params });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to fetch logs: ${error.message}`);
    return;
  }

  const logs = extractLogs(payload)
    .map((entry) => ({ ...entry, _timestamp: getTimestamp(entry) }))
    .filter((entry) => entry._timestamp)
    .sort((a, b) => new Date(a._timestamp) - new Date(b._timestamp));

  for (const entry of logs) {
    if (new Date(entry._timestamp) <= new Date(lastLogTimestamp)) continue;
    const level = getLevel(entry);
    const prefix = level ? level.toUpperCase() : 'LOG';
    console.log(`[${entry._timestamp}] [${prefix}] ${getMessage(entry)}`);
    lastLogTimestamp = entry._timestamp;
  }

  if (payload?.nextEndTime) {
    lastLogTimestamp = payload.nextEndTime;
  } else if (logs.length) {
    lastLogTimestamp = logs[logs.length - 1]._timestamp;
  }
}

async function monitor() {
  console.log(`Monitoring Render service ${serviceId}. Poll interval: ${POLL_INTERVAL_MS / 1000}s.`);
  let deploy = await getLatestDeploy();

  if (!deploy) {
    console.log('No deploys found for this service. Exiting.');
    return;
  }

  console.log(`Latest deploy ID: ${deploy.id} (status: ${deploy.status})`);

  const successStates = new Set(['live']);
  const failureStates = new Set(['build_failed', 'update_failed', 'canceled', 'deactivated']);

  while (true) {
    await streamLogs();

    try {
      deploy = await getDeployById(deploy.id);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to refresh deploy status: ${error.message}`);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const status = String(deploy.status || '').toLowerCase();
    console.log(`[${new Date().toISOString()}] Deploy status: ${status}`);

    if (successStates.has(status)) {
      console.log('Deploy is live. Monitoring complete.');
      return;
    }

    if (failureStates.has(status)) {
      console.error('Deploy failed. Check logs above for details.');
      process.exit(1);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

monitor().catch((error) => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
