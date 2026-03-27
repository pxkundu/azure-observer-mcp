import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApimService } from "../services/apim.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerApimTools(server: McpServer, apimService: ApimService) {
  server.tool(
    "azure/apim/services/list",
    "List API Management instances (API gateways). gatewayUrl is the public base URL for published APIs.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Optional: limit to one resource group"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const data = await apimService.listServices(subscriptionId, resourceGroupName);
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
