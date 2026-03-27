import type { AzureContext } from "../auth/credential.js";

export class IdentityService {
  constructor(private ctx: AzureContext) {}

  async whoami() {
    const token = await this.ctx.credential.getToken("https://management.azure.com/.default");

    if (!token) {
      return { authenticated: false, error: "No token obtained" };
    }

    const payload = decodeJwtPayload(token.token);

    return {
      authenticated: true,
      tenantId: payload.tid ?? null,
      objectId: payload.oid ?? null,
      appId: payload.appid ?? payload.azp ?? null,
      upn: payload.upn ?? null,
      name: payload.name ?? null,
      tokenExpiresAt: token.expiresOnTimestamp
        ? new Date(token.expiresOnTimestamp).toISOString()
        : null,
      dryRunEnabled: this.ctx.config.dryRun,
      allowedSubscriptions: this.ctx.config.allowedSubscriptions.length > 0
        ? this.ctx.config.allowedSubscriptions
        : "all",
    };
  }
}

function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return {};
  }
}
