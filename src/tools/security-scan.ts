import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SecurityScanService } from "../services/security-scan.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerSecurityScanTools(
  server: McpServer,
  securityScanService: SecurityScanService,
) {
  server.tool(
    "azure/security/defender/alerts/list",
    "List Microsoft Defender for Cloud security alerts for the subscription (threat detection). Requires Security Reader or equivalent.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      maxItems: z.number().min(1).max(100).default(40).describe("Maximum alerts to return"),
    },
    async ({ subscriptionId, maxItems }) => {
      try {
        const data = await securityScanService.listAlerts(subscriptionId, maxItems);
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/security/defender/assessments/list",
    "List security assessments (posture) across resources from Microsoft Defender for Cloud. Use unhealthy items as a remediation backlog.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      maxItems: z.number().min(1).max(300).default(100).describe("Maximum assessments to return"),
    },
    async ({ subscriptionId, maxItems }) => {
      try {
        const data = await securityScanService.listAssessments(subscriptionId, maxItems);
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
