import { SqlManagementClient } from "@azure/arm-sql";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class SqlDataService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new SqlManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listServers(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const servers: Array<{
      name: string;
      resourceGroup: string;
      location: string;
      state: string;
      version: string;
      fqdn: string;
    }> = [];

    const iter = resourceGroupName
      ? client.servers.listByResourceGroup(resourceGroupName)
      : client.servers.list();

    for await (const s of iter) {
      servers.push({
        name: s.name ?? "",
        resourceGroup:
          (s as { resourceGroup?: string }).resourceGroup ??
          resourceGroupName ??
          parseResourceGroupFromArmId(s.id) ??
          "",
        location: s.location ?? "",
        state: s.state ?? "",
        version: s.version ?? "",
        fqdn: s.fullyQualifiedDomainName ?? "",
      });
    }

    return {
      count: servers.length,
      servers,
      note: "Use for relational DB backends for APIs and apps. Connection strings use Key Vault in production.",
    };
  }

  async listDatabases(subscriptionId: string, resourceGroupName: string, serverName: string) {
    const client = this.getClient(subscriptionId);
    const dbs: Array<{
      name: string;
      status: string;
      skuName: string;
      tier: string;
      maxSizeBytes?: number;
    }> = [];

    for await (const d of client.databases.listByServer(resourceGroupName, serverName)) {
      if (d.name === "master") continue;
      dbs.push({
        name: d.name ?? "",
        status: d.status ?? "",
        skuName: d.sku?.name ?? "",
        tier: d.sku?.tier ?? "",
        maxSizeBytes: d.maxSizeBytes,
      });
    }

    return { count: dbs.length, databases: dbs };
  }
}
