import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CosmosDataService } from "../services/cosmos-data.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerCosmosDataTools(server: McpServer, cosmosDataService: CosmosDataService) {
  server.tool(
    "azure/cosmos/accounts/list",
    "List Azure Cosmos DB accounts (NoSQL/document APIs for scalable app backends).",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Optional: limit to one resource group"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const data = await cosmosDataService.listAccounts(subscriptionId, resourceGroupName);
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
