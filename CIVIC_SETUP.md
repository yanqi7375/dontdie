# DontDie — Integration Setup Guide

## Architecture Overview

| Service | How it connects | Env vars needed |
|---------|----------------|-----------------|
| **Twilio SMS/WhatsApp** | Direct API via `twilio` skill | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| **SendGrid Email** | Via Maton gateway + `sendgrid` skill | `MATON_API_KEY` |
| **Civic MCP Gateway** | MCP proxy for audit logs + future App integrations | `CIVIC_URL`, `CIVIC_TOKEN` |

---

## Step 1: Twilio Setup (SMS + WhatsApp)

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get a phone number with SMS capability
3. For WhatsApp: activate the [Twilio WhatsApp Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox) or apply for a WhatsApp Business number
4. Copy your credentials from [Twilio Console](https://console.twilio.com):
   - **Account SID** (starts with `AC...`)
   - **Auth Token**
   - **Phone Number** (format: `+1234567890`)

Add to `~/.openclaw/workspace/.env`:
```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Step 2: SendGrid Setup (Email)

The `sendgrid` skill uses the Maton gateway for managed OAuth.

1. Sign up at [maton.ai](https://maton.ai)
2. Connect your SendGrid account via Maton
3. Copy your Maton API key

Add to `~/.openclaw/workspace/.env`:
```bash
MATON_API_KEY=your_maton_api_key
```

**Alternative:** If you prefer direct SendGrid API access, you can replace the Maton gateway calls in SKILL.md with direct `api.sendgrid.com` calls using a `SENDGRID_API_KEY`.

## Step 3: Civic MCP Gateway (Already Configured)

Civic is set up as the MCP gateway. The env vars are already in your `.env`:
```bash
CIVIC_URL=https://app.civic.com/hub/mcp?accountId=...&profile=openclaw
CIVIC_TOKEN=eyJ...
```

Civic provides:
- Audit logging for all MCP tool calls
- Future integration with Stripe, Slack, and other Apps from the Civic marketplace

## Step 4: Verify Installation

Restart OpenClaw, then run:
```
openclaw skills check
```

DontDie should show as "ready" once all env vars are set.

In OpenClaw chat, test:
1. `List the MCP tools I have access to` — should include Civic tools
2. Start a conversation with DontDie — should trigger onboarding

## Installed Skills

| Skill | Location | Purpose |
|-------|----------|---------|
| `dontdie` | `~/.openclaw/workspace/skills/dontdie/` | Core DontDie safety skill |
| `twilio` | `~/.openclaw/workspace/skills/twilio/` | Twilio SMS/WhatsApp/Voice API |
| `sendgrid` | `~/.openclaw/workspace/skills/sendgrid/` | SendGrid email via Maton |
| `openclaw-civic-skill` | `~/.openclaw/workspace/skills/openclaw-civic-skill/` | Civic MCP Gateway connector |
| `openclaw-mem0` | `~/.openclaw/workspace/skills/openclaw-mem0/` | Mem0 long-term memory |
