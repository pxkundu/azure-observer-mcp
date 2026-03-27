import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ResourceService } from "../services/resource.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerDeploymentTools(
  server: McpServer,
  resourceService: ResourceService,
) {
  server.tool(
    "azure/deployments/list",
    "List ARM deployments in a resource group with their provisioning status",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const deployments = await resourceService.listDeployments(subscriptionId, resourceGroupName);
        return toolResult({ count: deployments.length, deployments });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/deployments/get",
    "Get detailed status, outputs, and errors of a specific ARM deployment",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      deploymentName: z.string().describe("Deployment name"),
    },
    async ({ subscriptionId, resourceGroupName, deploymentName }) => {
      try {
        const deployment = await resourceService.getDeployment(
          subscriptionId, resourceGroupName, deploymentName,
        );
        return toolResult(deployment);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
