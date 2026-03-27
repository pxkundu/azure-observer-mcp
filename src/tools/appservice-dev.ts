import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppServiceDevService } from "../services/appservice-dev.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerAppServiceDevTools(
  server: McpServer,
  appServiceDevService: AppServiceDevService,
) {
  server.tool(
    "azure/appservice/sites/list",
    "List App Service and Function apps (web/API/worker hosts). Use to target deployments for Claude-built applications.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Optional: limit to one resource group"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const data = await appServiceDevService.listSites(subscriptionId, resourceGroupName);
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/appservice/plans/list",
    "List App Service Plans (compute SKUs for hosting web apps and functions).",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Optional: limit to one resource group"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const data = await appServiceDevService.listAppServicePlans(
          subscriptionId,
          resourceGroupName,
        );
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/appservice/site/get",
    "Get App Service / Function app configuration (hostnames, HTTPS, stack, CORS origins). Does not return secret app settings.",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      siteName: z.string().describe("Site name (web app or function app)"),
    },
    async ({ subscriptionId, resourceGroupName, siteName }) => {
      try {
        const data = await appServiceDevService.getSite(
          subscriptionId,
          resourceGroupName,
          siteName,
        );
        return toolResult(data);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
