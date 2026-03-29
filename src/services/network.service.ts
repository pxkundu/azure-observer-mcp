import { NetworkManagementClient } from "@azure/arm-network";
import type { AzureContext } from "../auth/credential.js";

export class NetworkService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new NetworkManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listVnets(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const vnets: Array<{
      id: string;
      name: string;
      location: string;
      addressSpace: string[];
      subnets: Array<{ name: string; addressPrefix: string }>;
      provisioningState: string;
    }> = [];

    const iter = resourceGroupName
      ? client.virtualNetworks.list(resourceGroupName)
      : client.virtualNetworks.listAll();

    for await (const v of iter) {
      vnets.push({
        id: v.id ?? "",
        name: v.name ?? "",
        location: v.location ?? "",
        addressSpace: v.addressSpace?.addressPrefixes ?? [],
        subnets: (v.subnets ?? []).map((s) => ({
          name: s.name ?? "",
          addressPrefix: s.addressPrefix ?? "",
        })),
        provisioningState: (v as any).provisioningState ?? "Unknown",
      });
    }
    return vnets;
  }

  async listNsgs(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const nsgs: Array<{
      id: string;
      name: string;
      location: string;
      rulesCount: number;
      provisioningState: string;
    }> = [];

    const iter = resourceGroupName
      ? client.networkSecurityGroups.list(resourceGroupName)
      : client.networkSecurityGroups.listAll();

    for await (const nsg of iter) {
      nsgs.push({
        id: nsg.id ?? "",
        name: nsg.name ?? "",
        location: nsg.location ?? "",
        rulesCount: (nsg.securityRules ?? []).length,
        provisioningState: (nsg as any).provisioningState ?? "Unknown",
      });
    }
    return nsgs;
  }

  async getNsgRules(subscriptionId: string, resourceGroupName: string, nsgName: string) {
    const client = this.getClient(subscriptionId);
    const nsg = await client.networkSecurityGroups.get(resourceGroupName, nsgName);

    return {
      id: nsg.id ?? "",
      name: nsg.name ?? "",
      rules: (nsg.securityRules ?? []).map((r) => ({
        name: r.name ?? "",
        priority: r.priority,
        direction: r.direction,
        access: r.access,
        protocol: r.protocol,
        sourceAddressPrefix: r.sourceAddressPrefix ?? "",
        destinationAddressPrefix: r.destinationAddressPrefix ?? "",
        sourcePortRange: r.sourcePortRange ?? "",
        destinationPortRange: r.destinationPortRange ?? "",
      })),
    };
  }

  async listPublicIps(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const ips: Array<{
      id: string;
      name: string;
      location: string;
      ipAddress: string;
      allocationMethod: string;
      sku: string;
    }> = [];

    const iter = resourceGroupName
      ? client.publicIPAddresses.list(resourceGroupName)
      : client.publicIPAddresses.listAll();

    for await (const pip of iter) {
      ips.push({
        id: pip.id ?? "",
        name: pip.name ?? "",
        location: pip.location ?? "",
        ipAddress: pip.ipAddress ?? "(not assigned)",
        allocationMethod: pip.publicIPAllocationMethod ?? "",
        sku: pip.sku?.name ?? "",
      });
    }
    return ips;
  }
}
