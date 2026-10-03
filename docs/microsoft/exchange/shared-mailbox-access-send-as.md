---
id: shared-mailbox-access-send-as
title: Fix shared mailbox access and Send As problems in Exchange Online
sidebar_label: Shared mailbox access and Send As
description: Troubleshoot missing shared mailboxes and Send As errors by checking delegation permissions and testing access in Outlook on the web.
tags: [exchange-online, shared-mailbox, permissions, outlook]
---

# Fix shared mailbox access and Send As problems in Exchange Online

Can someone read the team's mailbox but can't send from it? Or has the mailbox disappeared from Outlook? Let's check permissions first, then work out whether Outlook needs attention.

## Before you start

Have the shared mailbox address and the affected person's work account ready. These steps cover Exchange Online; hybrid environments may require changes through your on-premises Exchange management tools.

## Check the right permissions

In the [Exchange admin centre](https://admin.exchange.microsoft.com), open **Recipients → Mailboxes**, select the shared mailbox and review **Delegation** or **Mailbox delegation**.

There are three different permissions:

- **Full Access / Read and manage:** lets the person open and manage the mailbox.
- **Send As:** lets them send using the shared mailbox's identity.
- **Send on behalf:** shows the person as sending on behalf of the mailbox.

Full Access alone doesn't allow sending. Add the permission the person actually needs, save it and allow time for the change to apply.

[Microsoft reference: Mailbox permissions](https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/give-mailbox-permissions-to-another-user?view=o365-worldwide) · [Microsoft reference: Shared mailboxes](https://learn.microsoft.com/en-us/microsoft-365/admin/email/create-a-shared-mailbox?view=o365-worldwide)

## Test in a browser

Ask the person to sign in to [Outlook on the web](https://outlook.office.com) using their own account. Open their account menu, select **Open another mailbox**, enter the shared address and open it.

If it opens, send a test message from that mailbox. A successful browser test helps you focus on the desktop app. If access fails there too, recheck the account, permissions and time since the change.

## If the mailbox is missing in Outlook

Restart Outlook after the permission change. In **new Outlook**, right-click the person's account in the folder pane and select **Add shared folder or mailbox** to add the shared address manually.

In **classic Outlook**, automatic mailbox discovery can depend on how Full Access was granted. Permissions assigned through a group do not provide the same automapping behaviour as an individual assignment. Follow Microsoft's version-specific instructions to add it manually.

Use each person's own sign-in. A shared mailbox isn't intended to be accessed by sharing a password or enabling direct sign-in.

[Microsoft reference: Open a shared mailbox](https://support.microsoft.com/en-us/outlook/sharing/open-and-use-a-shared-mailbox-in-outlook) · [Microsoft reference: Delegation and automapping](https://learn.microsoft.com/en-us/exchange/recipients/mailbox-permissions)

## Check the fix

Confirm the person can open the folders and send with the intended From address. Check the received message to see whether it displays **Send As** or **Send on behalf**, as requested.
