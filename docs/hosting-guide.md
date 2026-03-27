# Hosting Guide

This guide covers how to run and host the Azure Observer MCP Server across different environments.

## Hosting Options

```mermaid
graph TD
    subgraph Local["Local Development"]
        L1["Direct Node.js\n(npm run dev)"]
        L2["Built binary\n(npm run build + node dist/)"]
    end

    subgraph CI["CI/CD & Automation"]
        C1["Docker Container"]
        C2["GitHub Actions"]
    end

    subgraph Cloud["Azure-hosted"]
        A1["Azure Container Apps"]
        A2["Azure VM"]
    end

    Claude["Claude Code / Desktop"] -- stdio --> L1 & L2
    Claude -- stdio --> C1
    Claude -- stdio --> A1 & A2

    style Local fill:#e3f2fd,stroke:#1976D2
    style CI fill:#fff3e0,stroke:#F57C00
    style Cloud fill:#e8f5e9,stroke:#388E3C
```

---

## Option 1: Local Development (Recommended Start)

The simplest way to run the server. Claude Code spawns it as a local process using stdio transport.

### Build & Run

```bash
npm install
npm run build
```

### Configure Claude

In `~/.claude/claude_desktop_config.json`:

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

### Development Mode

For active development with auto-reload:

```bash
npm run dev
```

This uses `tsx` to run TypeScript directly without a build step.

### How It Works

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude Code
    participant Node as Node.js Process
    participant Azure as Azure APIs

    User->>Claude: Opens Claude Code
    Claude->>Node: Spawns process (node dist/index.js)
    Node->>Node: Loads config, creates MCP server
    Node-->>Claude: MCP server ready (stdio connected)

    User->>Claude: "List my subscriptions"
    Claude->>Node: JSON-RPC tool_call via stdin
    Node->>Azure: Azure SDK API call
    Azure-->>Node: Response
    Node-->>Claude: JSON-RPC result via stdout
    Claude-->>User: Formatted answer

    User->>Claude: Closes Claude Code
    Claude->>Node: Closes stdin
    Node->>Node: Process exits
```

---

## Option 2: Docker Container

Package the server as a Docker container for consistent environments.

### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/

ENTRYPOINT ["node", "dist/index.js"]
```

### Build & Run

```bash
npm run build
docker build -t azure-observer-mcp .
```

### Configure Claude with Docker

```json
{
  "mcpServers": {
    "azure-observer": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "AZURE_TENANT_ID",
        "-e", "AZURE_CLIENT_ID",
        "-e", "AZURE_CLIENT_SECRET",
        "azure-observer-mcp"
      ],
      "env": {
        "AZURE_TENANT_ID": "your-tenant-id",
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-secret"
      }
    }
  }
}
```

> Note: When running in Docker, Azure CLI auth is not available. Use a service principal instead.

---

## Option 3: Azure VM with Managed Identity

Host the MCP server on an Azure VM and use managed identity for zero-secret authentication.

```mermaid
graph TD
    subgraph AzureVM["Azure VM"]
        MCP["MCP Server Process"]
        MI["System-assigned\nManaged Identity"]
    end

    MCP --> MI
    MI --> ARM["Azure Resource Manager"]

    Claude["Claude Code\n(remote or local)"] -- "stdio via SSH tunnel" --> MCP

    style AzureVM fill:#e8f5e9,stroke:#388E3C
```

### Setup Steps

1. **Create a VM** with system-assigned managed identity enabled
2. **Assign roles** to the managed identity:

```bash
az role assignment create \
  --assignee-object-id $(az vm show -g myRG -n myVM --query identity.principalId -o tsv) \
  --role "Contributor" \
  --scope "/subscriptions/YOUR_SUB_ID"
```

3. **Install Node.js and the server** on the VM:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
git clone https://github.com/your-username/azure-observer-mcp.git
cd azure-observer-mcp
npm ci && npm run build
```

4. **Run via SSH tunnel** from your local machine:

```json
{
  "mcpServers": {
    "azure-observer": {
      "command": "ssh",
      "args": [
        "user@your-vm-ip",
        "node /home/user/azure-observer-mcp/dist/index.js"
      ]
    }
  }
}
```

---

## Option 4: Azure Container Apps

For a fully managed, serverless hosting option.

```mermaid
graph LR
    subgraph ACA["Azure Container Apps"]
        MCP["MCP Server\nContainer"]
        MI["Managed\nIdentity"]
    end

    ACR["Azure Container\nRegistry"] --> ACA
    MCP --> MI --> ARM["Azure ARM"]

    style ACA fill:#e3f2fd,stroke:#1976D2
```

### Steps

1. Push your Docker image to Azure Container Registry
2. Create a Container App with system-assigned managed identity
3. Assign RBAC roles to the managed identity
4. Configure ingress for stdio-over-HTTP (requires future HTTP transport support)

> Note: Full Container Apps support will be available with the Streamable HTTP transport (planned for v5). Currently, stdio-based hosting works best with VM or local deployment.

---

## Environment Variables

All hosting options support the same environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SUBSCRIPTION_ID` | No | First available | Default subscription |
| `AZURE_TENANT_ID` | No* | — | Required for service principal |
| `AZURE_CLIENT_ID` | No* | — | Required for service principal |
| `AZURE_CLIENT_SECRET` | No* | — | Required for service principal |
| `AZURE_ALLOWED_SUBSCRIPTIONS` | No | All | Restrict accessible subscriptions |
| `AZURE_DRY_RUN` | No | `false` | Preview-only mode |
| `LOG_LEVEL` | No | `info` | Logging verbosity |

## Hosting Comparison

| Feature | Local Node.js | Docker | Azure VM | Container Apps |
|---------|---------------|--------|----------|----------------|
| Setup effort | Minimal | Low | Medium | Medium |
| Auth methods | CLI, SP | SP only | MI, SP | MI, SP |
| Zero secrets | Yes (az login) | No | Yes (MI) | Yes (MI) |
| Team sharing | No | No | Yes (SSH) | Yes (HTTP*) |
| Auto-scaling | No | No | No | Yes |
| Recommended for | Development | CI/CD | Production | Future |

*HTTP transport support is planned for a future release.
