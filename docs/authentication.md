# Authentication Guide

Azure Observer authenticates to Azure using **Azure Entra ID** (formerly Azure Active Directory) via the `DefaultAzureCredential` chain from the `@azure/identity` SDK. This provides a flexible, secure authentication model that works across development, CI/CD, and production environments.

## How Authentication Works

```mermaid
sequenceDiagram
    participant Claude as Claude Code
    participant MCP as MCP Server
    participant DAC as DefaultAzureCredential
    participant Cache as Local Token Cache
    participant Entra as Azure Entra ID
    participant ARM as Azure Resource Manager

    Claude->>MCP: tool_call (e.g. azure/subscriptions/list)
    MCP->>DAC: getToken("https://management.azure.com/.default")
    
    DAC->>DAC: Try credential chain in order

    alt 1. Environment Variables
        DAC->>Entra: Client credentials (AZURE_CLIENT_ID + SECRET)
        Entra-->>DAC: Access token
    else 2. Azure CLI
        DAC->>Cache: Read cached az login token
        Cache-->>DAC: Access token
    else 3. Managed Identity
        DAC->>Entra: IMDS endpoint request
        Entra-->>DAC: Access token
    end

    DAC-->>MCP: Bearer token
    MCP->>ARM: API call with Authorization header
    ARM-->>MCP: Response
    MCP-->>Claude: Tool result
```

## Authentication Methods

### Method 1: Azure CLI (Recommended for Development)

The simplest way to authenticate. No configuration needed.

```bash
az login
```

After signing in, the MCP server automatically uses your cached token. No environment variables required.

**When to use**: Local development, personal usage, quick testing.

**To switch subscriptions:**

```bash
az account set --subscription "your-subscription-id"
```

**To verify:**

```bash
az account show --output table
```

### Method 2: Service Principal (Recommended for Production)

Create a service principal in Azure Entra ID and pass its credentials via environment variables.

**Step 1: Create the service principal**

```bash
az ad sp create-for-rbac \
  --name "azure-observer-mcp" \
  --role "Reader" \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID" \
  --output json
```

This outputs:

```json
{
  "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "displayName": "azure-observer-mcp",
  "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Step 2: Configure environment variables**

In your Claude MCP config:

```json
{
  "mcpServers": {
    "azure-observer": {
      "command": "node",
      "args": ["/path/to/azure-observer-mcp/dist/index.js"],
      "env": {
        "AZURE_TENANT_ID": "your-tenant-id",
        "AZURE_CLIENT_ID": "your-app-id",
        "AZURE_CLIENT_SECRET": "your-password"
      }
    }
  }
}
```

**When to use**: CI/CD pipelines, shared team servers, production deployments.

### Method 3: Managed Identity (For Azure-hosted Servers)

When running the MCP server inside Azure (e.g., in a VM or Container App), managed identity requires zero secrets.

```mermaid
graph LR
    MCP["MCP Server\n(running in Azure)"] --> MI["Managed Identity\n(system-assigned)"]
    MI --> IMDS["Azure IMDS\nendpoint"]
    IMDS --> TOKEN["Access Token"]
    TOKEN --> ARM["Azure ARM API"]

    style MI fill:#e8f5e9,stroke:#388E3C
```

Enable system-assigned managed identity on your Azure resource, assign it the appropriate role, and `DefaultAzureCredential` will automatically detect and use it. No environment variables needed.

**When to use**: MCP server hosted on Azure VM, Container App, or App Service.

## Credential Chain Priority

`DefaultAzureCredential` tries these sources in order, using the first one that succeeds:

```mermaid
flowchart TD
    START["DefaultAzureCredential"] --> E1{Environment\nvariables set?}
    E1 -- Yes --> USE_ENV["Use Client Credentials"]
    E1 -- No --> E2{az login\ntoken cached?}
    E2 -- Yes --> USE_CLI["Use Azure CLI Token"]
    E2 -- No --> E3{Running in\nAzure?}
    E3 -- Yes --> USE_MI["Use Managed Identity"]
    E3 -- No --> FAIL["Throw: No credential found"]

    style USE_ENV fill:#e8f5e9,stroke:#388E3C
    style USE_CLI fill:#e8f5e9,stroke:#388E3C
    style USE_MI fill:#e8f5e9,stroke:#388E3C
    style FAIL fill:#ffebee,stroke:#C62828
```

## Role Assignments

The authenticated identity needs appropriate Azure RBAC roles. Here are common role assignments:

| Scenario | Recommended Role | Scope |
|----------|-----------------|-------|
| Read-only observation | Reader | Subscription |
| Resource provisioning | Contributor | Subscription or Resource Group |
| Full management + IAM | Owner | Subscription |
| Specific service only | Service-specific role (e.g., VM Contributor) | Resource Group |

**Assign a role:**

```bash
az role assignment create \
  --assignee "your-app-id-or-upn" \
  --role "Contributor" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

## Subscription Scoping

Regardless of authentication method, you can restrict which subscriptions the server can access using the `AZURE_ALLOWED_SUBSCRIPTIONS` environment variable:

```json
{
  "env": {
    "AZURE_ALLOWED_SUBSCRIPTIONS": "sub-id-1,sub-id-2"
  }
}
```

```mermaid
flowchart LR
    REQ["Tool request with\nsubscription ID"] --> CHECK{"Is subscription\nin allow-list?"}
    CHECK -- Yes --> PROCEED["Execute tool"]
    CHECK -- No --> BLOCK["Return 403 error"]
    CHECK -. "No allow-list\nconfigured" .-> PROCEED

    style BLOCK fill:#ffebee,stroke:#C62828
    style PROCEED fill:#e8f5e9,stroke:#388E3C
```

Any tool call targeting a subscription not in the list will return a `SUBSCRIPTION_NOT_ALLOWED` error.

## Verifying Authentication

Use the `azure/identity/whoami` tool to verify your authentication status:

> "Show me my Azure identity using the whoami tool."

This returns:

```json
{
  "authenticated": true,
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "objectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "upn": "user@example.com",
  "name": "John Doe",
  "dryRunEnabled": false,
  "allowedSubscriptions": "all"
}
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "No credential found" | No auth method available | Run `az login` or set service principal env vars |
| "AADSTS700016" | Wrong client ID | Verify `AZURE_CLIENT_ID` matches your app registration |
| "AADSTS7000215" | Wrong client secret | Regenerate the secret in Entra ID |
| Token expired | CLI token timed out | Run `az login` again |
| "AuthorizationFailed" | Insufficient permissions | Assign appropriate RBAC role to your identity |
