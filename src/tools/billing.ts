import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BillingService } from "../services/billing.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerBillingTools(server: McpServer, billingService: BillingService) {
  server.tool(
    "azure/billing/cost-report",
    "Generate an Azure cost / usage report (actual cost) grouped by ServiceName, ResourceGroupName, or ResourceLocation. Requires Cost Management access.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      groupBy: z
        .enum(["ServiceName", "ResourceGroupName", "ResourceLocation"])
        .default("ServiceName")
        .describe("Dimension to aggregate cost by"),
      timeframe: z
        .enum(["MonthToDate", "TheLastMonth", "WeekToDate", "Custom"])
        .default("MonthToDate")
        .describe("Billing period preset"),
      from: z.string().optional().describe("ISO start date (required when timeframe is Custom)"),
      to: z.string().optional().describe("ISO end date (required when timeframe is Custom)"),
      maxRows: z.number().min(1).max(100).default(25).describe("Max rows to return"),
    },
    async ({ subscriptionId, groupBy, timeframe, from, to, maxRows }) => {
      try {
        const report = await billingService.costReport(subscriptionId, {
          groupBy,
          timeframe,
          from,
          to,
          maxRows,
        });
        return toolResult(report);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
