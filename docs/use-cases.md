# Use Cases & Workflows

This guide demonstrates practical ways to use the Azure Observer MCP Server with Claude, from simple queries to complex multi-step workflows.

## Who Benefits

```mermaid
graph TD
    subgraph Users["Azure Observer Users"]
        DEV["Developers\nQuick resource lookups\nDev environment setup"]
        OPS["DevOps / Platform Engineers\nInfrastructure monitoring\nDeployment tracking"]
        ARCH["Cloud Architects\nResource inventory audits\nCost observation"]
        MGR["Team Leads / Managers\nActivity log reviews\nPermission checks"]
    end

    MCP["Azure Observer\nMCP Server"]

    DEV --> MCP
    OPS --> MCP
    ARCH --> MCP
    MGR --> MCP

    style Users fill:#f0f4ff,stroke:#4a6cf7
    style MCP fill:#e8f5e9,stroke:#388E3C
```

---

## Workflow 1: Environment Discovery

**Scenario**: You join a new team and need to understand what Azure resources exist.

```mermaid
flowchart TD
    START["'Show me everything\nin our Azure environment'"]
    
    S1["azure/subscriptions/list\n→ discovers 3 subscriptions"]
    S2["azure/resource-groups/list\n→ finds 12 resource groups"]
    S3["azure/resources/list\n→ inventories resources per RG"]
    S4["Claude summarizes:\n• 3 subs (prod, staging, dev)\n• 12 resource groups\n• 47 total resources"]

    START --> S1 --> S2 --> S3 --> S4

    style START fill:#f3e5f5,stroke:#7B1FA2
    style S4 fill:#e8f5e9,stroke:#388E3C
```

**Try saying**:

> "List all my Azure subscriptions, then for each one show me the resource groups and what's in them. Give me a summary."

---

## Workflow 2: Development Environment Setup

**Scenario**: You need a new isolated environment for a feature branch.

```mermaid
flowchart TD
    START["'Create a dev environment\nfor the payments feature'"]

    S1["azure/resource-groups/create\n→ 'payments-dev-rg' in eastus"]
    S2["azure/storage/account/create\n→ 'paymentsdevstor' in the new RG"]
    S3["azure/resources/list\n→ verifies both resources exist"]
    S4["Claude: 'Environment ready.\nRG: payments-dev-rg\nStorage: paymentsdevstor'"]

    START --> S1 --> S2 --> S3 --> S4

    style START fill:#f3e5f5,stroke:#7B1FA2
    style S4 fill:#e8f5e9,stroke:#388E3C
```

**Try saying**:

> "Create a new resource group called 'payments-dev-rg' in East US, then create a storage account called 'paymentsdevstor' in it."

---

## Workflow 3: Cost Optimization — Find Idle VMs

**Scenario**: Monthly costs are rising. You want to find VMs that can be stopped.

```mermaid
flowchart TD
    START["'Find VMs I can shut down\nto save money'"]

    S1["azure/compute/vm/list\n→ lists all VMs across RGs"]
    S2["azure/compute/vm/get\n→ checks each VM's power state"]
    S3["Claude analyzes:\n• 3 running VMs\n• 2 are dev/test\n• 1 has low utilization"]
    S4["azure/compute/vm/stop\n→ stops the 2 dev VMs"]
    S5["Claude: 'Stopped 2 VMs.\nEstimated monthly savings: ~$150'"]

    START --> S1 --> S2 --> S3 --> S4 --> S5

    style START fill:#f3e5f5,stroke:#7B1FA2
    style S5 fill:#e8f5e9,stroke:#388E3C
```

**Try saying**:

> "List all VMs across my resource groups, check which ones are running, and tell me which dev/test VMs could be stopped to save costs."

---

## Workflow 4: Incident Investigation

**Scenario**: Something broke in production. You need to understand what changed.

```mermaid
flowchart TD
    START["'What changed in production\nin the last 24 hours?'"]

    S1["azure/monitor/activity-log\n→ queries last 24h for prod RG"]
    S2["Claude analyzes events:\n• 3 resource modifications\n• 1 deployment\n• 1 role assignment change"]
    S3["azure/deployments/get\n→ checks the deployment details"]
    S4["Claude: 'A deployment at 3:47 PM\nchanged the app service config.\nCaller: john@company.com\nStatus: Failed'"]

    START --> S1 --> S2 --> S3 --> S4

    style START fill:#f3e5f5,stroke:#7B1FA2
    style S4 fill:#ffebee,stroke:#C62828
```

**Try saying**:

> "Show me the activity log for the 'production-rg' resource group from the last 24 hours. I'm looking for any changes that might have caused issues."

