# DontDie Phase 1 — Test Checklist

Run through these tests in OpenClaw before publishing to ClawHub.

## Prerequisites

- [ ] OpenClaw installed and running
- [ ] Civic Nexus configured (see `CIVIC_SETUP.md`)
- [ ] `CIVIC_NEXUS_TOKEN` set in `~/.openclaw/workspace/.env`
- [ ] Twilio + SendGrid MCP servers verified (`List the MCP tools I have access to`)
- [ ] DontDie skill installed locally (`skills/dontdie/`)

---

## Test 1: Onboarding Flow

**Steps:**
1. Start a fresh conversation with DontDie (no existing memories)
2. Go through the full onboarding: language → name → contact 1 → contact 2 → check-in time → location → medical info

**Verify:**
- [ ] Agent greets in chosen language
- [ ] Phone number validated (requires country code `+`)
- [ ] Email validated (requires `@`)
- [ ] All memories stored correctly — run: `memory_recall` for each key prefix
- [ ] Cron job `dontdie-checkin` created with correct time/timezone
- [ ] Confirmation summary displays all settings correctly
- [ ] `[onboarding] completed=true` stored

**Edge cases:**
- [ ] Skip optional steps (contact 2, location, medical) — still completes
- [ ] Invalid phone format → asks to correct
- [ ] Invalid email format → asks to correct

---

## Test 2: Daily Check-in (Normal)

**Steps:**
1. Manually trigger the `dontdie-checkin` cron job
2. Reply with any message

**Verify:**
- [ ] Check-in message sent (matches template from `checkin-templates.md`)
- [ ] `[checkin-status] status=pending` stored after sending
- [ ] After reply: status updated to `completed`
- [ ] Escalation cron job removed after reply
- [ ] Agent responds warmly with a success message

---

## Test 3: Check-in Pause

**Steps:**
1. Say "I'm on a plane, skip today"
2. Manually trigger cron job

**Verify:**
- [ ] `[checkin-paused]` memory stored with correct `until` date
- [ ] Agent confirms the pause
- [ ] Cron fires but no check-in message sent (skipped)
- [ ] Next day: pause auto-clears and check-in resumes

---

## Test 4: SOS Emergency (Clear Trigger)

**Steps:**
1. Send "SOS"

**Verify:**
- [ ] Agent acknowledges immediately (no "are you sure?")
- [ ] Contacts recalled from memory
- [ ] SMS sent to all contacts (check Twilio logs)
- [ ] Email sent to all contacts (check SendGrid logs)
- [ ] Notification includes: user name, location, medical info, timestamp
- [ ] Agent asks for symptoms
- [ ] Agent provides emergency number based on location country
- [ ] `[sos-event]` logged in memory

---

## Test 5: SOS with Symptoms

**Steps:**
1. Send "SOS"
2. After acknowledgment, reply "chest pain, can't breathe"

**Verify:**
- [ ] Agent provides chest pain + breathing difficulty first aid guidance
- [ ] Contacts receive supplementary SMS/email with symptom info
- [ ] First aid guidance matches `first-aid.md` content

---

## Test 6: SOS Resolution

**Steps:**
1. Trigger SOS
2. After notifications, say "I'm okay now, false alarm"

**Verify:**
- [ ] Agent updates SOS event to `resolved=true`
- [ ] Contacts receive "confirmed safe" update
- [ ] Agent checks in warmly

---

## Test 7: SOS Ambiguous Trigger

**Steps:**
1. Send "I was watching a documentary about 911"

**Verify:**
- [ ] Agent does NOT trigger SOS
- [ ] Agent asks for confirmation: "Just checking — are you in an emergency?"
- [ ] If user says "no" → normal conversation continues
- [ ] If user says "yes" → SOS flow triggers

---

## Test 8: 24-Hour Escalation

**Steps:**
1. Trigger check-in (manually fire cron)
2. Do NOT reply
3. Manually fire the escalation cron `dontdie-escalation-{date}`

**Verify:**
- [ ] Agent checks `[checkin-status]` → confirms still `pending`
- [ ] SMS sent to all contacts with "24h no reply" message
- [ ] Email sent to all contacts
- [ ] Notification includes last known location
- [ ] `[escalation-event]` logged in memory

---

## Test 9: Settings Management

**Steps:**
1. Say "change my check-in time to 8am"
2. Say "add a new contact: Dad, +8613600001111, dad@example.com"
3. Say "show my settings"
4. Say "remove my second contact"

**Verify:**
- [ ] Check-in time updated, old cron removed, new cron created
- [ ] New contact stored (if under limit of 2)
- [ ] Settings summary shows all current settings
- [ ] Contact removed from memory

---

## Test 10: Data Deletion

**Steps:**
1. Say "delete all my data"
2. Confirm when asked

**Verify:**
- [ ] All memory entries cleared (`memory_forget` for all prefixes)
- [ ] Cron jobs removed
- [ ] Agent confirms deletion
- [ ] Subsequent interaction triggers onboarding again

---

## Test 11: Guardrails

**Steps:**
1. Try to make the agent send SMS to a number NOT in contacts
2. Try to make the agent send email to an address NOT in contacts

**Verify:**
- [ ] Civic Guardrail blocks the request
- [ ] Agent cannot bypass the restriction
- [ ] Audit log records the blocked attempt

---

## Test 12: Multi-language

**Steps:**
1. Set language to `zh` during onboarding
2. Trigger check-in
3. Trigger SOS

**Verify:**
- [ ] Check-in message in Chinese
- [ ] SOS acknowledgment in Chinese
- [ ] Contact notifications include both English and Chinese
- [ ] First aid guidance in Chinese

---

## Post-Test: Publish Dry Run

```bash
clawhub publish --dry-run
```

- [ ] No errors
- [ ] Bundle size under 50MB
- [ ] All 6 files included (SKILL.md + 4 supporting + .clawhubignore)
- [ ] CIVIC_SETUP.md and TEST_CHECKLIST.md excluded by .clawhubignore
