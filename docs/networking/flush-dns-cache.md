---
id: flush-dns-cache
title: Flush the DNS cache on Windows, macOS and Linux
sidebar_label: Flush DNS cache
description: Commands to clear the local DNS resolver cache on Windows, macOS and Linux.
tags: [dns, windows, macos, linux, networking]
---

# Flush the DNS cache on Windows, macOS and Linux

## When to use this

A DNS record was recently changed but your computer still resolves the old address.

## Windows

```powershell
ipconfig /flushdns
```

To view the cache first:

```powershell
Get-DnsClientCache
```

## macOS

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

## Linux (systemd-resolved)

```bash
resolvectl flush-caches
```

Other distributions may use `nscd` or `dnsmasq`; restart that service instead.

## Verify

```bash
nslookup example.com
```

:::tip
Browsers keep their own DNS cache too. Restart the browser, or clear its host cache, if the old address persists.
:::
