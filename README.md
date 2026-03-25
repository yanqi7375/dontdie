<div align="center">

# DontDie

### Your AI says DontDie. 🦞

**The dead-simple alive-check for people who live alone.**

[![MIT License](https://img.shields.io/badge/license-MIT-black)](LICENSE)
[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-red)](https://clawhub.com/dontdie)

---

*For the 92,000,000 Chinese and 37,000,000 American people living alone — because somebody should notice.*

</div>

## What is this?

DontDie is an [OpenClaw](https://openclaw.com) skill that checks if you're alive every day. If you don't reply within 24 hours, it contacts your emergency contacts. If you say **SOS**, it alerts everyone immediately.

That's it. No app. No dashboard. Just a lobster that cares. 🦞

## Quick Start

```
clawhub install dontdie
```

Then open any OpenClaw chat:

```
/dontdie
```

Done. You're now harder to kill.

## Features

- **Daily alive-check** — Every day, your AI asks if you're okay. Reply anything to confirm.
- **SOS** — Type `SOS` and your emergency contacts get an SMS + email within seconds.
- **24-hour escalation** — Miss the check-in? Contacts get notified automatically.
- **Silent distress codes** *(Premium — coming soon)* — Set a secret phrase that triggers a silent SOS. For when "I'm fine" doesn't mean fine.

## How It Works

```
You  <-->  OpenClaw Skill  <-->  Redis Memory (state + timers)
                |                        |
                v                        v
         Civic MCP Gateway        Vercel API (cron)
                |                        |
                v                        v
        Identity verification     Twilio SMS + Resend Email
```

1. **OpenClaw Skill** handles conversation and commands
2. **Redis Memory Plugin** tracks check-in state and 24h escalation timers
3. **Civic MCP Gateway** verifies identity for emergency contact management
4. **Vercel API** runs the cron job that fires escalation alerts
5. **Twilio + Resend** deliver the actual SMS and email notifications

No data leaves the pipeline. Your contacts are encrypted at rest.

## Example Conversations

### Daily Check-in

```
🦞  are you alive?
You: yep
🦞  good. don't die. see you tomorrow.
```

### SOS

```
You: SOS
🦞  ALERT SENT. Your 3 emergency contacts have been notified via
    SMS and email. Stay where you are. Help is aware.

    Notified:
    - Mom (SMS + Email)
    - Jake (SMS + Email)
    - Dr. Chen (Email)

    Type **cancel** within 5 minutes to stand down (before contacts are notified).
```

### Onboarding

```
You: /dontdie
🦞  hey. let's make sure someone notices if you disappear.

    I need:
    1. Your check-in time (default: 9am local)
    2. At least one emergency contact

    What time works?
You: 8am
🦞  8am it is. now give me a contact — name, phone, and/or email.
You: Mom, +14155551234, mom@email.com
🦞  got it. Mom will be notified if you miss a check-in for 24h
    or if you send SOS.

    you're set. don't die. 🦞
```

### Missed Check-in (what your contact sees)

```
SMS to Mom:
"[DontDie] Your contact hasn't checked in for 24 hours.
 This is an automated safety alert. You may want to reach out."
```

## Plans

| | **Free** | **Cloud — $3/mo** |
|---|---|---|
| Daily alive-check | Yes | Yes |
| SOS alerts | Yes | Yes |
| 24h escalation | Yes | Yes |
| Emergency contacts | 2 | 10 |
| Check-in channels | Chat only | Chat, SMS, WhatsApp |
| Silent distress codes | — | Yes |
| Custom check-in schedule | — | Yes |
| Check-in history & trends | — | Yes |
| Self-hostable | Yes | — |

## Self-Hosting

1. **Clone the repo:**
   ```bash
   git clone https://github.com/yanqi7375/dontdie.git
   cd dontdie
   ```

2. **Set up the database:**
   ```bash
   psql $NEON_DATABASE_URL < api/schema.sql
   ```

3. **Configure environment:**
   ```bash
   cp api/.env.example api/.env
   ```
   Fill in your keys: `NEON_DATABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CIVIC_URL`, `CIVIC_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

4. **Deploy:**
   ```bash
   cd api && vercel --prod
   ```

5. **Install the skill:**
   ```bash
   clawhub install dontdie
   ```
   Or manually copy `skill/` to `~/.openclaw/workspace/skills/dontdie/`.

Requires: Node 20+, an Upstash Redis instance, Twilio account, Resend account, Civic account, and a Neon database.

## Tech Stack

| Layer | Technology |
|---|---|
| Skill Runtime | [OpenClaw](https://openclaw.com) |
| State & Timers | [Upstash Redis](https://upstash.com) Memory Plugin |
| Identity | [Civic](https://civic.com) MCP Gateway |
| API & Cron | [Vercel](https://vercel.com) |
| Database | [Neon](https://neon.tech) Postgres |
| SMS | [Twilio](https://twilio.com) |
| Email | [Resend](https://resend.com) |

## Sponsors

<div align="center">

Built with support from

### [Redis](https://redis.io)
DontDie uses Redis as its core state and memory layer — storing check-in status, managing 24-hour escalation timers, and powering the real-time pub/sub that triggers SOS alerts within seconds.

### [Civic](https://civic.com)
Civic's MCP Gateway provides the identity verification layer that protects emergency contact management — ensuring only verified users can add, modify, or remove the people who get notified when it matters most.

</div>

## Contributing

PRs welcome. If you have ideas for new distress signals, escalation strategies, or integrations — open an issue.

The lobster welcomes you. 🦞

## License

[MIT](LICENSE)

---

<div align="center">

**don't die.** 🦞

</div>
