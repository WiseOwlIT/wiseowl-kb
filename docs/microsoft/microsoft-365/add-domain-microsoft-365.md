---
id: add-domain-microsoft-365
slug: /microsoft/add-domain-microsoft-365
title: How to add your business domain to Microsoft 365
sidebar_label: Add a Microsoft 365 domain
description: Verify your business domain in Microsoft 365, configure email DNS records and test mail delivery before completing your setup.
tags: [microsoft-365, domains, dns, email]
---

# How to add your business domain to Microsoft 365

Want your team's email addresses to use your business name? Adding your domain is the first step. We'll verify that you own it, then connect the DNS records Microsoft 365 needs for email.

## Before you start

Have your Microsoft 365 administrator account and your DNS provider's login handy. Your DNS provider is the service managing your domain's records, which may be different from the company where you bought the domain.

Already receiving email somewhere else? Take a moment to plan the move. Create everyone's Microsoft 365 mailboxes before switching mail delivery, and arrange a separate migration if you need to bring their existing messages across.

## Add and verify the domain

1. Open the [Microsoft 365 admin centre](https://admin.microsoft.com).
2. Select **Settings → Domains**. Select **Show all** if Settings is hidden.
3. Select **Add domain**, enter your domain and continue.
4. Choose verification using a **TXT record**.
5. Copy the record details Microsoft provides.
6. Open your DNS provider's dashboard and add that TXT record exactly as shown.
7. Return to Microsoft 365 and select **Verify**.

If Microsoft can't find the record yet, check the name and value for a copying error. If they look right, give DNS a little time to update and try verification again. Adding this verification TXT record doesn't switch your email delivery.

## Connect Microsoft 365 email

Once your domain is verified, continue through the wizard. Microsoft will show you the records to add. Copy the values from your own setup screen rather than using example values from another guide.

Common records include:

- **MX:** directs incoming email to Microsoft 365.
- **Autodiscover CNAME:** helps Outlook find the email service.
- **SPF TXT:** identifies services authorised to send email for your domain.

If an SPF record already exists, update it to include all legitimate sending services rather than creating a second SPF record.

:::warning
Changing the MX record sends new incoming mail to Microsoft 365. Make this change when your mailboxes and migration plan are ready. Adding a domain does not move old email automatically.
:::

## Check the setup

You're nearly there. Run Microsoft's DNS checks, then send a message to an external email address and ask for a reply. That gives you a quick check of mail going in both directions.

Using Cloudflare? Add the records in its DNS dashboard and keep email-related CNAME records set to **DNS only**. You can keep your existing website records in place while setting up Microsoft 365 email.

## References

- [Microsoft: Add a custom domain](https://learn.microsoft.com/en-us/microsoft-365/admin/setup/add-domain?view=o365-worldwide)
- [Microsoft: Connect DNS records](https://learn.microsoft.com/microsoft-365/admin/get-help-with-domains/create-dns-records-at-any-dns-hosting-provider?view=o365-worldwide)
