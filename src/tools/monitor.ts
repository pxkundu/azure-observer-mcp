import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MonitorService } from "../services/monitor.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerMonitorTools(
  server: McpServer,
  monitorService: MonitorService,
) {
  server.tool(
    "azure/monitor/activity-log",
    "Query Azure Activity Log entries for a subscription (optionally filtered by resource group)",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Optional: filter to a specific resource group"),
      daysBack: z.number().min(1).max(90).default(1).describe("Number of days to look back (1-90, default 1)"),
      maxEvents: z.number().min(1).max(200).default(50).describe("Maximum events to return (1-200, default 50)"),
    },
    async ({ subscriptionId, resourceGroupName, daysBack, maxEvents }) => {
      try {
        const events = await monitorService.getActivityLog(subscriptionId, {
          resourceGroupName,
          daysBack,
          maxEvents,
        });
        return toolResult({ count: events.length, events });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
