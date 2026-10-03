---
id: enable-rdp-powershell
slug: /microsoft/enable-rdp-powershell
title: Enable Remote Desktop on Windows with PowerShell
sidebar_label: Enable RDP with PowerShell
description: Turn on Remote Desktop and open the firewall rule on Windows using PowerShell.
tags: [windows-server, rdp, powershell]
---

# Enable Remote Desktop on Windows with PowerShell

## When to use this

You need to turn on Remote Desktop (RDP) on a Windows machine without using the GUI, for example on Server Core or over a remote PowerShell session.

## Steps

Run PowerShell as administrator.

### 1. Allow Remote Desktop connections

```powershell
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name 'fDenyTSConnections' -Value 0
```

### 2. Enable the firewall rule group

```powershell
Enable-NetFirewallRule -DisplayGroup 'Remote Desktop'
```

### 3. (Recommended) Require Network Level Authentication

```powershell
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' -Name 'UserAuthentication' -Value 1
```

### 4. Allow a user

Users must be members of the local **Remote Desktop Users** group (or be administrators):

```powershell
Add-LocalGroupMember -Group 'Remote Desktop Users' -Member 'DOMAIN\username'
```

## Verify

From another machine:

```powershell
Test-NetConnection <server> -Port 3389
```

:::warning
Never expose TCP 3389 directly to the internet. Use a VPN or a remote access gateway.
:::
