import { SecurityCenter } from "@azure/arm-security";
import type { AzureContext } from "../auth/credential.js";

export class SecurityScanService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new SecurityCenter(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listAlerts(subscriptionId: string, maxItems = 50) {
    const client = this.getClient(subscriptionId);
    const cap = Math.min(maxItems, 100);
    const alerts: Array<{
      name: string;
      severity: string;
      status: string;
      alertType: string;
      resourceId: string;
      timeGeneratedUtc?: string;
      remediationSteps?: string;
    }> = [];

    for await (const a of client.alerts.list()) {
      if (alerts.length >= cap) break;
      let resourceId = "";
      for (const ri of a.resourceIdentifiers ?? []) {
        if (ri && typeof ri === "object" && "azureResourceId" in ri && (ri as { azureResourceId?: string }).azureResourceId) {
          resourceId = (ri as { azureResourceId: string }).azureResourceId;
          break;
        }
      }
      alerts.push({
        name: a.alertDisplayName ?? a.name ?? "",
        severity: String(a.severity ?? ""),
        status: String(a.status ?? ""),
        alertType: a.alertType ?? "",
        resourceId: resourceId || (a.id ?? ""),
        timeGeneratedUtc: a.timeGeneratedUtc?.toISOString(),
        remediationSteps: Array.isArray(a.remediationSteps)
          ? a.remediationSteps.join("\n")
          : undefined,
      });
    }

    return {
      count: alerts.length,
      alerts,
      note: "Microsoft Defender for Cloud alerts. Requires Security Reader / appropriate Defender roles.",
    };
  }

  async listAssessments(subscriptionId: string, maxItems = 100) {
    const client = this.getClient(subscriptionId);
    const scope = `/subscriptions/${subscriptionId}`;
    const cap = Math.min(maxItems, 300);

    const assessments: Array<{
      id: string;
      displayName: string;
      statusCode: string;
      statusDescription?: string;
      resourceId: string;
    }> = [];

    for await (const a of client.assessments.list(scope)) {
      if (assessments.length >= cap) break;
      const status = a.status;
      const resDetails = a.resourceDetails as { id?: string } | undefined;
      assessments.push({
        id: a.name ?? "",
        displayName: a.displayName ?? a.name ?? "",
        statusCode: status?.code ?? "",
        statusDescription: status?.description,
        resourceId: resDetails?.id ?? "",
      });
    }

    const unhealthy = assessments.filter((x) => x.statusCode === "Unhealthy").length;

    return {
      count: assessments.length,
      unhealthyCount: unhealthy,
      assessments,
      truncated: assessments.length >= cap,
      note: "Security assessments from Microsoft Defender for Cloud. Filter unhealthy items in Claude for remediation backlog.",
    };
  }
}
