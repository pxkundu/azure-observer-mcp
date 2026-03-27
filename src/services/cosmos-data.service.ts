import { CosmosDBManagementClient } from "@azure/arm-cosmosdb";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class CosmosDataService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new CosmosDBManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listAccounts(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getClient(subscriptionId);
    const accounts: Array<{
      name: string;
      resourceGroup: string;
      location: string;
      kind: string;
      documentEndpoint: string;
      provisioningState: string;
    }> = [];

    const iter = resourceGroupName
      ? client.databaseAccounts.listByResourceGroup(resourceGroupName)
      : client.databaseAccounts.list();

    for await (const a of iter) {
      accounts.push({
        name: a.name ?? "",
        resourceGroup:
          resourceGroupName ?? parseResourceGroupFromArmId(a.id) ?? "",
        location: a.location ?? "",
        kind: a.kind ?? "",
        documentEndpoint: a.documentEndpoint ?? "",
        provisioningState: a.provisioningState ?? "",
      });
    }

    return {
      count: accounts.length,
      databaseAccounts: accounts,
      note: "Cosmos DB for document/NoSQL workloads for APIs and real-time apps.",
    };
  }
}
