import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageService } from "../services/storage.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerStorageTools(
  server: McpServer,
  storageService: StorageService,
) {
  server.tool(
    "azure/storage/account/list",
    "List storage accounts in a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const accounts = await storageService.listAccounts(subscriptionId, resourceGroupName);
        return toolResult({ count: accounts.length, storageAccounts: accounts });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/storage/account/get",
    "Get detailed information about a storage account",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      accountName: z.string().describe("Storage account name"),
    },
    async ({ subscriptionId, resourceGroupName, accountName }) => {
      try {
        const account = await storageService.getAccount(
          subscriptionId, resourceGroupName, accountName,
        );
        return toolResult(account);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/storage/account/create",
    "Create a new storage account in a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      accountName: z.string().min(3).max(24).describe("Storage account name (3-24 chars, lowercase letters and numbers only)"),
      location: z.string().describe("Azure region (e.g. eastus, westeurope)"),
      sku: z.string().default("Standard_LRS").describe("SKU name (Standard_LRS, Standard_GRS, Premium_LRS, etc.)"),
      kind: z.string().default("StorageV2").describe("Storage kind (StorageV2, BlobStorage, BlockBlobStorage)"),
    },
    async ({ subscriptionId, resourceGroupName, accountName, location, sku, kind }) => {
      try {
        const result = await storageService.createAccount(
          subscriptionId, resourceGroupName, accountName, location, sku, kind,
        );
        return toolResult(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
