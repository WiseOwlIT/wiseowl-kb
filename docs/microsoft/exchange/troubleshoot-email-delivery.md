---
id: troubleshoot-email-delivery
title: Fix missing or delayed email in Exchange Online
sidebar_label: Missing or delayed email
description: Find missing email in Exchange Online with message trace, then check delivery errors, rules, quarantine and domain settings.
tags: [exchange-online, email, message-trace]
---

# Fix missing or delayed email in Exchange Online

Someone says, "I've sent it," but the message hasn't arrived. Before changing settings, let's find out where it went. A message trace is a useful starting point for Exchange Online mailboxes.

## Before you start

Ask for the sender, recipient, approximate sending time and any bounce message. Check whether one person is affected or the whole team. You'll need an account with permission to run Exchange message traces, such as an Exchange Administrator.

If several people are affected, check **Health → Service health** in the [Microsoft 365 admin centre](https://admin.microsoft.com) for an Exchange Online incident.

## Find the message

1. Open the [Exchange admin centre](https://admin.exchange.microsoft.com).
2. Select **Mail flow → Message trace → Start a trace**.
3. Enter the sender and recipient and choose a time range covering the problem. Check the time zone too.
4. Run the trace, then open the matching message's details.

The result tells you whether Exchange received, delivered, rejected or deferred the message. Read the event details before choosing a fix.

[Microsoft reference: Message trace](https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac)

## Follow the evidence

- **Delivered, but missing:** check Junk Email, mailbox search, inbox rules and forwarding. Review the trace events for filtering or redirection, and check quarantine if indicated.
- **Failed:** use the error in the trace or bounce message to guide your next step. For example, an invalid recipient needs an address correction; a policy rejection needs a review of the named policy.
- **Pending or deferred:** check the events and service health. The service may still be retrying delivery.
- **No result:** check the addresses and time range, allow for trace data to appear, and try again. Ask the sender whether the message left their system.

For broad external mail problems, review MX records and any mail gateway or connector involved. If you use a third-party filtering service, your MX may correctly point there. Compare the configuration with your intended mail route before changing it.

[Microsoft reference: Mail flow troubleshooting](https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/troubleshoot-mail-flow) · [Microsoft reference: Trace questions and delivery details](https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-faq)

## Check the fix

Send a fresh test message in the affected direction. Confirm it arrives and check its trace. Record what you changed so the next person investigating has a useful starting point.
