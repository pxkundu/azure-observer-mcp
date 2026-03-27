import { StorageManagementClient } from "@azure/arm-storage";
import type { AzureContext } from "../auth/credential.js";
import { DryRunError } from "../lib/errors.js";

export class StorageService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new StorageManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listAccounts(subscriptionId: string, resourceGroupName: string) {
    const client = this.getClient(subscriptionId);
    const accounts: Array<{
      id: string;
      name: string;
      location: string;
      kind: string;
      skuName: string;
      provisioningState: string;
    }> = [];

    for await (const acct of client.storageAccounts.listByResourceGroup(resourceGroupName)) {
      accounts.push({
        id: acct.id ?? "",
        name: acct.name ?? "",
        location: acct.location ?? "",
        kind: acct.kind ?? "",
        skuName: acct.sku?.name ?? "",
        provisioningState: acct.provisioningState?.toString() ?? "Unknown",
      });
    }

    return accounts;
  }

  async getAccount(subscriptionId: string, resourceGroupName: string, accountName: string) {
    const client = this.getClient(subscriptionId);
    const acct = await client.storageAccounts.getProperties(resourceGroupName, accountName);

    return {
      id: acct.id ?? "",
      name: acct.name ?? "",
      location: acct.location ?? "",
      kind: acct.kind ?? "",
      skuName: acct.sku?.name ?? "",
      provisioningState: acct.provisioningState?.toString() ?? "Unknown",
      primaryEndpoints: acct.primaryEndpoints,
      creationTime: acct.creationTime?.toISOString() ?? "",
      tags: (acct.tags as Record<string, string>) ?? {},
    };
  }

  async createAccount(
    subscriptionId: string,
    resourceGroupName: string,
    accountName: string,
    location: string,
    sku: string = "Standard_LRS",
    kind: string = "StorageV2",
  ) {
    if (this.ctx.config.dryRun) {
      throw new DryRunError("createStorageAccount", {
        subscriptionId, resourceGroupName, accountName, location, sku, kind,
      });
    }

    const client = this.getClient(subscriptionId);
    const result = await client.storageAccounts.beginCreateAndWait(
      resourceGroupName,
      accountName,
      {
        location,
        sku: { name: sku as any },
        kind: kind as any,
      },
    );

    return {
      id: result.id ?? "",
      name: result.name ?? "",
      location: result.location ?? "",
      kind: result.kind ?? "",
      skuName: result.sku?.name ?? "",
      provisioningState: result.provisioningState?.toString() ?? "Unknown",
    };
  }
}
