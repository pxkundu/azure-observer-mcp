# Azure Observer MCP Server — Solution Architecture

## Overview

Azure Observer is a **Model Context Protocol (MCP) server** that enables Claude Code to provision, observe, and control Azure cloud resources through a secure, structured interface. It authenticates via **Azure Entra ID** and exposes namespaced tools for managing Azure infrastructure.

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Claude Code / Claude Desktop"]
        CC[Claude AI Agent]
    end

    subgraph MCP["Azure Observer MCP Server"]
        direction TB
        TR[Tool Registry<br/>20 namespaced tools]
        SL[Service Layer<br/>Azure SDK wrappers]
        AUTH[Auth & Security Layer<br/>Entra ID · RBAC · Dry-run]
        CORE[Core Infrastructure<br/>Zod · Logging · Error handling]

        TR --> SL
        SL --> AUTH
        AUTH --> CORE
    end

    subgraph Azure["Azure Cloud Platform"]
        direction LR
        ARM[Azure Resource Manager]
        SUB[Subscriptions]
        RG[Resource Groups]
        RES[Resources<br/>VMs · Storage · etc.]

        ARM --> SUB --> RG --> RES
    end

    CC -- "JSON-RPC over stdio" --> TR
    SL -- "Azure ARM REST API" --> ARM
    AUTH -. "DefaultAzureCredential" .-> ARM

    style Client fill:#f0f4ff,stroke:#4a6cf7
    style MCP fill:#f0fff4,stroke:#2d8a4e
    style Azure fill:#fff8f0,stroke:#e67e22
```

## Internal Component Architecture

```mermaid
graph LR
    subgraph Entry["Entry Point"]
        IDX[index.ts<br/>stdio transport]
    end

    subgraph Server["Server Layer"]
        SRV[server.ts<br/>tool registration]
    end

    subgraph Tools["Tool Definitions"]
        T1[subscriptions]
        T2[resource-groups]
        T3[resources]
        T4[compute]
        T5[storage]
        T6[identity]
        T7[monitor]
        T8[deployments]
    end

    subgraph Services["Service Layer"]
        S1[SubscriptionService]
        S2[ResourceService]
        S3[ComputeService]
        S4[StorageService]
        S5[IdentityService]
        S6[MonitorService]
    end

    subgraph Lib["Core Libraries"]
        CFG[config.ts]
        ERR[errors.ts]
        LOG[logger.ts]
    end

    subgraph Auth["Auth Layer"]
        CRED[credential.ts<br/>AzureContext]
    end

    IDX --> SRV
    SRV --> T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8
    T1 --> S1
    T2 & T3 & T8 --> S2
    T4 --> S3
    T5 --> S4
    T6 --> S5
    T7 --> S6
    S1 & S2 & S3 & S4 & S5 & S6 --> CRED
    CRED --> CFG & ERR & LOG
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Official MCP SDK, type safety, Zod integration |
| Transport | stdio | Native Claude Code integration, zero infra overhead |
| Azure Auth | `DefaultAzureCredential` | Chains az CLI → env vars → managed identity seamlessly |
| Tool Design | Primitive-first | Simple, composable; Claude can chain them for workflows |
| Validation | Zod | Runtime type checking on all tool inputs/outputs |
| Logging | pino (stderr) | Fast structured JSON logs, doesn't interfere with stdio |
| Build | tsup | Fast, zero-config TypeScript bundling |
| Safety | Dry-run + allow-list | Prevents accidental provisioning/deletion |

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude Code
    participant MCP as MCP Server
    participant DAC as DefaultAzureCredential
    participant Azure as Azure ARM API

    User->>Claude: "List my resource groups"
    Claude->>MCP: tool_call: azure/resource-groups/list
    MCP->>DAC: getToken(management scope)

    alt Azure CLI cached token
        DAC->>DAC: Read az login token from cache
    else Service Principal
        DAC->>Azure: Client credentials flow
        Azure-->>DAC: Access token
    else Managed Identity
        DAC->>Azure: IMDS token request
        Azure-->>DAC: Access token
    end

    DAC-->>MCP: Bearer token
    MCP->>MCP: Check subscription allow-list
    MCP->>Azure: GET /subscriptions/{id}/resourceGroups
    Azure-->>MCP: Resource group list
    MCP-->>Claude: JSON result
    Claude-->>User: Formatted response
