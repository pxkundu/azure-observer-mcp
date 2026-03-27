import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LifecycleReportService } from "../services/lifecycle-report.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerLifecycleTools(
  server: McpServer,
  lifecycleReportService: LifecycleReportService,
) {
  server.tool(
    "azure/lifecycle/devops-report",
    "Composite DevOps report: cost summary (MTD), Azure Advisor recommendations, Defender alerts, and unhealthy security assessments — optimized for Claude to plan build/deploy/operate improvements.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      includeCost: z.boolean().default(true).describe("Include Month-to-Date cost by service"),
      includeAdvisor: z.boolean().default(true).describe("Include Advisor recommendations"),
      includeSecurity: z.boolean().default(true).describe("Include Defender alerts and assessments"),
      advisorMax: z.number().min(1).max(80).default(35).describe("Max Advisor recommendations"),
      advisorCategories: z
        .array(
          z.enum([
            "Cost",
            "Security",
            "Performance",
            "OperationalExcellence",
            "HighAvailability",
          ]),
        )
        .optional()
        .describe("Optional: only include these Advisor categories"),
      securityAlertsMax: z.number().min(1).max(100).default(20),
      securityAssessmentsMax: z.number().min(1).max(300).default(80),
    },
    async ({
      subscriptionId,
      includeCost,
      includeAdvisor,
      includeSecurity,
      advisorMax,
      advisorCategories,
      securityAlertsMax,
      securityAssessmentsMax,
    }) => {
      try {
        const report = await lifecycleReportService.devOpsLifecycleReport(subscriptionId, {
          includeCost,
          includeAdvisor,
          includeSecurity,
          advisorMax,
          advisorCategories,
          securityAlertsMax,
          securityAssessmentsMax,
        });
        return toolResult(report);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
