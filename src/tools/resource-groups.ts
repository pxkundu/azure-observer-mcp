import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ResourceService } from "../services/resource.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerResourceGroupTools(
  server: McpServer,
  resourceService: ResourceService,
) {
  server.tool(
    "azure/resource-groups/list",
    "List all resource groups in an Azure subscription",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
    },
    async ({ subscriptionId }) => {
      try {
        const groups = await resourceService.listResourceGroups(subscriptionId);
        return toolResult({ count: groups.length, resourceGroups: groups });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/resource-groups/create",
    "Create a new resource group in an Azure subscription",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      name: z.string().describe("Resource group name"),
      location: z.string().describe("Azure region (e.g. eastus, westeurope)"),
      tags: z.record(z.string()).optional().describe("Optional tags as key-value pairs"),
    },
    async ({ subscriptionId, name, location, tags }) => {
      try {
        const result = await resourceService.createResourceGroup(
          subscriptionId, name, location, tags,
        );
        return toolResult(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/resource-groups/delete",
    "Delete a resource group and ALL its resources (destructive, irreversible)",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      name: z.string().describe("Resource group name to delete"),
    },
    async ({ subscriptionId, name }) => {
      try {
        const result = await resourceService.deleteResourceGroup(subscriptionId, name);
        return toolResult({
          ...result,
          warning: "Resource group and all contained resources have been permanently deleted.",
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