```

**Supported credential sources** (in priority order):
1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`)
2. Azure CLI (`az login`)
3. Managed Identity (when running in Azure)

**Optional scoping**: Set `AZURE_ALLOWED_SUBSCRIPTIONS` to restrict which subscriptions the server can access.

## Tool Naming Convention

Tools use a `azure/{service}/{action}` namespace pattern:

- **Consistent**: All tools start with `azure/`
- **Discoverable**: Claude can infer related tools from the namespace
- **Extensible**: New services slot in without naming conflicts

## Tool Request Lifecycle

```mermaid
flowchart TD
    A[Claude sends tool_call] --> B{Zod schema\nvalidation}
    B -- Invalid --> ERR1[Return validation error]
    B -- Valid --> C{Subscription\nallowed?}
    C -- Blocked --> ERR2[Return 403 error]
    C -- Allowed --> D{Is mutating\noperation?}
    D -- Yes --> E{Dry-run\nenabled?}
    E -- Yes --> DRY[Return dry-run preview]
    E -- No --> F[Execute Azure SDK call]
    D -- No --> F
    F --> G{Azure API\nsucceeded?}
    G -- Error --> ERR3[Map & return Azure error]
    G -- Success --> H[Return JSON result]

    style ERR1 fill:#fee,stroke:#c00
    style ERR2 fill:#fee,stroke:#c00
    style ERR3 fill:#fee,stroke:#c00
    style DRY fill:#ffd,stroke:#aa0
    style H fill:#efe,stroke:#0a0
```

## v1 Tool Inventory

### Foundation
| Tool | Description | Mutating |
|------|-------------|----------|
| `azure/subscriptions/list` | List accessible subscriptions | No |
| `azure/resource-groups/list` | List resource groups in a subscription | No |
| `azure/resource-groups/create` | Create a resource group | Yes |
| `azure/resource-groups/delete` | Delete a resource group | Yes (destructive) |
| `azure/resources/list` | List resources in a resource group | No |
| `azure/resources/get` | Get resource details by ID | No |

### Compute
| Tool | Description | Mutating |
|------|-------------|----------|
| `azure/compute/vm/list` | List VMs in a resource group | No |
| `azure/compute/vm/get` | Get VM details and status | No |
| `azure/compute/vm/start` | Start a stopped VM | Yes |
| `azure/compute/vm/stop` | Stop (deallocate) a running VM | Yes |
| `azure/compute/vm/delete` | Delete a VM | Yes (destructive) |

### Storage
| Tool | Description | Mutating |
|------|-------------|----------|
| `azure/storage/account/list` | List storage accounts | No |
| `azure/storage/account/get` | Get storage account details | No |
| `azure/storage/account/create` | Create a storage account | Yes |

### Identity & Monitoring
| Tool | Description | Mutating |
|------|-------------|----------|
| `azure/identity/whoami` | Show authenticated identity and permissions | No |
| `azure/monitor/activity-log` | Query recent activity log entries | No |
| `azure/deployments/list` | List deployments in a resource group | No |
| `azure/deployments/get` | Get deployment status and details | No |

## Safety Guardrails

```mermaid
graph LR
    subgraph Guards["Safety Layers"]
        G1["1. Subscription\nAllow-list"]
        G2["2. Azure RBAC\n(server-side)"]
        G3["3. Dry-run Mode\n(preview only)"]
        G4["4. Destructive\nWarnings"]
    end

    REQ[Tool Request] --> G1 --> G2 --> G3 --> G4 --> EXEC[Execute]

    style Guards fill:#fff8f0,stroke:#e67e22
```

