---
id: Fix-repadmin-RPC-Access-is-denied-for-admin-accounts
title: Fix Repadmin/RPC/RSAT "Access is denied" (error 5) for admin accounts
sidebar_label: RPC/RSAT Access Denied Errors
description: One admin gets error 5 from repadmin and dcdiag on every writable domain controller while others are fine. Cause and fix, including RPC filters that block a single account.
tags: [active-directory, repadmin, dcdiag, rpc, access-denied]
---

# Fix repadmin "Access is denied" (error 5) for a single admin account

## Symptoms

One administrator gets this error when running replication tools, while other admins with the same group memberships run the same commands without problems:

```text
DsBindWithCred to <DC> failed with status 5 (0x5): Access is denied.
DsBindWithSpnEx() failed with error 5, Access is denied.
```

The pattern that points to this problem:

- It fails against **every writable domain controller**, even `repadmin /showrepl localhost` run on the DC itself.
- The same account **works against a read-only domain controller (RODC)**.
- Active Directory Users and Computers also reports access denied for that account.
- `Get-ADUser` (LDAP / AD Web Services) still works.
- `dcdiag` fails the **Connectivity** test with `DsBindWithSpnEx ... error 5`.
- Logging on directly at a DC console as that account fails the same way.

## What to rule out first

Work through the usual causes. In this case every one of them checked out fine, which is the clue that the problem is somewhere else.

| Check | How | Result in this case |
| --- | --- | --- |
| Elevation | Run the tool from an elevated prompt | Same failure |
| Group membership | Compare `whoami /groups` between the broken and a working admin | Identical |
| Permissions on the domain, Configuration and NTDS Settings objects | Check **Effective Access** for both accounts | Identical |
| Kerberos and passwords | Reset the password, compare the key version (`msDS-KeyVersionNumber`) on each DC | Same on all DCs |
| Time skew | `w32tm /monitor` | Fine |
| Protected Users, authentication policy or silo, logon workstation limits | Check the account in ADUC / PowerShell | None set |
| SMB access | `net use \\<dc>\ipc$` | Worked |
| Privileges at logon | Security event **4672** on the DC | Full admin privileges listed |

If SMB, LDAP and Kerberos all work and the privileges are present at logon, but the replication RPC interface refuses you, something is blocking RPC for that specific user.

## Cause: RPC filters targeting the account

Windows can hold **RPC filters** that block calls to specific RPC interfaces for specific users. The directory replication interface (`drsuapi`) is the one `repadmin` and `dcdiag` bind to, so a block filter on it produces exactly this error for the targeted account only.

The filters in this case:

- Were present on the domain controllers.
- Had the action **block** with a condition on `remote_user_token` that matched the affected account's SID.
- Covered `drsuapi` and several other RPC interfaces (18 filters for the one account on each DC).
- Also included entries for other SIDs that were not part of the account's normal group set, which is worth noting for your investigation.

Filters like this are usually created by **security tooling**. One known source is **user containment** in Microsoft Defender for Endpoint (automated attack disruption), which can restrict a user account it considers compromised. Confirm what created them in your own environment before removing anything.

## Resolution

### 1. Find the filters

On each domain controller, in an elevated prompt:

```powershell
# Save a copy before changing anything
netsh rpc filter show filter > C:\Temp\rpc-filters-before.txt

netsh rpc filter show filter
```

Look for entries where the action is **block** and the condition is on `remote_user_token`. Compare the SID shown with the affected account:

```powershell
(Get-ADUser <username>).SID.Value
```

### 2. Check why they exist

Before deleting, find out if something put them there on purpose:

- In the **Microsoft Defender portal**, check whether the user is listed as **contained**, and review recent incidents and automated actions for that account.
- Ask your security team if the account was flagged.

If the account really was contained, release the containment in the portal first. Removing the filters while containment is still active can let them come back.

### 3. Delete the filters for that account

Each filter has a unique key. Delete the ones that belong to the affected account:

```powershell
netsh rpc filter delete filter filterkey=<filter-GUID>
```

Repeat for each matching filter. Do this on **every** domain controller that shows them, not just one.

:::caution
Only delete filters that you have matched to the affected account and confirmed are not an intentional security control. Keep the saved copy from step 1.
:::

## Verify

From the affected account, in an elevated prompt:

```powershell
repadmin /replsummary
dcdiag /test:connectivity
```

Both should complete without error 5. Then confirm the filters have not returned:

```powershell
netsh rpc filter show filter
```

## Prevention and follow-up

- Add a check for unexpected RPC filters to your troubleshooting list for any "access denied for one admin only" case.
- If the source was automated containment, review how alerts for admin accounts are handled so a false positive does not lock an administrator out of replication tools.
- Document the incident, including which accounts were affected and what created the filters.

:::note
Not the problem you have? See [Check Active Directory replication health with repadmin](./check-ad-replication-repadmin.md) for the general checks.
:::
