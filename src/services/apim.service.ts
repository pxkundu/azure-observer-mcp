import { ApiManagementClient } from "@azure/arm-apimanagement";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class ApimService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new ApiManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listServices(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const services: Array<{
      name: string;
      resourceGroup: string;
      location: string;
      gatewayUrl: string;
      publisherEmail: string;
      skuName: string;
      skuCapacity: number;
      publicNetworkAccess: string;
    }> = [];

    const iter = resourceGroupName
      ? client.apiManagementService.listByResourceGroup(resourceGroupName)
      : client.apiManagementService.list();

    for await (const s of iter) {
      services.push({
        name: s.name ?? "",
        resourceGroup:
          resourceGroupName ?? parseResourceGroupFromArmId(s.id) ?? "",
        location: s.location ?? "",
        gatewayUrl: s.gatewayUrl ?? "",
        publisherEmail: s.publisherEmail ?? "",
        skuName: s.sku?.name ?? "",
        skuCapacity: s.sku?.capacity ?? 0,
        publicNetworkAccess: s.publicNetworkAccess ?? "",
      });
    }

    return {
      count: services.length,
      apiManagementServices: services,
      note: "Use gatewayUrl as the public API base for Claude-built APIs behind APIM.",
    };
  }
}
