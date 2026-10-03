---
id: enable-ssh-esxi
title: Enable SSH on an ESXi host
sidebar_label: Enable SSH on ESXi
description: Turn SSH on or off for an ESXi host using the host client, DCUI or the command line.
tags: [vmware, esxi, ssh]
---

# Enable SSH on an ESXi host

## Option 1: ESXi Host Client

1. Sign in to `https://<host>/ui`.
2. Go to **Host > Actions > Services**.
3. Select **Enable Secure Shell (SSH)**.

## Option 2: Direct Console (DCUI)

1. Press **F2** and sign in.
2. Open **Troubleshooting Mode Options**.
3. Select **Enable SSH** and press **Enter**.

## Option 3: Command line

If you already have shell access:

```bash
vim-cmd hostsvc/enable_ssh
vim-cmd hostsvc/start_ssh
```

## Security note

:::warning
Leave SSH enabled only while you need it. In vSphere, a running SSH service also raises a warning on the host by default.
:::
