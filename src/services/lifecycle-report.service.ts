import type { AzureContext } from "../auth/credential.js";
import { BillingService } from "./billing.service.js";
import { AdvisorService } from "./advisor.service.js";
import { SecurityScanService } from "./security-scan.service.js";

/**
 * Aggregates billing, Advisor, and security signals for Claude-driven DevOps reviews.
 */
export class LifecycleReportService {
  private billing: BillingService;
  private advisor: AdvisorService;
  private security: SecurityScanService;

  constructor(private ctx: AzureContext) {
    this.billing = new BillingService(ctx);
    this.advisor = new AdvisorService(ctx);
    this.security = new SecurityScanService(ctx);
  }

  async devOpsLifecycleReport(
    subscriptionId: string,
    options: {
      includeCost?: boolean;
      includeAdvisor?: boolean;
      includeSecurity?: boolean;
      costTopN?: number;
      advisorMax?: number;
      advisorCategories?: string[];
      securityAlertsMax?: number;
      securityAssessmentsMax?: number;
    } = {},
  ) {
    const includeCost = options.includeCost !== false;
    const includeAdvisor = options.includeAdvisor !== false;
    const includeSecurity = options.includeSecurity !== false;

    const report: Record<string, unknown> = {
      subscriptionId,
      generatedAt: new Date().toISOString(),
      purpose:
        "Snapshot for Claude to reason about cost, security posture, and Azure best practices across the app lifecycle (build/deploy/operate).",
    };

    if (includeCost) {
      try {
        const cost = await this.billing.costReport(subscriptionId, {
          groupBy: "ServiceName",
          timeframe: "MonthToDate",
          maxRows: options.costTopN ?? 15,
        });
        report.cost = cost;
      } catch (e) {
        report.cost = {
          error: e instanceof Error ? e.message : String(e),
          hint: "Assign Cost Management Reader or Microsoft Cost Management access if this fails.",
        };
      }
    }

    if (includeAdvisor) {
      const max = options.advisorMax ?? 40;
      const chunk = await this.advisor.listRecommendations(subscriptionId, {
        maxItems: Math.min(200, max * 3),
      });
      let recs = chunk.recommendations;
      if (options.advisorCategories?.length) {
        const allow = new Set(options.advisorCategories);
        recs = recs.filter((r) => allow.has(r.category));
      }
      recs = recs.slice(0, max);

      report.advisor = {
        count: recs.length,
        recommendations: recs,
        note: "Use with App Service / SQL / APIM tools to plan remediation sprints.",
      };
    }

    if (includeSecurity) {
      const alerts = await this.security.listAlerts(
        subscriptionId,
        options.securityAlertsMax ?? 20,
      );
      const assessments = await this.security.listAssessments(
        subscriptionId,
        options.securityAssessmentsMax ?? 80,
      );

      report.security = {
        alerts: alerts,
        assessmentsSummary: {
          total: assessments.count,
          unhealthyCount: assessments.unhealthyCount,
          truncated: assessments.truncated,
        },
        unhealthySample: assessments.assessments
          .filter((a) => a.statusCode === "Unhealthy")
          .slice(0, 15),
      };
    }

    report.claudeGuidance = [
      "Prioritize Security + High impact Advisor items before feature work.",
      "Map cost spikes (ServiceName) to App Service / SQL / Cosmos resources via resource list tools.",
      "For APIs: align APIM gateway + App Service defaultHostName + Key Vault references.",
      "Keep secrets in Key Vault; enable HTTPS-only on sites; review unhealthy Defender assessments.",
    ];

    return report;
  }
}
