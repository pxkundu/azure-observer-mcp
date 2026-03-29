import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NetworkService } from "../services/network.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerNetworkTools(
  server: McpServer,
  networkService: NetworkService,
) {
  server.tool(
    "azure/network/vnet/list",
    "List virtual networks — optionally scoped to a resource group, otherwise subscription-wide",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Resource group (omit for all VNets)"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const vnets = await networkService.listVnets(subscriptionId, resourceGroupName);
        return toolResult({ count: vnets.length, virtualNetworks: vnets });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/network/nsg/list",
    "List Network Security Groups — optionally scoped to a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Resource group (omit for all NSGs)"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const nsgs = await networkService.listNsgs(subscriptionId, resourceGroupName);
        return toolResult({ count: nsgs.length, networkSecurityGroups: nsgs });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/network/nsg/rules",
    "Get security rules for a specific Network Security Group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      nsgName: z.string().describe("Network Security Group name"),
    },
    async ({ subscriptionId, resourceGroupName, nsgName }) => {
      try {
        const nsg = await networkService.getNsgRules(subscriptionId, resourceGroupName, nsgName);
        return toolResult(nsg);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/network/publicip/list",
    "List public IP addresses — optionally scoped to a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().optional().describe("Resource group (omit for all)"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const ips = await networkService.listPublicIps(subscriptionId, resourceGroupName);
        return toolResult({ count: ips.length, publicIpAddresses: ips });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
