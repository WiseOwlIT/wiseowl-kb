---
id: check-esxi-datastore-space
title: Check ESXi datastore capacity and free space
sidebar_label: Check datastore free space
description: Inspect ESXi datastore capacity, free space and mount status before investigating storage alerts or failed virtual machine tasks.
tags: [vmware, esxi, storage, troubleshooting]
---

A storage alert deserves a closer look before you start moving or removing files. First, confirm which datastore is affected and what the host can see.

## Symptoms

- A datastore capacity alarm appears in vCenter.
- A VM task fails with a storage-space error.
- A datastore unexpectedly shows zero capacity or is unavailable.

## Before you start

This guide uses ESXi 7.x/8.x command-line inspection. Use an authorised host administrator account and the ESXi Shell or SSH. If needed, follow [Enable SSH on ESXi](./enable-ssh-esxi.md). The command below lists information without changing the datastore.

## Resolution

### 1. Identify the datastore in the client

In the vSphere Client, select the affected datastore and record its name, capacity and free space. Note which host and VM were involved in the failed task. Keep the original error message too.

### 2. Check the host's filesystem view

```bash
esxcli storage filesystem list
```

Match the **Volume Name** and **UUID** to the affected datastore. Read **Mounted**, **Type**, **Size** and **Free** together. Size and free-space values are in bytes; divide by `1073741824` to express them in GiB. Broadcom documents these fields in its [ESXi datastore listing example](https://knowledge.broadcom.com/external/article/323128/).

### 3. Decide what to investigate next

| Observation | Next step |
| --- | --- |
| Mounted with little free space | Review capacity growth, recent tasks and storage requirements with the workload owner. |
| Plenty of free space, but a VM task fails | Confirm the task targets this datastore and inspect its exact error. |
| Zero capacity or `Mounted` is `false` | Investigate datastore accessibility and mount state before treating it as a full volume. |

Broadcom describes a case where [unmounted VMFS datastores show zero capacity](https://knowledge.broadcom.com/external/article/373244/vmfs56-datastores-show-0b-after-host-ret.html). That symptom needs storage investigation; the display alone doesn't identify the underlying cause.

:::caution Before removing files
Check ownership and dependencies first. Avoid deleting VM disks or snapshot files directly from the datastore browser or shell. Storage cleanup and snapshot consolidation need their own planned procedure.
:::

## Verify

Run the listing again and refresh the datastore view in the client. Confirm that you're comparing the same datastore UUID. If the values disagree, capture both readings and the host name for further investigation.

When finished, disable SSH if you enabled it for this check. This inspection helps narrow down a storage problem; it doesn't measure latency, physical array headroom or vSAN policy health.