1. **Dry-run mode**: Set `AZURE_DRY_RUN=true` to make all mutating tools return what *would* happen without executing.
2. **Subscription allow-list**: Set `AZURE_ALLOWED_SUBSCRIPTIONS` (comma-separated IDs) to restrict access.
3. **Azure RBAC**: The server inherits the authenticated user's Azure permissions — it cannot exceed them.
4. **Destructive operation warnings**: Delete tools return explicit warnings in their output.

## Configuration

All configuration via environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_SUBSCRIPTION_ID` | No | Default subscription (falls back to first available) |
| `AZURE_TENANT_ID` | No* | Entra ID tenant (* required for service principal) |
| `AZURE_CLIENT_ID` | No* | Service principal app ID |
| `AZURE_CLIENT_SECRET` | No* | Service principal secret |
| `AZURE_ALLOWED_SUBSCRIPTIONS` | No | Comma-separated subscription IDs to allow |
| `AZURE_DRY_RUN` | No | Set `true` to enable dry-run mode |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` (default: `info`) |

## Project Structure

```mermaid
graph TD
    subgraph src["src/"]
        IDX["index.ts — entry point"]
        SRV["server.ts — tool registration hub"]

        subgraph auth["auth/"]
            CRED["credential.ts"]
        end

        subgraph tools["tools/"]
            TSUB["subscriptions.ts"]
            TRG["resource-groups.ts"]
            TRES["resources.ts"]
            TCOMP["compute.ts"]
            TSTOR["storage.ts"]
            TID["identity.ts"]
            TMON["monitor.ts"]
            TDEP["deployments.ts"]
        end

        subgraph services["services/"]
            SSUB["subscription.service.ts"]
            SRES["resource.service.ts"]
            SCOMP["compute.service.ts"]
            SSTOR["storage.service.ts"]
            SID["identity.service.ts"]
            SMON["monitor.service.ts"]
        end

        subgraph lib["lib/"]
            CFG["config.ts"]
            ERR["errors.ts"]
            LOG["logger.ts"]
        end
    end

    style src fill:#f8f8f8,stroke:#333
```

## Adding a New Tool (Contributor Guide)

```mermaid
flowchart LR
    A["1. Add Azure SDK\npackage"] --> B["2. Create service\nin services/"]
    B --> C["3. Create tool\nin tools/"]
    C --> D["4. Register in\nserver.ts"]
    D --> E["5. Build & test"]

    style A fill:#e8f4fd,stroke:#2196F3
    style B fill:#e8f4fd,stroke:#2196F3
    style C fill:#e8f4fd,stroke:#2196F3
    style D fill:#e8f4fd,stroke:#2196F3
    style E fill:#e8f4fd,stroke:#2196F3
```

1. Install the `@azure/arm-*` SDK package for the new Azure service
2. Create a service in `src/services/` that wraps the Azure SDK client
3. Create a tool file in `src/tools/` that defines Zod schemas and calls the service
4. Register the tool in `src/server.ts`

Each tool file follows this pattern:

```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerMyTools(server: McpServer, deps: Dependencies) {
  server.tool(
    "azure/service/action",
    "Human-readable description for Claude",
    { param: z.string().describe("What this param is") },
    async ({ param }) => {
      const result = await deps.myService.doAction(param);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
```

## Future Roadmap (post-v1)

```mermaid
timeline
    title Azure Observer Roadmap
    v1 - Foundation : Subscriptions · Resource Groups
                    : VMs · Storage Accounts
                    : Identity · Activity Log
                    : Deployments
    v2 - Networking : VNet · Subnet · NSG
                    : Public IP · Load Balancer
    v3 - Data       : Azure SQL · Cosmos DB
                    : App Service · Functions
    v4 - Advanced   : ARM/Bicep Templates
                    : Cost Estimation
                    : Workflow Tools
    v5 - Enterprise : HTTP Transport
                    : Multi-tenant Auth
                    : Audit Logging
```
