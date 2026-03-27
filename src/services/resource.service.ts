import { ResourceManagementClient } from "@azure/arm-resources";
import type { AzureContext } from "../auth/credential.js";
import { DryRunError } from "../lib/errors.js";

export class ResourceService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new ResourceManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listResourceGroups(subscriptionId: string) {
    const client = this.getClient(subscriptionId);
    const groups: Array<{
      name: string;
      location: string;
      provisioningState: string;
      tags: Record<string, string>;
    }> = [];

    for await (const rg of client.resourceGroups.list()) {
      groups.push({
        name: rg.name ?? "",
        location: rg.location,
        provisioningState: rg.properties?.provisioningState ?? "Unknown",
        tags: (rg.tags as Record<string, string>) ?? {},
      });
    }

    return groups;
  }

  async createResourceGroup(
    subscriptionId: string,
    name: string,
    location: string,
    tags?: Record<string, string>,
  ) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);

    if (this.ctx.config.dryRun) {
      throw new DryRunError("createResourceGroup", { subscriptionId, name, location, tags });
    }

    const client = this.getClient(subscriptionId);
    const result = await client.resourceGroups.createOrUpdate(name, {
      location,
      tags,
    });

    return {
      name: result.name ?? "",
      location: result.location,
      provisioningState: result.properties?.provisioningState ?? "Unknown",
      tags: (result.tags as Record<string, string>) ?? {},
    };
  }

  async deleteResourceGroup(subscriptionId: string, name: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);

    if (this.ctx.config.dryRun) {
      throw new DryRunError("deleteResourceGroup", { subscriptionId, name });
    }

    const client = this.getClient(subscriptionId);
    await client.resourceGroups.beginDeleteAndWait(name);

    return { deleted: true, name };
  }

  async listResources(subscriptionId: string, resourceGroupName: string) {
    const client = this.getClient(subscriptionId);
    const resources: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
      provisioningState: string;
    }> = [];

    for await (const res of client.resources.listByResourceGroup(resourceGroupName)) {
      resources.push({
        id: res.id ?? "",
        name: res.name ?? "",
        type: res.type ?? "",
        location: res.location ?? "",
        provisioningState: (res as any).provisioningState ?? "Unknown",
      });
    }

    return resources;
  }

  async getResource(subscriptionId: string, resourceId: string) {
    const client = this.getClient(subscriptionId);
    const result = await client.resources.getById(resourceId, "2024-03-01");

    return {
      id: result.id ?? "",
      name: result.name ?? "",
      type: result.type ?? "",
      location: result.location ?? "",
      provisioningState: (result as any).provisioningState ?? "Unknown",
      tags: (result.tags as Record<string, string>) ?? {},
      properties: result.properties,
    };
  }

  async listDeployments(subscriptionId: string, resourceGroupName: string) {
    const client = this.getClient(subscriptionId);
    const deployments: Array<{
      name: string;
      provisioningState: string;
      timestamp: string;
      duration: string;
    }> = [];

    for await (const dep of client.deployments.listByResourceGroup(resourceGroupName)) {
      deployments.push({
        name: dep.name ?? "",
        provisioningState: dep.properties?.provisioningState ?? "Unknown",
        timestamp: dep.properties?.timestamp?.toISOString() ?? "",
        duration: dep.properties?.duration ?? "",
      });
    }

    return deployments;
  }

  async getDeployment(subscriptionId: string, resourceGroupName: string, deploymentName: string) {
    const client = this.getClient(subscriptionId);
    const dep = await client.deployments.get(resourceGroupName, deploymentName);

    return {
      name: dep.name ?? "",
      provisioningState: dep.properties?.provisioningState ?? "Unknown",
      timestamp: dep.properties?.timestamp?.toISOString() ?? "",
      duration: dep.properties?.duration ?? "",
      outputs: dep.properties?.outputs,
      error: dep.properties?.error,
    };
  }
}
