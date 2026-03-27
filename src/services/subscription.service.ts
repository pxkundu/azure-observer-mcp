import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import type { AzureContext } from "../auth/credential.js";

export class SubscriptionService {
  private client: SubscriptionClient;

  constructor(private ctx: AzureContext) {
    this.client = new SubscriptionClient(ctx.credential);
  }

  async list() {
    const subs: Array<{
      id: string;
      subscriptionId: string;
      displayName: string;
      state: string;
    }> = [];

    for await (const sub of this.client.subscriptions.list()) {
      if (
        this.ctx.config.allowedSubscriptions.length > 0 &&
        sub.subscriptionId &&
        !this.ctx.config.allowedSubscriptions.includes(sub.subscriptionId)
      ) {
        continue;
      }

      subs.push({
        id: sub.id ?? "",
        subscriptionId: sub.subscriptionId ?? "",
        displayName: sub.displayName ?? "",
        state: sub.state ?? "Unknown",
      });
    }

    return subs;
  }
}
