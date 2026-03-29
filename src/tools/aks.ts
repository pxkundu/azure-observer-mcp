import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AksService } from "../services/aks.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerAksTools(
  server: McpServer,
  aksService: AksService,
) {
  server.tool(
    "azure/containers/aks/list",
    "List AKS (managed Kubernetes) clusters — optionally scoped to a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Resource group (omit for all clusters)"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const clusters = await aksService.listClusters(subscriptionId, resourceGroupName);
        return toolResult({ count: clusters.length, clusters });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/containers/aks/get",
    "Get detailed AKS cluster info — networking, node pools, autoscaling",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      clusterName: z.string().describe("AKS cluster name"),
    },
    async ({ subscriptionId, resourceGroupName, clusterName }) => {
      try {
        const cluster = await aksService.getCluster(subscriptionId, resourceGroupName, clusterName);
        return toolResult(cluster);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
