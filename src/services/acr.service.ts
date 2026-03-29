import { ContainerRegistryManagementClient } from "@azure/arm-containerregistry";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class AcrService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new ContainerRegistryManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listRegistries(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const registries: Array<{
      id: string;
      name: string;
      location: string;
      resourceGroup: string;
      loginServer: string;
      sku: string;
      adminEnabled: boolean;
      provisioningState: string;
      creationDate: string;
    }> = [];

    const iter = resourceGroupName
      ? client.registries.listByResourceGroup(resourceGroupName)
      : client.registries.list();

    for await (const r of iter) {
      registries.push({
        id: r.id ?? "",
        name: r.name ?? "",
        location: r.location ?? "",
        resourceGroup: parseResourceGroupFromArmId(r.id) ?? "",
        loginServer: r.loginServer ?? "",
        sku: r.sku?.name ?? "",
        adminEnabled: r.adminUserEnabled ?? false,
        provisioningState: r.provisioningState ?? "Unknown",
        creationDate: r.creationDate?.toISOString() ?? "",
      });
    }
    return registries;
  }

  async getRegistry(subscriptionId: string, resourceGroupName: string, registryName: string) {
    const client = this.getClient(subscriptionId);
    const r = await client.registries.get(resourceGroupName, registryName);

    return {
      id: r.id ?? "",
      name: r.name ?? "",
      location: r.location ?? "",
      loginServer: r.loginServer ?? "",
      sku: r.sku?.name ?? "",
      adminEnabled: r.adminUserEnabled ?? false,
      provisioningState: r.provisioningState ?? "Unknown",
      creationDate: r.creationDate?.toISOString() ?? "",
      publicNetworkAccess: (r as any).publicNetworkAccess ?? "",
      encryption: (r as any).encryption?.status ?? "disabled",
      tags: (r.tags as Record<string, string>) ?? {},
    };
  }
}
