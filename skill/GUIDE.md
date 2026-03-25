# DontDie User Guide 🦞

> because lobsters are basically immortal. you should be too.

---

## Quick Start

```
clawhub install dontdie
```

Then say `/dontdie` in any conversation. 60-second setup. done. you're now harder to kill (statistically speaking).

---

## Onboarding (60 seconds)

When you first run `/dontdie`, you'll go through a 5-step setup. it's faster than ordering coffee.

### 1. Name
> what's your name?

Just tell me. I need to know who I'm keeping alive.

### 2. Plan

| Plan | Cost | What you get |
|------|------|--------------|
| **Cloud** | $2.99/mo | Zero config. I handle SMS + email. the "I don't want to think about infrastructure" option. |
| **Self-hosted** | Free forever | You bring your own Twilio + Resend. the "I compile my own kernel" option. |

Say **cloud** or **self-hosted**. that's it.

### 3. Emergency Contact #1

> who should I bother if you die? 🦞

Give me their **name**, **phone** (with country code like +1 or +86), and **email**.

Example: `Mom, +8613812345678, mom@email.com`

### 4. Emergency Contact #2 (optional)

> two people knowing you might be dead is better than one. 🦞

Same format, or say **skip**.

### 5. Check-in Time

> what time should I check if you're alive? 🦞

Default is **9am**. Pick a time you're definitely awake. unless you want your mom getting a 3am panic text.

I'll ask for your timezone too (e.g., EST, PST, GMT+8).

---

## Daily Alive-Check

Every day at your chosen time, I send you one of these:

- "are you alive? 🦞"
- "still breathing? 🦞"
- "alive check. respond or I tell your mom. 🦞"
- "daily proof of life requested. 🦞"
- "hey. you dead yet? 🦞"
- "existence verification required. 🦞"
- "wellness check: are you still a functional human? 🦞"
- "your daily \"please confirm you haven't died\" reminder. 🦞"

### Checking In

**Reply with literally anything.** Sending a message proves you're alive. You don't need to say "alive" or "yes" -- any response counts.

But if you DO say something like "i'm alive" or "still here", you get bonus responses:

- "alive speedrun any%. current record: {streak} days. 🦞"
- "proof of life accepted. the lobster is pleased. 🦞"
- "barely counts but I'll take it. {streak} days. 🦞"
- "another day another slay (of not dying). 🦞"

### Streak Tracking

Every consecutive day you check in, your streak goes up. Miss a day? Reset to zero. it's like Duolingo but the owl calls your mom.

---

## SOS Emergency

### Trigger Words

Say any of these and I go into emergency mode immediately:

- **Explicit:** SOS, help me, emergency, 救命, 救救我, 紧急
- **Emergency numbers as text:** 911, 120, 112, 999
- **Symptoms:** can't breathe, chest pain, heart attack, I'm hurt, I'm bleeding, someone help, call an ambulance, having a stroke, I'm choking, seizure, overdose, allergic reaction, I'm dying, I fell, I can't move
- **Chinese symptoms:** 心脏难受, 胸痛, 喘不过气, 呼吸困难, 我受伤了, 在流血, 叫救护车, 我摔倒了, 我动不了, 过敏发作, 我快不行了

If it's ambiguous (like you're talking about a movie), I'll check first: "wait, are you actually dying or just being dramatic? 🦞"

### What Happens When You Trigger SOS

1. **Immediate acknowledgment:** "got it. alerting your people right now."
2. **Location request:** "share your location if you can -- it helps rescuers find you." (Location is optional. I never delay alerts waiting for GPS.)
3. **Contacts notified immediately** via SMS + email with your name, location (if available), and medical info.
4. **Emergency number shown:** Based on your location -- CN: 120, US: 911, EU: 112, UK: 999, AU: 000. "if you can, call {number} directly. that's faster than me. I'm good but I'm not an ambulance. 🦞"
5. **First aid guidance** based on your symptoms (chest pain, breathing difficulty, bleeding, choking, allergic reaction, falls, seizures, panic attacks).
6. **If you share location after the initial alert**, I send a follow-up update to all contacts with your GPS coordinates and a Google Maps link.

### GPS Location

- On WhatsApp/Telegram: tap the attachment/+ button and share your live location.
- On other platforms: paste your address or share a Google Maps link.
- Location is ALWAYS optional. Safety first -- alerts go out with or without it.

### Resolving an SOS

Say **"I'm okay"** or **"false alarm"** to resolve the emergency. Your contacts get a "all clear" notification. I reply: "oh thank god. you almost gave your mom a heart attack. and me. 🦞"

If you say "cancel" or "false alarm" within 5 minutes AND before contacts were notified, I'll stand down without alerting anyone.

---

## 24h + 48h Escalation

If you don't respond to your daily check-in:

### 24 Hours -- Gentle Nudge

