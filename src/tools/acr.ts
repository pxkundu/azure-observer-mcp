import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AcrService } from "../services/acr.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerAcrTools(
  server: McpServer,
  acrService: AcrService,
) {
  server.tool(
    "azure/containers/acr/list",
    "List Azure Container Registries — optionally scoped to a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Resource group (omit for all registries)"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const registries = await acrService.listRegistries(subscriptionId, resourceGroupName);
        return toolResult({ count: registries.length, registries });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/containers/acr/get",
    "Get detailed ACR registry info — SKU, login server, encryption, public access",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      registryName: z.string().describe("Container registry name"),
    },
    async ({ subscriptionId, resourceGroupName, registryName }) => {
      try {
        const registry = await acrService.getRegistry(
          subscriptionId,
          resourceGroupName,
          registryName,
        );
        return toolResult(registry);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
