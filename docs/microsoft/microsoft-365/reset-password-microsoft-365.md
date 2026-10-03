---
id: reset-password-microsoft-365
slug: /microsoft/reset-password-microsoft-365
title: How to reset a Microsoft 365 user's password
sidebar_label: Reset a Microsoft 365 password
description: Reset a Microsoft 365 user's password securely and troubleshoot sign-in problems involving saved passwords or authentication methods.
tags: [microsoft-365, users, passwords]
---

# How to reset a Microsoft 365 user's password

Forgotten passwords happen. If someone on your team can't get into their Microsoft 365 account, you can help them get back to work with a password reset. First, confirm you're speaking to the account's owner using your usual identity checks.

## Before you start

You'll need an administrator account allowed to reset that person's password. A Password Administrator can help ordinary users; resetting another administrator's password may need a different role.

## Reset the password

1. Open the [Microsoft 365 admin centre](https://admin.microsoft.com).
2. Select **Users → Active users**.
3. Select the affected user and choose **Reset password**.
4. Generate a password or enter a strong temporary password.
5. Require the user to change their password at the next sign-in, where the option is available.
6. Select **Reset password**.
7. Share the temporary password through an approved, secure method.

Ask them to try signing in while you're still available to help. They should use the temporary password, then choose their own password when prompted.

## If they still cannot sign in

Still stuck? Start with the simple checks: are they using the right work account, and is their browser filling in the old password? Ask them to enter the new password themselves.

If the password works but they're stopped at a verification prompt, the issue may be their authentication method. Changing a password doesn't reset Microsoft Authenticator. A lost phone or unavailable verification method needs separate attention.

If your accounts are synchronised from a local Active Directory, check how your organisation handles password changes. You may need to reset the password there, depending on your password writeback setup.

## Reference

[Microsoft: Reset passwords](https://learn.microsoft.com/microsoft-365/admin/add-users/reset-passwords?view=o365-worldwide)
