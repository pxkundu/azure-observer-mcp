import { KeyVaultManagementClient } from "@azure/arm-keyvault";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

/**
 * Metadata only — never returns secret values.
 */
export class KeyVaultMetaService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new KeyVaultManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listVaults(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const vaults: Array<{
      name: string;
      resourceGroup: string;
      location: string;
      skuName: string;
      enableRbacAuthorization: boolean;
      vaultUri: string;
    }> = [];

    const iter = resourceGroupName
      ? client.vaults.listByResourceGroup(resourceGroupName)
      : client.vaults.listBySubscription();

    for await (const v of iter) {
      const props = v.properties;
      vaults.push({
        name: v.name ?? "",
        resourceGroup:
          resourceGroupName ?? parseResourceGroupFromArmId(v.id) ?? "",
        location: v.location ?? "",
        skuName: props?.sku?.name?.toString() ?? "",
        enableRbacAuthorization: props?.enableRbacAuthorization ?? false,
        vaultUri: props?.vaultUri ?? "",
      });
    }

    return {
      count: vaults.length,
      keyVaults: vaults,
      note: "Store connection strings and API keys here; reference from App Service / Functions. Secret values are never returned by this tool.",
    };
  }
}
