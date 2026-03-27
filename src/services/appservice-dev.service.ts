import { WebSiteManagementClient } from "@azure/arm-appservice";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class AppServiceDevService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new WebSiteManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listSites(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const sites: Array<{
      name: string;
      resourceGroup: string;
      kind: string;
      location: string;
      state: string;
      defaultHostName: string;
      httpsOnly: boolean;
      serverFarmId: string;
    }> = [];

    const iter = resourceGroupName
      ? client.webApps.listByResourceGroup(resourceGroupName)
      : client.webApps.list();

    for await (const site of iter) {
      const rg =
        site.resourceGroup ??
        resourceGroupName ??
        parseResourceGroupFromArmId(site.id) ??
        "";
      sites.push({
        name: site.name ?? "",
        resourceGroup: rg,
        kind: site.kind ?? "",
        location: site.location ?? "",
        state: site.state ?? "",
        defaultHostName: site.defaultHostName ?? "",
        httpsOnly: site.httpsOnly ?? false,
        serverFarmId: site.serverFarmId ?? "",
      });
    }

    return {
      count: sites.length,
      sites,
      note: "kind includes functionapp, app, linux, etc. Use for API and web app deployment targets.",
    };
  }

  async listAppServicePlans(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const plans: Array<{
      name: string;
      resourceGroup: string;
      location: string;
      skuName: string;
      tier: string;
      numberOfWorkers: number;
    }> = [];

    const iter = resourceGroupName
      ? client.appServicePlans.listByResourceGroup(resourceGroupName)
      : client.appServicePlans.list();

    for await (const p of iter) {
      plans.push({
        name: p.name ?? "",
        resourceGroup: p.resourceGroup ?? resourceGroupName ?? "",
        location: p.location ?? "",
        skuName: p.sku?.name ?? "",
        tier: p.sku?.tier ?? "",
        numberOfWorkers: p.sku?.capacity ?? 0,
      });
    }

    return { count: plans.length, appServicePlans: plans };
  }

  async getSite(subscriptionId: string, resourceGroupName: string, siteName: string) {
    const client = this.getClient(subscriptionId);
    const site = await client.webApps.get(resourceGroupName, siteName);

    return {
      name: site.name ?? "",
      kind: site.kind ?? "",
      location: site.location ?? "",
      state: site.state ?? "",
      defaultHostName: site.defaultHostName ?? "",
      httpsOnly: site.httpsOnly ?? false,
      ftpsState: site.siteConfig?.ftpsState ?? "",
      linuxFxVersion: site.siteConfig?.linuxFxVersion ?? "",
      netFrameworkVersion: site.siteConfig?.netFrameworkVersion ?? "",
      alwaysOn: site.siteConfig?.alwaysOn ?? false,
      use32BitWorkerProcess: site.siteConfig?.use32BitWorkerProcess ?? false,
      corsAllowedOrigins: site.siteConfig?.cors?.allowedOrigins ?? [],
      note: "Host names and stack info help wire CI/CD and API gateways. Secret values are not returned.",
    };
  }
}
