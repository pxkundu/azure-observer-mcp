import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SqlDataService } from "../services/sql-data.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerSqlDataTools(server: McpServer, sqlDataService: SqlDataService) {
  server.tool(
    "azure/sql/servers/list",
    "List Azure SQL logical servers (relational DB backends for APIs and apps).",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Optional: limit to one resource group"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const data = await sqlDataService.listServers(subscriptionId, resourceGroupName);
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/sql/databases/list",
    "List user databases on an Azure SQL server (excludes system databases).",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group containing the server"),
      serverName: z.string().describe("SQL server name"),
    },
    async ({ subscriptionId, resourceGroupName, serverName }) => {
      try {
        const data = await sqlDataService.listDatabases(
          subscriptionId,
          resourceGroupName,
          serverName,
        );
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
