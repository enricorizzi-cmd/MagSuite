# Render MCP Server Usage Guide

This guide summarizes how to work with Render's hosted Model Context Protocol (MCP) server so you can manage deployments for MagSuite directly from AI tooling or scripts.

## 1. What the Render MCP Server Provides

Render exposes an official MCP endpoint that lets assistants like Cursor, Claude Code, and other MCP-aware agents manage infrastructure through natural language. The hosted server documented by Render [Render MCP Server — Render Docs](https://render.com/docs/mcp-server) currently supports tasks such as:

- Listing and inspecting services, deploys, and environments
- Triggering deploys or rollbacks for a service
- Streaming recent service logs and health information
- Managing environment variables and custom domains

Render also maintains a REST API (`https://api.render.com/v1`) that backs the MCP server. Third-party implementations like [niyogi/render-mcp](https://github.com/niyogi/render-mcp) mirror the same feature set when you prefer a self-hosted bridge.

## 2. Prerequisites

1. **Render API key** - Generate one from the Render dashboard (`Account -> API Keys`). Copy the value that starts with `rnd_`.
2. **Workspace ID and service ID** – From the service page in Render copy the `srv-...` identifier. Store it in your `.env` or Secret Manager as `RENDER_SERVICE_ID`.
3. **Local configuration file** – Ensure `.cursor/mcp.json` contains the hosted server entry:

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer ${RENDER_API_KEY}"
      }
    }
  }
}
```

Restart Cursor (or any MCP-aware IDE) after editing this file so it can negotiate the session.

## 3. Using MCP Commands in Cursor

After the restart, open the MCP command palette and use the built-in Render tools. Common commands are:

```
@render status magsuite-backend
@render deployments magsuite-backend --limit 5
@render logs magsuite-backend --tail 100
@render deploy magsuite-backend --branch main
@render rollback magsuite-backend --latest
```

Cursor will invoke the hosted MCP server, which in turn talks to the Render API with your API key. Errors returned in chat usually map 1:1 to Render API validation messages.

## 4. Automation From Scripts

While MCP covers interactive workflows, automations can call the REST API directly. All requests require the `Authorization: Bearer <RENDER_API_KEY>` header.

Useful endpoints (documented under [Render API Overview](https://render.com/docs/api)) include:

- `GET /services/{SERVICE_ID}` – inspect live status and plan
- `GET /services/{SERVICE_ID}/deploys?limit=1` – retrieve the most recent deploy
- `GET /logs?serviceId={SERVICE_ID}&limit=200` – pull recent log lines
- `POST /services/{SERVICE_ID}/deploys` – trigger a new deploy

These endpoints are what MCP uses under the hood and are referenced by the `@niyogi/render-mcp` project as well.

## 5. Working Agreement for MagSuite Deployments

1. Apply code changes and push to Git.
2. Start a deployment on Render via MCP (`@render deploy magsuite-backend`) or by triggering a Git push if auto deploy is enabled.
3. Monitor logs and deploy status until the service reaches the `live` state. The `scripts/render-monitor.js` helper (documented alongside the script) polls `/services/{SERVICE_ID}/deploys` and `/logs` every 15 seconds until the latest deploy either completes or fails.
4. If the deploy fails, inspect the streamed logs, fix the issue locally, and repeat from step 1.

Following these steps keeps our workflow aligned with Render's official guidance and ensures the assistant can reason about deployment health in real time.

## 6. References

- Render Docs – Render MCP Server: https://render.com/docs/mcp-server
- Render Docs – The Render API: https://render.com/docs/api
- GitHub – @niyogi/render-mcp: https://github.com/niyogi/render-mcp


