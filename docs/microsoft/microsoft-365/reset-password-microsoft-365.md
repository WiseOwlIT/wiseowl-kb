---
id: reset-password-microsoft-365
slug: /microsoft/reset-password-microsoft-365
title: How to reset a Microsoft 365 user's password
sidebar_label: Reset a Microsoft 365 password
description: Reset a Microsoft 365 user's password securely and troubleshoot sign-in problems involving saved passwords or authentication methods.
tags: [microsoft-365, users, passwords]
---

# How to reset a Microsoft 365 user's password

An administrator can reset a forgotten password so an employee can regain access to their account. Verify the employee's identity before making the change.

## Before you start

Sign in with an administrator account permitted to reset the affected user's password. The Password Administrator role can reset passwords for ordinary users, but administrator accounts may require a different role.

## Reset the password

1. Open the [Microsoft 365 admin centre](https://admin.microsoft.com).
2. Select **Users → Active users**.
3. Select the affected user and choose **Reset password**.
4. Generate a password or enter a strong temporary password.
5. Require the user to change their password at the next sign-in, where the option is available.
6. Select **Reset password**.
7. Share the temporary password through an approved, secure method.

Ask the employee to sign in with the new password and choose their own password when prompted.

## If they still cannot sign in

Confirm the employee is using the correct work account and entering the new password rather than a saved one.

A password reset does not reset Microsoft Authenticator or other multifactor authentication methods. If the employee has lost their phone or cannot complete verification, their authentication methods need separate attention.

Accounts synchronised from a local Active Directory may require the password to be reset in that directory, depending on your password writeback configuration.

## Reference

[Microsoft: Reset passwords](https://learn.microsoft.com/microsoft-365/admin/add-users/reset-passwords?view=o365-worldwide)
