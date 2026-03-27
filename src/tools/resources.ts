import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ResourceService } from "../services/resource.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerResourceTools(
  server: McpServer,
  resourceService: ResourceService,
) {
  server.tool(
    "azure/resources/list",
    "List all resources within a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const resources = await resourceService.listResources(subscriptionId, resourceGroupName);
        return toolResult({ count: resources.length, resources });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/resources/get",
    "Get detailed information about a specific Azure resource by its full resource ID",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceId: z.string().describe("Full Azure resource ID"),
    },
    async ({ subscriptionId, resourceId }) => {
      try {
        const resource = await resourceService.getResource(subscriptionId, resourceId);
        return toolResult(resource);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
