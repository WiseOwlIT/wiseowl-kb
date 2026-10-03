---
id: repadmin-access-denied
slug: /microsoft/repadmin-access-denied
title: Fix repadmin "Access is denied" (error 5)
sidebar_label: repadmin Access is denied
description: Troubleshoot repadmin and Active Directory Sites and Services errors that return Access is denied (error 5).
tags: [active-directory, repadmin, permissions, kerberos]
---

# Fix repadmin "Access is denied" (error 5)

## Symptoms

Running `repadmin` returns an error similar to:

```text
DsBindWithCred to <DC name> failed with status 5 (0x5): Access is denied.
```

## Common causes

1. The command prompt is **not elevated**.
2. The account lacks the **replication or administrative rights** needed for the command.
3. **Time skew** between your machine and the domain controller breaks Kerberos authentication.
4. Name resolution or SPN problems cause the connection to fall back to a different authentication method.

## Resolution

### 1. Run elevated

Open Command Prompt or PowerShell with **Run as administrator** and retry.

### 2. Confirm your group membership

```powershell
whoami /groups
```

Reading replication status generally works for administrators, but changing replication (for example forcing a sync) requires appropriate rights such as membership in a privileged group or delegated permissions on the domain.

### 3. Check time synchronization

```powershell
w32tm /query /status
w32tm /monitor
```

Kerberos tolerates a time difference of only a few minutes by default.

### 4. Check DNS and connectivity to the target DC

```powershell
nslookup <DC FQDN>
Test-NetConnection <DC FQDN> -Port 135
```

### 5. Test against a specific DC

```powershell
repadmin /showrepl <DC FQDN>
```

If this works on one DC but fails on another, compare the two for time, DNS and permission differences.

## Verify

`repadmin /replsummary` completes without error 5.
