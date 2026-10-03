---
id: outlook-disconnected
title: Fix Outlook disconnected from Exchange Online
sidebar_label: Outlook disconnected
description: Troubleshoot Outlook connection problems with browser checks, offline settings and a separate test profile in classic Outlook.
tags: [exchange-online, outlook, connectivity]
---

# Fix Outlook disconnected from Exchange Online

Outlook says **Disconnected**, **Working Offline** or keeps trying to connect. Let's work out whether the problem is the account, the service or Outlook on this computer.

## Start with a browser check

Open [Outlook on the web](https://outlook.office.com) and sign in with the same work account. Send and receive a test message.

If the browser also fails, note the error and check your internet connection. Ask your administrator to check the account and **Health → Service health** in Microsoft 365. If the browser works, you can keep working there while troubleshooting the desktop app.

## Check Work Offline in classic Outlook

In **classic Outlook for Windows**, look at the bottom status bar. If it says **Working Offline**, select **Send/Receive → Work Offline** to return online. The button acts as a toggle, so check the status after clicking it.

If it says **Disconnected**, check connectivity and account sign-in before assuming offline mode is the cause. These ribbon instructions apply to classic Outlook; new Outlook uses a different interface.

[Microsoft reference: Outlook offline and connection status](https://support.microsoft.com/en-us/outlook/getstarted/how-to-work-offline-in-outlook-for-windows)

## Restart and update Outlook

Close Outlook, reopen it and complete any legitimate work-account sign-in prompts. Install available Office updates and test again.

Where available in classic Outlook, try **File → Account Settings → Account Settings → Email**, select the account and choose **Repair**. Follow the prompts and restart Outlook. Repair availability depends on your version and account type.

[Microsoft reference: Repair an Outlook connection](https://support.microsoft.com/en-us/outlook/fix-your-outlook-email-connection-by-repairing-your-profile)

## Try a separate profile in classic Outlook

If the browser works and classic Outlook still won't connect, test a new profile:

1. Close Outlook and hold **Shift** while starting it.
2. In the profile picker, select **Options → New**.
3. Give the test profile a recognisable name and add the work account.
4. Open Outlook using that profile and test sending and receiving.

Keep the original profile while testing, especially if it contains local data files or other accounts. If the new profile works, check any local archives and additional accounts before making it your regular profile. This profile procedure doesn't apply to new Outlook.

[Microsoft reference: Create a classic Outlook profile](https://support.microsoft.com/en-us/outlook/create-an-outlook-profile)

## Check the fix

Confirm a new message arrives, a test message sends and Outlook reconnects after a restart. If you're still stuck, record the Outlook version, exact error, browser test result and whether other people are affected for your support team.