Your emergency contacts receive a gentle message:

> "{your_name} has not responded to their daily alive-check for 24 hours. Please check on them."

This is the "hey, give them a call" stage.

### 48 Hours -- URGENT

If you STILL haven't replied after 48 hours, contacts get an urgent message:

> This is now urgent. Please go to their home or call local police for a welfare check.

This is the "go to their house or call the cops" stage.

### When You Finally Reply

Your contacts get an "all clear" notification. Your streak resets to 0. "there you are. your people were worried. 🦞"

---

## Commands

| Say this | What happens |
|----------|--------------|
| **help** | Shows all available commands and features |
| **pause** / **skip today** | Skips today's check-in. "fine, I'll let you live in peace today. but I'm watching. 🦞" |
| **change check-in time** | Update when I bug you daily |
| **add contact** / **change contact** | Add or update emergency contacts |
| **add medical info** | Store allergies, conditions, medications (shared with contacts during emergencies only) |
| **add location** | Store your city/address |
| **my settings** / **my stats** | View your current config + alive streak |
| **SOS** | Trigger emergency alert (see above) |
| **delete everything** | Nuke all your data, remove all crons. clean slate. |

---

## Self-Hosted Setup Guide

Chose the self-hosted plan? Here's how to get SMS and email working.

### Twilio Setup -- SMS (5 minutes)

1. Go to [twilio.com](https://twilio.com) and sign up. Free trial gives you $15 credit.
2. From the Twilio Console dashboard, copy your **Account SID** and **Auth Token**.
3. Go to **Phone Numbers > Buy a Number** and pick any number with SMS capability. Costs about $1.15/month.
4. Add these environment variables to `~/.openclaw/workspace/.env`:

```
TWILIO_ACCOUNT_SID=AC...        # from dashboard
TWILIO_AUTH_TOKEN=...            # from dashboard
TWILIO_PHONE_NUMBER=+1...       # the number you bought
```

5. **Important -- Trial account limitation:** Free Twilio accounts can only send SMS to verified phone numbers. Go to **Phone Numbers > Verified Caller IDs** and add your emergency contacts' numbers there. To send to any number, upgrade to a paid Twilio account.

### Resend Setup -- Email (2 minutes)

1. Go to [resend.com](https://resend.com) and sign up with Google or GitHub.
2. Copy your API key from the dashboard.
3. Add to `~/.openclaw/workspace/.env`:

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=DontDie <onboarding@resend.dev>
```

4. Free tier: 100 emails/day, 3,000/month. More than enough for alive-checks.

### Verifying Your Setup

After setting up both services, say **"done"** and I'll verify the connection. If either service isn't configured, I'll skip that channel silently -- but if BOTH are missing, I'll warn you.

---

## Cloud Plan

- **Zero config** -- I handle SMS and email delivery on the server side. Nothing to set up.
- **$2.99/month** (payment integration coming soon).
- All notifications are routed through the DontDie API with automatic audit logging.
- Note: Currently email-only while SMS infrastructure is being scaled. Full SMS support coming soon.

---

## Known Limitations

| Limitation | Details |
|-----------|---------|
| **Twilio Trial** | SMS only to verified phone numbers. Cloud plan upgrading to full SMS soon. |
| **GPS** | Requires you to manually share your location. I can't access GPS automatically. |
| **Silent distress codes** | Coming in v3. For now, you need to type something. |
| **Timezone** | If you don't specify a timezone during setup, I'll ask. I can't guess. |

---

## FAQ

**Q: What if I'm on a plane?**
A: Say **"pause"** before takeoff. I'll skip today's check-in. The recurring schedule stays -- I'll be back tomorrow.

**Q: Can my emergency contacts opt out?**
A: They can reply **STOP** to the SMS number to stop receiving messages from that number.

**Q: Is my medical info secure?**
A: Stored encrypted in memory, only shared with contacts during active emergencies. Say **"delete everything"** to wipe it all.

**Q: What if the notification server goes down during an SOS?**
A: I'll tell you immediately and give you your contacts' phone numbers so you can call them directly. I retry once automatically. I never say "contacts notified" unless the server confirms it.

**Q: What happens if I trigger SOS before finishing onboarding?**
A: Safety first. I skip onboarding entirely and ask: "are you in danger? give me a name and phone number to contact RIGHT NOW." We do onboarding after the emergency is resolved.

**Q: Does it work in Chinese?**
A: Yes. I detect your language during onboarding and send check-ins and alerts in your language. Supports English and Chinese.

**Q: What's the lobster about?**
A: Lobsters show negligible senescence -- they don't weaken or lose fertility as they age. Basically immortal. That's the vibe we're going for. 🦞

---

> :warning: DontDie is a safety tool, not a replacement for emergency services. In a real emergency, call 120/911/112 directly. I'm a lobster, not a doctor. 🦞
