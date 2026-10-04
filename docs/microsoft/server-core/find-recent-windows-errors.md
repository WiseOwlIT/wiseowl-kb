---
id: find-recent-windows-errors
title: Find recent Windows errors with PowerShell
sidebar_label: Find recent Windows errors
description: Use Get-WinEvent to narrow down recent System and Application errors on Windows, including servers without the Event Viewer interface.
tags: [windows-server, powershell, troubleshooting]
---

When something breaks, the event logs are a useful place to start. You don't need to scroll through days of entries: ask PowerShell for the period that matters.

## Symptoms

- A service or application fails and you need its error details.
- You're troubleshooting Server Core without a local Event Viewer window.
- You want to compare events around the time a problem started.

## Before you start

Run these commands locally on Windows in Windows PowerShell 5.1 or PowerShell 7. Use an account allowed to read the logs; if access is denied, reopen PowerShell as administrator where authorised. These queries don't change the logs.

## Resolution

### 1. Check the last hour

```powershell
$since = (Get-Date).AddHours(-1)
$events = Get-WinEvent -FilterHashtable @{
    LogName = 'System', 'Application'
    Level = 1, 2
    StartTime = $since
} -MaxEvents 100

$events | Select-Object TimeCreated, LogName, ProviderName, Id, Message |
    Format-List
```

Levels `1` and `2` mean Critical and Error. Results are limited to the newest 100 matching entries. A busy server may need a narrower time window. Filtering at retrieval avoids loading the entire log first. See Microsoft's [Get-WinEvent filtering guide](https://learn.microsoft.com/en-us/powershell/scripting/samples/creating-get-winevent-queries-with-filterhashtable).

### 2. Read a useful entry in full

```powershell
$events | Select-Object -First 1 | Format-List *
```

Capture the timestamp, provider, event ID and message. The same ID can occur under different providers, so keep them together. An event near the failure is a lead to investigate; it doesn't establish the cause by itself.

### 3. Match the incident window

```powershell
$incidentStart = Get-Date '2026-10-04 09:00'
$incidentEnd = Get-Date '2026-10-04 09:30'
Get-WinEvent -FilterHashtable @{
    LogName = 'System', 'Application'
    StartTime = $incidentStart
    EndTime = $incidentEnd
} -MaxEvents 100 | Select-Object TimeCreated, ProviderName, Id, Message |
    Format-List
```

Replace both example dates with the incident's local date and time. This query includes other levels too, which can help show what happened before an error.

## Verify

Compare a returned entry with Event Viewer, if available. Confirm that its time and provider match your incident. After applying a fix, reproduce the original task and query the new time window.

If PowerShell reports that no events matched, widen the window or check the application's own logs. An empty result doesn't prove the system is healthy.

## Reference

[Microsoft: Get-WinEvent command reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent).
