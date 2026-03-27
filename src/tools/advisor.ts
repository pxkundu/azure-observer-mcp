import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AdvisorService } from "../services/advisor.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerAdvisorTools(server: McpServer, advisorService: AdvisorService) {
  server.tool(
    "azure/advisor/recommendations/list",
    "List Azure Advisor recommendations (cost, security, reliability, performance, operational excellence). Filter by category for focused reviews.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      category: z
        .enum([
          "Cost",
          "Security",
          "Performance",
          "OperationalExcellence",
          "HighAvailability",
        ])
        .optional()
        .describe("Optional: filter to a single Advisor category"),
      maxItems: z.number().min(1).max(200).default(50).describe("Maximum recommendations to return"),
    },
    async ({ subscriptionId, category, maxItems }) => {
      try {
        const data = await advisorService.listRecommendations(subscriptionId, {
          category,
          maxItems,
        });
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
