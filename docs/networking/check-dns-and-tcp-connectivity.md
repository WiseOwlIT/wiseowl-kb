---
id: check-dns-and-tcp-connectivity
title: Separate DNS problems from TCP connection failures
sidebar_label: Check DNS and TCP connectivity
description: Check name resolution and TCP reachability separately on Windows to narrow down why a website or service cannot be reached.
tags: [dns, networking, powershell, troubleshooting]
---

“It won't connect” can describe several different problems. Check the name first, then the service port, so you have something concrete to work with.

## Symptoms

- A website or internal service fails to open.
- A name resolves differently on two computers.
- Ping fails, but you aren't sure whether the application is reachable.

## Before you start

Use Windows PowerShell 5.1 on a Windows client or server. Replace `example.com` and port `443` with the real service name and TCP port. These checks send queries and connection attempts; they don't change your network configuration.

## Resolution

### 1. Check the name

```powershell
Resolve-DnsName -Name 'example.com' -Type A -DnsOnly
```

Look for the returned IPv4 address. Use `-Type AAAA` for IPv6. If resolution fails or times out, investigate DNS before assuming the application is down. See [Microsoft's Resolve-DnsName reference](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname).

### 2. Check which resolvers the computer uses

```powershell
Get-DnsClientServerAddress |
    Select-Object InterfaceAlias, AddressFamily, ServerAddresses
```

Review the active interface, including any VPN adapter. To compare a specific approved resolver, use:

```powershell
Resolve-DnsName -Name 'example.com' -Server '192.0.2.53' -Type A -DnsOnly
```

`192.0.2.53` is a placeholder: replace it with your resolver's address. Use your organisation's resolver for private names. The resolver listing is documented in [Get-DnsClientServerAddress](https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress).

### 3. Test the service port

```powershell
Test-NetConnection -ComputerName 'example.com' -Port 443 -InformationLevel Detailed
```

Read **RemoteAddress**, **RemotePort** and **TcpTestSucceeded**. A successful TCP test means a connection was established to that endpoint; it doesn't validate TLS, authentication or application responses. This command doesn't test UDP. See [Microsoft's Test-NetConnection reference](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection).

## Interpret the result

| Result | Investigate next |
| --- | --- |
| DNS fails | Resolver reachability, the requested record and VPN/DNS configuration. |
| DNS works, TCP fails | The chosen port, service listener, routing and firewall path. |
| TCP works, application fails | Application logs, certificates, authentication and any proxy used by the application. |

Ping uses ICMP, so its failure alone doesn't settle whether a TCP service is reachable. Also, a browser using a proxy may take a different path from this direct test.

## Verify

Repeat the same checks after a change, then try the real application. Keep the timestamp, resolved address, port and test result for your ticket. If only one client fails, compare those details with a working client on the same network.

If a known DNS change is still cached, see [Flush the DNS cache](./flush-dns-cache.md).
