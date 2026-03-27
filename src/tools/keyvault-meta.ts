import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { KeyVaultMetaService } from "../services/keyvault-meta.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerKeyVaultMetaTools(
  server: McpServer,
  keyVaultMetaService: KeyVaultMetaService,
) {
  server.tool(
    "azure/keyvault/vaults/list",
    "List Key Vaults (metadata only: URIs, RBAC mode, SKU). Secret values are never returned — use for wiring apps to secret stores.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Optional: limit to one resource group"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const data = await keyVaultMetaService.listVaults(subscriptionId, resourceGroupName);
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
