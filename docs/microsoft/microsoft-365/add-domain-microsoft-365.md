---
id: add-domain-microsoft-365
slug: /microsoft/add-domain-microsoft-365
title: How to add your business domain to Microsoft 365
sidebar_label: Add a Microsoft 365 domain
description: Verify your business domain in Microsoft 365, configure email DNS records and test mail delivery before completing your setup.
tags: [microsoft-365, domains, dns, email]
---

# How to add your business domain to Microsoft 365

Adding your domain lets your business use addresses such as `alex@example.com`. Domain verification proves ownership; connecting email requires additional DNS records.

## Before you start

You need administrator access to Microsoft 365 and access to the provider managing your domain's DNS.

If another provider currently handles your email, plan the change first. Create the required Microsoft 365 mailboxes before switching mail delivery. Moving existing messages is a separate migration task.

## Add and verify the domain

1. Open the [Microsoft 365 admin centre](https://admin.microsoft.com).
2. Select **Settings → Domains**. Select **Show all** if Settings is hidden.
3. Select **Add domain**, enter your domain and continue.
4. Choose verification using a **TXT record**.
5. Copy the record details Microsoft provides.
6. Open your DNS provider's dashboard and add that TXT record exactly as shown.
7. Return to Microsoft 365 and select **Verify**.

If verification fails, check the record's name and value. DNS changes may take time to become visible.

## Connect Microsoft 365 email

Continue through the setup wizard and add the records it requests. Use the exact values shown for your domain.

Common records include:

- **MX:** directs incoming email to Microsoft 365.
- **Autodiscover CNAME:** helps Outlook find the email service.
- **SPF TXT:** identifies services authorised to send email for your domain.

If an SPF record already exists, update it to include all legitimate sending services rather than creating a second SPF record.

:::warning
Changing the MX record sends new incoming mail to Microsoft 365. Make this change when your mailboxes and migration plan are ready. Adding a domain does not move old email automatically.
:::

## Check the setup

Run Microsoft's DNS checks, then test sending and receiving email with an external address.

If Cloudflare manages your DNS, enter the records there. Keep email-related CNAME records set to **DNS only**. Leave your website records in place unless you are also changing website hosting.

## References

- [Microsoft: Add a custom domain](https://learn.microsoft.com/en-us/microsoft-365/admin/setup/add-domain?view=o365-worldwide)
- [Microsoft: Connect DNS records](https://learn.microsoft.com/microsoft-365/admin/get-help-with-domains/create-dns-records-at-any-dns-hosting-provider?view=o365-worldwide)