---

## Workflow 5: Deployment Monitoring

**Scenario**: You kicked off a deployment and want to track its progress.

```mermaid
flowchart TD
    START["'How is my deployment going?'"]

    S1["azure/deployments/list\n→ finds recent deployments"]
    S2["azure/deployments/get\n→ gets status of latest"]
    S3{Deployment\nstatus?}
    S3 -- Running --> S4["Claude: 'Deployment in progress.\nStarted 5 minutes ago.\nI'll check again if you want.'"]
    S3 -- Succeeded --> S5["Claude: 'Deployment succeeded!\nHere are the outputs...'"]
    S3 -- Failed --> S6["Claude: 'Deployment failed.\nError: Quota exceeded.\nHere are the details...'"]

    START --> S1 --> S2 --> S3

    style START fill:#f3e5f5,stroke:#7B1FA2
    style S5 fill:#e8f5e9,stroke:#388E3C
    style S6 fill:#ffebee,stroke:#C62828
```

**Try saying**:

> "Check the status of the most recent deployment in 'infra-rg'. If it failed, tell me what went wrong."

---

## Workflow 6: Security Audit

**Scenario**: Before a compliance review, you need to verify who has access to what.

**Try saying**:

> "Show me my Azure identity and what subscriptions I have access to. Then list the activity log from the past 7 days — I want to see who made changes to the production resource group."

---

## Workflow 7: Environment Cleanup

**Scenario**: A sprint ended and you want to clean up temporary resources.

```mermaid
flowchart TD
    START["'Clean up all test resources\nfrom the sprint'"]

    S1["azure/resource-groups/list\n→ finds groups matching 'test-*'"]
    S2["azure/resources/list\n→ inventories each test RG"]
    S3["Claude: 'Found 3 test RGs with\n8 total resources. Want me\nto delete them?'"]
    S4["User confirms"]
    S5["azure/resource-groups/delete\n→ deletes each test RG"]
    S6["Claude: 'Cleanup complete.\n3 RGs deleted, 8 resources removed.'"]

    START --> S1 --> S2 --> S3 --> S4 --> S5 --> S6

    style START fill:#f3e5f5,stroke:#7B1FA2
    style S3 fill:#fff3e0,stroke:#F57C00
    style S6 fill:#e8f5e9,stroke:#388E3C
```

**Try saying**:

> "Find all resource groups with 'test' or 'temp' in their name. Show me what's in each one, then I'll tell you which ones to delete."

> **Tip**: Enable `AZURE_DRY_RUN=true` to preview deletions before executing.

---

## Workflow 8: DevOps snapshot for Claude-built apps (v0.2)

**Scenario**: You ship APIs and web apps on Azure and want **cost**, **Advisor**, and **Defender** context in one pass—ideal for **Claude Code / CLI** review meetings.

```mermaid
flowchart TD
    START["'Give me a DevOps health\nsnapshot for subscription S'"]
    R1["azure/lifecycle/devops-report\n→ cost + advisor + security"]
    R2["Optional drill-down:\nappservice/sites/list ·\napim/services/list ·\nsql/servers/list"]
    R3["Claude summarizes:\n• Top spend drivers\n• Security vs cost priorities\n• Next actions"]

    START --> R1 --> R2 --> R3

    style START fill:#f3e5f5,stroke:#7B1FA2
    style R3 fill:#e8f5e9,stroke:#388E3C
```

**Try saying**:

> "Run `azure/lifecycle/devops-report` for my subscription, then recommend a prioritized backlog for this sprint."

See [DevOps & lifecycle](./devops-lifecycle.md) for RBAC requirements and detailed flows.

---

## Quick Reference: Common Prompts

| What you want | What to ask Claude |
|---|---|
| See your identity | "Who am I logged in as in Azure?" |
| List subscriptions | "What Azure subscriptions do I have?" |
| Explore resources | "What resources are in the 'my-rg' resource group?" |
| Check VM status | "Is the 'web-server' VM running?" |
| Start/stop a VM | "Stop the 'dev-vm' to save costs" |
| Create infrastructure | "Create a resource group and storage account in West US" |
| Check activity | "What happened in production in the last 3 days?" |
| Track deployments | "Show me the status of the latest deployment" |
| Audit access | "Show me my permissions and recent activity" |
| Clean up | "Find and delete all test resource groups" |
| Cost & Advisor | "Show month-to-date cost by service and top Advisor recommendations" |
| Defender posture | "List unhealthy security assessments and related alerts" |
| App stack map | "List my API Management gateways and App Service hostnames for the API project" |
