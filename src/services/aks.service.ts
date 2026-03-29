import { ContainerServiceClient } from "@azure/arm-containerservice";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class AksService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new ContainerServiceClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listClusters(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const clusters: Array<{
      id: string;
      name: string;
      location: string;
      resourceGroup: string;
      kubernetesVersion: string;
      provisioningState: string;
      powerState: string;
      nodePoolCount: number;
    }> = [];

    const iter = resourceGroupName
      ? client.managedClusters.listByResourceGroup(resourceGroupName)
      : client.managedClusters.list();

    for await (const c of iter) {
      clusters.push({
        id: c.id ?? "",
        name: c.name ?? "",
        location: c.location ?? "",
        resourceGroup: parseResourceGroupFromArmId(c.id) ?? "",
        kubernetesVersion: c.kubernetesVersion ?? "",
        provisioningState: c.provisioningState ?? "Unknown",
        powerState: c.powerState?.code ?? "Unknown",
        nodePoolCount: (c.agentPoolProfiles ?? []).length,
      });
    }
    return clusters;
  }

  async getCluster(subscriptionId: string, resourceGroupName: string, clusterName: string) {
    const client = this.getClient(subscriptionId);
    const c = await client.managedClusters.get(resourceGroupName, clusterName);

    return {
      id: c.id ?? "",
      name: c.name ?? "",
      location: c.location ?? "",
      kubernetesVersion: c.kubernetesVersion ?? "",
      provisioningState: c.provisioningState ?? "Unknown",
      powerState: c.powerState?.code ?? "Unknown",
      fqdn: c.fqdn ?? "",
      dnsPrefix: c.dnsPrefix ?? "",
      networkPlugin: c.networkProfile?.networkPlugin ?? "",
      serviceCidr: c.networkProfile?.serviceCidr ?? "",
      podCidr: c.networkProfile?.podCidr ?? "",
      nodePools: (c.agentPoolProfiles ?? []).map((p) => ({
        name: p.name ?? "",
        vmSize: p.vmSize ?? "",
        count: p.count ?? 0,
        minCount: p.minCount,
        maxCount: p.maxCount,
        enableAutoScaling: p.enableAutoScaling ?? false,
        osType: p.osType ?? "",
        mode: p.mode ?? "",
      })),
      tags: (c.tags as Record<string, string>) ?? {},
    };
  }
}
