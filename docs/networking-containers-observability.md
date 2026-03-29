# Networking, Containers & Observability Guide

This guide covers the v0.3 tool categories — **Networking**, **Containers (AKS/ACR)**, **Log Analytics + KQL**, and **DNS** — with RBAC requirements, workflows, and Claude-oriented examples.

## Tool Map

```mermaid
graph TD
    subgraph Network["Networking (4 tools)"]
        NV["azure/network/vnet/list"]
        NN["azure/network/nsg/list"]
        NR["azure/network/nsg/rules"]
        NP["azure/network/publicip/list"]
    end

    subgraph Containers["Containers (4 tools)"]
        AKL["azure/containers/aks/list"]
        AKG["azure/containers/aks/get"]
        ACL["azure/containers/acr/list"]
        ACG["azure/containers/acr/get"]
    end

    subgraph Observability["Observability (2 tools)"]
        LW["azure/logs/workspace/list"]
        LQ["azure/logs/query"]
    end

    subgraph DNS["DNS (2 tools)"]
        DZ["azure/dns/zone/list"]
        DR["azure/dns/recordset/list"]
    end

    style Network fill:#fbe9e7,stroke:#BF360C
    style Containers fill:#e8eaf6,stroke:#283593
    style Observability fill:#f1f8e9,stroke:#33691E
    style DNS fill:#fff9c4,stroke:#F57F17
```

---

## RBAC Requirements

| Tool category | Minimum Azure role | Scope |
|---|---|---|
| `azure/network/*` | **Reader** | Subscription or resource group |
| `azure/containers/aks/*` | **Reader** | Subscription or resource group |
| `azure/containers/acr/*` | **Reader** | Subscription or resource group |
| `azure/logs/workspace/list` | **Reader** | Subscription |
| `azure/logs/query` | **Log Analytics Reader** | Log Analytics workspace |
| `azure/dns/*` | **Reader** | Subscription or resource group |

```bash
# Grant Log Analytics Reader for KQL queries
az role assignment create \
  --assignee "your-identity" \
  --role "Log Analytics Reader" \
  --scope "/subscriptions/YOUR_SUB/resourceGroups/YOUR_RG/providers/Microsoft.OperationalInsights/workspaces/YOUR_WORKSPACE"
```

---

## Workflow: Full Network Topology Audit

```mermaid
sequenceDiagram
    participant User
    participant Claude
    participant MCP as Azure Observer

    User->>Claude: "Audit network security for my subscription"
    Claude->>MCP: azure/network/vnet/list
    MCP-->>Claude: 3 VNets with subnets
    Claude->>MCP: azure/network/nsg/list
    MCP-->>Claude: 5 NSGs
    
    loop For each critical NSG
        Claude->>MCP: azure/network/nsg/rules
        MCP-->>Claude: Rules with ports + sources
    end
    
    Claude->>MCP: azure/network/publicip/list
    MCP-->>Claude: 4 public IPs
    
    Claude-->>User: "Found 3 VNets, 5 NSGs, 4 public IPs.\n⚠️ NSG 'web-nsg' allows SSH (22) from *.\n⚠️ 2 public IPs are unattached."
```

---

## Workflow: Container Platform Review

```mermaid
sequenceDiagram
    participant User
    participant Claude
    participant MCP as Azure Observer

    User->>Claude: "Review my container infrastructure"
    Claude->>MCP: azure/containers/aks/list
    MCP-->>Claude: 2 AKS clusters
    Claude->>MCP: azure/containers/aks/get (prod-aks)
    MCP-->>Claude: K8s v1.29, 3 node pools, autoscaling on
    Claude->>MCP: azure/containers/acr/list
    MCP-->>Claude: 1 ACR (Premium, encryption on)
    Claude->>MCP: azure/logs/query (KubePodInventory)
    MCP-->>Claude: Pod restart data

    Claude-->>User: "prod-aks: K8s 1.29.2, 3 pools (system 3 nodes,\nworkload 5 nodes autoscale 3→10).\nACR 'prodimages' Premium tier.\n⚠️ Pod 'payment-svc' restarted 47 times today."
```

---

## KQL Query Cookbook

These KQL queries work with the `azure/logs/query` tool. Pass the workspace `customerId` (GUID) as `workspaceId`.

### Infrastructure & Activity

```kql
// Recent resource changes
AzureActivity
| where OperationNameValue has "write" or OperationNameValue has "delete"
| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, ActivityStatusValue
| top 50 by TimeGenerated desc
```

### Kubernetes (requires Container Insights)

```kql
// Pods with high restart counts
KubePodInventory
| summarize Restarts = sum(PodRestartCount) by Name, Namespace, ClusterName
| where Restarts > 0
| top 20 by Restarts desc
```

```kql
// Node CPU pressure
Perf
| where ObjectName == "K8SNode" and CounterName == "cpuUsageNanoCores"
| summarize AvgCPU = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| top 20 by AvgCPU desc
```

### Application Insights

```kql
// Failed HTTP requests by URL
requests
| where success == false
| summarize FailCount = count() by name, resultCode
| top 20 by FailCount desc
```

```kql
// Exceptions with stack traces
exceptions
| project TimeGenerated, type, outerMessage, innermostMessage
| top 30 by TimeGenerated desc
```

### Security

```kql
// Failed sign-ins
SigninLogs
| where ResultType != "0"
| summarize Failures = count() by UserPrincipalName, AppDisplayName, ResultDescription
| top 20 by Failures desc
```

---

## Workflow: DNS Validation Before Migration

```mermaid
flowchart TD
    S1["azure/dns/zone/list\n→ find zones"]
    S2["azure/dns/recordset/list\n→ A records"]
    S3["azure/dns/recordset/list\n→ CNAME records"]
    S4["azure/dns/recordset/list\n→ MX records"]
    S5["Claude validates:\n• A records point to correct IPs\n• CNAMEs resolve correctly\n• MX records match mail provider"]

    S1 --> S2 & S3 & S4 --> S5

    style S5 fill:#e8f5e9,stroke:#388E3C
```

**Try saying**:

> "Before we migrate contoso.com, show me all DNS records — A, CNAME, and MX — and verify they make sense."

---

## Combining with Existing Tools

The real power comes from combining v0.3 tools with existing capabilities:

| Scenario | Tools used |
|---|---|
| "Is my app network-secure?" | `nsg/rules` + `publicip/list` + `defender/assessments` |
| "Why is my AKS app slow?" | `aks/get` + `logs/query` (KQL for pod metrics) + `advisor/recommendations` |
| "Full infrastructure report" | `lifecycle/devops-report` + `vnet/list` + `aks/list` + `acr/list` |
| "Cost of my AKS clusters" | `aks/list` + `billing/cost-report` (group by ResourceGroupName) |
| "Secure my container pipeline" | `acr/get` (encryption check) + `nsg/rules` + `keyvault/vaults/list` |
