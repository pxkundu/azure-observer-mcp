import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LogAnalyticsService } from "../services/log-analytics.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerLogAnalyticsTools(
  server: McpServer,
  logService: LogAnalyticsService,
) {
  server.tool(
    "azure/logs/workspace/list",
    "List Log Analytics workspaces — optionally scoped to a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Resource group (omit for all workspaces)"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const ws = await logService.listWorkspaces(subscriptionId, resourceGroupName);
        return toolResult({ count: ws.length, workspaces: ws });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/logs/query",
    "Run a KQL (Kusto Query Language) query against a Log Analytics workspace. Returns up to 200 rows. Extremely powerful for diagnostics, security investigations and performance analysis.",
    {
      workspaceId: z.string().describe("Log Analytics workspace ID (the GUID customerId, not the ARM resource ID)"),
      kqlQuery: z.string().describe("KQL query string, e.g. 'AzureActivity | where Level == \"Error\" | take 20'"),
      timeSpan: z.string().default("P1D").describe("ISO 8601 duration — P1D = 1 day, PT1H = 1 hour, P7D = 7 days"),
    },
    async ({ workspaceId, kqlQuery, timeSpan }) => {
      try {
        const result = await logService.queryWorkspace(workspaceId, kqlQuery, timeSpan);
        return toolResult(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
