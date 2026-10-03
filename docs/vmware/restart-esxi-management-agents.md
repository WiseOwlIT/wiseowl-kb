---
id: restart-esxi-management-agents
title: Restart the ESXi management agents
sidebar_label: Restart ESXi management agents
description: Restart hostd and vpxa on an ESXi host when it shows as not responding in vCenter.
tags: [vmware, esxi, vcenter, troubleshooting]
---

# Restart the ESXi management agents

## Symptoms

- An ESXi host shows **Not Responding** or **Disconnected** in vCenter, but its virtual machines are still running.
- The host client is slow or fails to load.

Restarting the management agents does **not** power off running virtual machines.

## Resolution

### 1. Enable the ESXi Shell or SSH

Use the Direct Console User Interface (DCUI): press **F2**, then **Troubleshooting Mode Options**, then enable **SSH** or the **ESXi Shell**.

### 2. Restart the two key agents

```bash
/etc/init.d/hostd restart
/etc/init.d/vpxa restart
```

- `hostd` is the host management service.
- `vpxa` is the agent that talks to vCenter.

### 3. If the problem persists

Restart all management services:

```bash
services.sh restart
```

:::caution
`services.sh restart` restarts all management services including networking components. Avoid it on hosts using vSAN or NSX unless you have confirmed it is safe for your environment.
:::

## Verify

Re-check the host in vCenter. If it stays disconnected, right-click the host and choose **Connection > Connect**.

When finished, disable SSH or the ESXi Shell again.
