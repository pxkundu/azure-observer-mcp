# Azure Observer MCP Server

An MCP (Model Context Protocol) server that enables Claude to provision, observe, and control Azure cloud resources. Authenticates via Azure Entra ID and exposes structured tools for managing Azure infrastructure.

```mermaid
graph LR
    Claude["Claude Code"] -- "MCP (stdio)" --> Server["Azure Observer\nMCP Server"]
    Server -- "Azure SDK" --> Azure["Azure Cloud\nPlatform"]

    style Claude fill:#f0f4ff,stroke:#4a6cf7
    style Server fill:#e8f5e9,stroke:#388E3C
    style Azure fill:#fff3e0,stroke:#F57C00
```

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **Azure CLI** installed and logged in (`az login`)
- An Azure subscription with appropriate permissions

### Install & Build

```bash
git clone https://github.com/your-username/azure-observer-mcp.git
cd azure-observer-mcp
npm install
npm run build
```

### Configure Claude Code

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "azure-observer": {
      "command": "node",
      "args": ["/absolute/path/to/azure-observer-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Authenticate

**Option 1 — Azure CLI (simplest):**

```bash
az login
```

**Option 2 — Service Principal:**

```json
{
  "env": {
    "AZURE_TENANT_ID": "your-tenant-id",
    "AZURE_CLIENT_ID": "your-client-id",
    "AZURE_CLIENT_SECRET": "your-client-secret"
  }
}
```

See the [Authentication Guide](./docs/authentication.md) for details on all supported methods.

### Verify

Ask Claude: *"Use the azure/identity/whoami tool to show my Azure identity."*

## Available Tools (45 total, v0.3.0)

```mermaid
graph TD
    subgraph Foundation["Foundation (6)"]
        F1["subscriptions · resource-groups · resources"]
    end

    subgraph Compute["Compute (5)"]
        C1["vm list/get/start/stop/delete"]
    end

    subgraph Storage["Storage (3)"]
        S1["storage account list/get/create"]
    end

    subgraph Observe["Identity & Monitoring (6)"]
        O1["whoami · activity-log · deployments"]
    end

    subgraph CostSec["Cost & Security (4)"]
        CS["billing · advisor · defender alerts/assessments"]
    end

    subgraph AppStack["App / API / Data (8)"]
        AS["appservice x3 · sql x2 · apim · cosmos · keyvault"]
    end

    subgraph Network["Networking (4)"]
        N1["vnet · nsg · nsg-rules · public-ip"]
    end

    subgraph Containers["Containers (4)"]
        K1["aks list/get · acr list/get"]
    end

    subgraph Logs["Observability (2)"]
        LG["log-analytics workspaces · KQL query"]
    end

    subgraph DNS["DNS (2)"]
        DN["zones · record sets"]
    end

    subgraph Lifecycle["Lifecycle (1)"]
        L1["devops-report composite"]
    end

    style Foundation fill:#e3f2fd,stroke:#1976D2
    style Compute fill:#fff3e0,stroke:#F57C00
    style Storage fill:#e8f5e9,stroke:#388E3C
    style Observe fill:#f3e5f5,stroke:#7B1FA2
    style CostSec fill:#fff8e1,stroke:#F9A825
    style AppStack fill:#e0f7fa,stroke:#00838F
    style Network fill:#fbe9e7,stroke:#BF360C
    style Containers fill:#e8eaf6,stroke:#283593
    style Logs fill:#f1f8e9,stroke:#33691E
    style DNS fill:#fff9c4,stroke:#F57F17
    style Lifecycle fill:#fce4ec,stroke:#AD1457
```

| Category | Tools |
|----------|-------|
| **Foundation** | `azure/subscriptions/list`, `azure/resource-groups/{list,create,delete}`, `azure/resources/{list,get}` |
| **Compute** | `azure/compute/vm/{list,get,start,stop,delete}` |
| **Storage** | `azure/storage/account/{list,get,create}` |
| **Identity & monitoring** | `azure/identity/whoami`, `azure/monitor/activity-log`, `azure/deployments/{list,get}` |
| **Billing & optimization** | `azure/billing/cost-report`, `azure/advisor/recommendations/list` |
| **Security** | `azure/security/defender/alerts/list`, `azure/security/defender/assessments/list` |
| **App & API hosting** | `azure/appservice/{sites/list,plans/list,site/get}` |
| **Data** | `azure/sql/{servers/list,databases/list}`, `azure/cosmos/accounts/list` |
| **Integration** | `azure/apim/services/list`, `azure/keyvault/vaults/list` |
| **Networking** | `azure/network/{vnet/list,nsg/list,nsg/rules,publicip/list}` |
| **Containers** | `azure/containers/aks/{list,get}`, `azure/containers/acr/{list,get}` |
| **Observability** | `azure/logs/{workspace/list,query}` |
| **DNS** | `azure/dns/{zone/list,recordset/list}` |
| **DevOps composite** | `azure/lifecycle/devops-report` |

See the [Tools Reference](./docs/tools-reference.md) and [DevOps lifecycle workflows](./docs/devops-lifecycle.md) for parameters, RBAC, and Claude-oriented workflows.

## Safety Features

```mermaid
flowchart LR
    REQ["Tool\nRequest"] --> V["Zod\nValidation"]
    V --> S["Subscription\nAllow-list"]
    S --> D["Dry-run\nCheck"]
    D --> R["Azure\nRBAC"]
    R --> API["Azure\nAPI"]

    style REQ fill:#f3e5f5,stroke:#7B1FA2
    style API fill:#e8f5e9,stroke:#388E3C
```

- **Dry-Run Mode** — Set `AZURE_DRY_RUN=true` to preview all changes without executing
- **Subscription Allow-List** — Set `AZURE_ALLOWED_SUBSCRIPTIONS` to restrict access
- **Azure RBAC** — The server inherits your Azure permissions; it cannot exceed them
- **Input Validation** — All tool inputs validated with Zod schemas

See the [Security Guide](./docs/security.md) for the complete threat model and best practices.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SUBSCRIPTION_ID` | No | First available | Default subscription |
| `AZURE_TENANT_ID` | No* | — | Entra ID tenant (* required for service principal) |
| `AZURE_CLIENT_ID` | No* | — | Service principal app ID |
| `AZURE_CLIENT_SECRET` | No* | — | Service principal secret |
| `AZURE_ALLOWED_SUBSCRIPTIONS` | No | All | Comma-separated subscription IDs |
| `AZURE_DRY_RUN` | No | `false` | Enable dry-run mode |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation, first run, and initial setup |
| [Authentication](./docs/authentication.md) | Azure Entra ID, service principals, managed identity |
| [Tools Reference](./docs/tools-reference.md) | Complete reference for all tools |
| [DevOps & lifecycle](./docs/devops-lifecycle.md) | Billing, security, Advisor, app stack workflows for Claude |
| [Networking, Containers & Observability](./docs/networking-containers-observability.md) | VNet, AKS, ACR, Log Analytics + KQL, DNS workflows |
| [Claude Integration](./docs/claude-integration.md) | Connecting with Claude Code and Claude Desktop |
| [Hosting Guide](./docs/hosting-guide.md) | Local, Docker, Azure VM, and Container Apps |
| [Use Cases & Workflows](./docs/use-cases.md) | Practical examples and multi-tool workflows |
| [Security](./docs/security.md) | Threat model, RBAC, and best practices |
| [Testing Guide](./docs/testing-guide.md) | Test cases, validation scripts, and Claude CLI test prompts |
| [Contributing](./docs/contributing.md) | How to add new tools and services |
| [Architecture](./ARCHITECTURE.md) | Solution architecture and design decisions |

## Development

```bash
npm run dev              # Run with tsx (hot reload)
npm run build            # Build for production
npm run lint             # Type check
npm run test:validate    # Run automated tool validation (requires az login)
```

## License

MIT
