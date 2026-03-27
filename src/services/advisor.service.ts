import { AdvisorManagementClient } from "@azure/arm-advisor";
import type { AzureContext } from "../auth/credential.js";

export class AdvisorService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new AdvisorManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listRecommendations(
    subscriptionId: string,
    options: { category?: string; maxItems?: number } = {},
  ) {
    const client = this.getClient(subscriptionId);
    const maxItems = Math.min(options.maxItems ?? 50, 200);
    const filter = options.category
      ? `Category eq '${options.category}'`
      : undefined;

    const items: Array<{
      id: string;
      category: string;
      impact: string;
      shortDescription: string;
      resourceMetadata: string;
      extendedProperties?: Record<string, unknown>;
    }> = [];

    for await (const rec of client.recommendations.list({ filter, top: maxItems })) {
      if (items.length >= maxItems) break;
      items.push({
        id: rec.id ?? "",
        category: rec.category ?? "",
        impact: rec.impact ?? "",
        shortDescription: rec.shortDescription?.problem ?? rec.shortDescription?.solution ?? "",
        resourceMetadata: rec.resourceMetadata?.resourceId ?? "",
        extendedProperties: rec.extendedProperties,
      });
    }

    return {
      count: items.length,
      recommendations: items,
      note: "Azure Advisor recommendations for cost, security, reliability, performance, and operational excellence.",
    };
  }
}
