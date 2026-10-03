---
id: check-ad-replication-repadmin
title: Check Active Directory replication health with repadmin
sidebar_label: Check AD replication health
description: Use repadmin and dcdiag to check Active Directory replication between domain controllers.
tags: [active-directory, repadmin, replication, windows-server]
---

# Check Active Directory replication health with repadmin

## Symptoms

- Password or group changes appear on some domain controllers but not others.
- Event Viewer shows replication errors in the **Directory Service** log.
- You want to confirm replication is healthy before or after a DC change.

## Resolution

Run these commands from an elevated Command Prompt or PowerShell window on a domain controller, using an account with the required rights.

### 1. Get a summary of replication

```powershell
repadmin /replsummary
```

Look at the **fails** and **largest delta** columns. Anything other than `0` failures needs investigation.

### 2. See per-partner detail

```powershell
repadmin /showrepl
```

This lists each inbound replication partner and shows the last attempt and result for every naming context.

### 3. Force replication to all partners

```powershell
repadmin /syncall /AdeP
```

The switches tell repadmin to sync all partitions (`A`), push to all partners (`d` shows distinguished names, `e` crosses site boundaries, `P` pushes changes).

### 4. Run the built-in replication test

```powershell
dcdiag /test:replications
```

## Verify

Run `repadmin /replsummary` again. All DCs should show `0` failures and a small largest delta.

:::note
If a command returns **Access is denied**, see [Fix repadmin "Access is denied" (error 5)](./repadmin-access-denied.md).
:::
