# Civic Nexus Configuration Guide for DontDie

> **SECURITY WARNING:** Never log into Civic Nexus on the same machine where OpenClaw is running. Configure Civic on a separate device.

## Prerequisites

- A [Civic Nexus](https://civic.com/nexus) account
- A [Twilio](https://twilio.com) account with:
  - SMS capability enabled
  - WhatsApp Sandbox or approved WhatsApp Business number
  - A phone number for sending SMS
- A [SendGrid](https://sendgrid.com) account with:
  - Verified sender email address
  - API key with Mail Send permission

## Step 1: Create a Civic Toolkit

1. Log into Civic Nexus on a **separate device** (not the OpenClaw machine)
2. Create a new Toolkit named `DontDie Safety`
3. Note the Toolkit URL and Token — you'll need these for OpenClaw

## Step 2: Add Twilio MCP Server

In the DontDie Safety Toolkit:

1. Add a new MCP Server → select **Twilio**
2. Authorize with your Twilio credentials (Account SID + Auth Token)
3. Configure OAuth scopes:
   - `send_sms` — **enabled**
   - `send_whatsapp` — **enabled**
   - `make_call` — **disabled** (Phase 1 does not auto-call)
   - All other scopes — **disabled**

### Guardrails for Twilio

Add these parameter presets / restrictions:

| Guardrail | Setting |
|-----------|---------|
| **Allowed recipient numbers** | Only numbers stored in user's emergency contacts (configure per-user or use allowlist) |
| **Blocked actions** | `make_call` — completely disabled |
| **Rate limit** | Max 10 SMS + 10 WhatsApp per hour per user |
| **From number** | Lock to your Twilio number (prevent spoofing) |

## Step 3: Add SendGrid MCP Server

1. Add a new MCP Server → select **SendGrid**
2. Authorize with your SendGrid API key
3. Configure OAuth scopes:
   - `send_email` — **enabled**
   - All other scopes — **disabled**

### Guardrails for SendGrid

| Guardrail | Setting |
|-----------|---------|
| **Allowed recipient emails** | Only emails stored in user's emergency contacts |
| **From email** | Lock to your verified sender (e.g., `alerts@dontdie.app`) |
| **From name** | `DontDie Safety Alert` |
| **Rate limit** | Max 10 emails per hour per user |
| **Blocked actions** | No bulk send, no template management |

## Step 4: Configure OpenClaw Environment

On the machine running OpenClaw, add to `~/.openclaw/workspace/.env`:

```bash
CIVIC_NEXUS_TOKEN=your_civic_toolkit_token_here
```

> Do NOT put your Twilio or SendGrid API keys here. Those stay in Civic Nexus.

## Step 5: Verify Connection

In OpenClaw, type:

```
List the MCP tools I have access to
```

You should see:
- `send_sms` (Twilio via Civic)
- `send_whatsapp` (Twilio via Civic)
- `send_email` (SendGrid via Civic)

If not, check:
1. `CIVIC_NEXUS_TOKEN` is correct in `.env`
2. Toolkit is active in Civic dashboard
3. MCP servers are authorized (tokens may expire after 30 days)

## Step 6: Test Notifications

Send a test to verify each channel:

1. **SMS test:** In OpenClaw, ask DontDie to send a test SMS to your own number
2. **WhatsApp test:** Same, but via WhatsApp
3. **Email test:** Same, but via email

Check Civic's audit log to confirm all calls were logged.

## Kill Switch

If DontDie behaves unexpectedly:

1. Go to Civic Nexus dashboard
2. Delete the DontDie Safety Toolkit
3. All API permissions are **immediately revoked** — DontDie can no longer send SMS, WhatsApp, or email
4. No code changes or redeployment needed

## Audit Log

Civic automatically logs every API call:
- Tool name, parameters, response, timestamp
- Retained for ~30 days
- Queryable via Civic Chat: "Show me all DontDie SMS sent this week"

This is critical for legal compliance — every SOS notification has a full evidence trail.
