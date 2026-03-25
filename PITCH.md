# DontDie 🦞 — Pitch Script (10 min)

---

## Part 1: The Problem (~2 min)

**[Slide: "92,000,000"]**

Ninety-two million people in China live alone. Thirty-seven million in America. That's more than the entire population of Canada — twice.

九千两百万中国人独居。三千七百万美国人独居。加起来比加拿大全国人口的两倍还多。

**[Pause]**

Every single one of them has thought the same thing:

他们每个人都想过同一个问题：

*"If I collapse in my apartment right now… how long before anyone notices?"*

*"如果我现在在家晕倒了……要多久才会有人发现？"*

**[Slide: News headlines about people found days/weeks later]**

This isn't hypothetical. People are found days, sometimes weeks later. Not because nobody cared — but because nobody had a system to check.

这不是假设。有人被发现时已经过了好几天，甚至好几周。不是因为没人在乎——而是因为没有一个机制去确认。

**[Slide: Existing solutions]**

The solutions that exist? Life Alert — designed for elderly people. Pendant necklaces, $30/month, "I've fallen and I can't get up." No young person is going to wear that.

现有的方案呢？Life Alert——给老年人设计的。挂坠、手环、月费30美元。没有年轻人会用。

Your phone's emergency contact feature? It requires YOU to press the button. But what if you can't press anything?

手机的紧急联系人功能？需要你自己按。但如果你已经按不动了呢？

**[Slide: DontDie logo 🦞]**

So we built DontDie. Every day, your AI asks: "are you alive?" If you don't answer for 24 hours, it tells your mom. If you say SOS, it alerts everyone immediately. No hardware. No app to download. Just a lobster that won't let you die alone.

所以我们做了 DontDie。每天，你的 AI 问你："还活着吗？"24小时不回复，它告诉你妈。发 SOS，立刻通知所有人。不需要硬件，不需要下载 APP。只有一只不会让你孤独死去的龙虾。

---

## Part 2: Tech Stack (~3 min)

**[Slide: Architecture diagram]**

```
User (WhatsApp/Telegram/WeChat)
  ↕
OpenClaw Agent + DontDie Skill (SKILL.md)
  ↕                    ↕                    ↕
Redis Memory      Civic MCP Gateway      DontDie API (Vercel)
(user state)      (audit & security)       ↕         ↕
                                      Twilio    Resend
                                      (SMS)     (Email)
                                         ↕
                                    Neon PostgreSQL
```

Let me walk through each layer.

让我逐层讲解。

**[OpenClaw — The Brain]**

DontDie is an OpenClaw skill. OpenClaw is an open-source AI agent framework — think of it as an operating system for AI assistants. Our entire product is a single markdown file called SKILL.md. It teaches the AI how to be DontDie — the personality, the check-in logic, the SOS detection, everything.

DontDie 是一个 OpenClaw skill。OpenClaw 是一个开源 AI agent 框架——可以理解为 AI 助手的操作系统。我们整个产品就是一个叫 SKILL.md 的 markdown 文件。它教 AI 怎么做 DontDie——人格、签到逻辑、SOS 检测，所有的一切。

Users install it with one command: `clawhub install dontdie`. That's it. No app store, no sign-up page.

用户一行命令安装：`clawhub install dontdie`。就这样。不需要应用商店，不需要注册页面。

**[Redis — The Memory]**

When you tell DontDie your emergency contacts, your check-in time, your medical info — where does that go? Redis.

当你告诉 DontDie 你的紧急联系人、签到时间、医疗信息——这些数据存在哪？Redis。

We use Redis as the agent's memory system. Every user has an isolated namespace. The agent calls `memory_store` and `memory_recall` — it's like giving the AI a brain that persists across conversations. Without Redis, every conversation would start from zero. The agent wouldn't know who your emergency contacts are when you scream SOS.

我们用 Redis 作为 agent 的记忆系统。每个用户有独立的命名空间。Agent 调用 `memory_store` 和 `memory_recall`——就像给 AI 一个跨对话持久化的大脑。没有 Redis，每次对话都从零开始。当你喊 SOS 时，agent 根本不知道你的紧急联系人是谁。

**[Civic — The Safety Net]**

Here's the scary part: we're giving an AI the ability to send emergency alerts. What if it malfunctions? What if it sends 100 fake SOS messages?

这是可怕的部分：我们赋予了 AI 发送紧急警报的能力。如果它出故障了怎么办？如果它发了100条假 SOS 怎么办？

That's where Civic comes in. Civic is our MCP Gateway — every single API call the agent makes is logged. Who triggered the alert, when, to whom, what was sent. Complete audit trail. And if something goes wrong, we have a kill switch — one click in the Civic dashboard and all API access is instantly revoked. The agent can't send a single SMS.

这就是 Civic 的作用。Civic 是我们的 MCP 网关——agent 发出的每一个 API 调用都被记录。谁触发了警报、什么时候、发给谁、发了什么。完整的审计链路。如果出了问题，我们有一键断路器——在 Civic 后台点一下，所有 API 权限立即撤销。Agent 连一条短信都发不出去。

For a product where a false alarm could mean wasting emergency services — this isn't optional. It's critical.

对一个误报可能浪费急救资源的产品来说——这不是可选的，这是必须的。

**[Neon + Vercel — The Backend]**

The notification backend runs on Vercel serverless functions with Neon PostgreSQL. When the agent needs to alert your contacts, it makes one HTTP call to our API. The API handles Twilio SMS and Resend email delivery, logs everything to Neon, and sends audit events to Civic.

通知后端跑在 Vercel serverless functions 上，数据库是 Neon PostgreSQL。当 agent 需要通知你的联系人时，只需要发一个 HTTP 请求到我们的 API。API 负责 Twilio 短信和 Resend 邮件发送，把所有记录存入 Neon，并向 Civic 发送审计事件。

The user never touches any of this. Zero configuration. That's the whole point.

用户完全不需要接触这些。零配置。这就是核心。

---

## Part 3: Live Demo + Code (~5 min)

**[Open demo.html or OpenClaw Dashboard]**

Let me show you DontDie in action.

让我演示一下 DontDie。

**[Demo: Onboarding]**

I type `/dontdie` and it starts:

我输入 `/dontdie`，它启动了：

> "hey. I'm DontDie. 🦞 every day I'll check if you're alive. if you ghost me for 24 hours, I tell your emergency contacts. let's set you up. takes 60 seconds. what's your name?"

60 seconds. Name, one emergency contact, check-in time. Done.

60秒。名字、一个紧急联系人、签到时间。搞定。

**[Demo: Daily Check-in]**

Next morning, 9am:

第二天早上9点：

> "are you alive? 🦞"

I reply "i'm alive" and it says:

我回复 "i'm alive"，它说：

> "proof of life accepted. the lobster is pleased. 🦞 streak: 1 day"

It tracks your alive streak. People screenshot this and share it. "Day 47 of not dying" becomes a meme. That's our growth engine.

它追踪你的存活天数。人们截图分享："连续第47天没死"变成 meme。这是我们的增长引擎。

**[Demo: SOS]**

Now the serious part. I type "SOS":

现在是严肃的部分。我输入 "SOS"：

> "🚨 got it. alerting your people right now. what's happening?"

Instantly — not "are you sure?" — instantly. Because when someone is having a heart attack, every confirmation dialog could be fatal.

立刻——不是"你确定吗？"——立刻。因为当一个人心脏病发作时，每一个确认弹窗都可能是致命的。

**[Show email received by contact]**

My emergency contact just received this email:

我的紧急联系人刚收到这封邮件：

> "🚨 EMERGENCY ALERT — Selina has triggered an SOS. Location: San Francisco, CA. Symptoms: chest pain. Medical: no allergies. Please call Selina NOW. If no answer, call 911."

Full medical card, location, symptoms, clear action instructions. Not "something might be wrong" — but "here's exactly what to do."

完整的医疗卡、位置、症状、明确的行动指令。不是"可能有问题"——而是"这是你要做的事"。

**[Switch to code]**

Let me show you how this works under the hood.

让我展示一下底层怎么运作的。

**[Show SKILL.md]**

This is SKILL.md — the entire product definition. Line 1: no environment variables required. The skill installs and works immediately.

这是 SKILL.md——整个产品的定义。第1行：不需要任何环境变量。安装即可用。

Here's the SOS detection — the agent monitors every message for keywords in English, Chinese, and Spanish. "SOS", "help", "救命", "can't breathe". Clear emergency? Act immediately. Ambiguous? Ask first.

这是 SOS 检测——agent 监控每一条消息里的英文、中文、西班牙语关键词。"SOS"、"help"、"救命"、"can't breathe"。明确的紧急情况？立即行动。模糊的？先确认。

**[Show notify.ts]**

Here's the notification API. When SOS triggers, the agent calls this endpoint. It sends SMS via Twilio, email via Resend, logs to Neon, and sends audit events to Civic. All in parallel. If zero notifications get delivered, it returns a failure — because for a safety product, a false 200 is worse than a 500.

这是通知 API。SOS 触发时，agent 调用这个端点。它通过 Twilio 发短信、通过 Resend 发邮件、记录到 Neon、向 Civic 发送审计事件。全部并行。如果零条通知发出，返回失败——因为对安全产品来说，假的成功比真的失败更危险。

**[Show two-level escalation]**

And here's what I'm most proud of. The escalation system has two levels. 24 hours no reply — gentle message: "Hey, could you give Selina a call? She missed her check-in." 48 hours — urgent: "Go to her apartment. Call police for a welfare check. This is serious."

这是我最自豪的部分。升级系统有两个层级。24小时不回复——温和的消息："嘿，能给 Selina 打个电话吗？她没签到。"48小时——紧急："去她家看看。打电话报警做福利检查。这很严重。"

Because the right response to 24 hours of silence is different from 48 hours. And DontDie knows the difference.

因为24小时沉默的正确反应和48小时是不同的。DontDie 知道这个区别。

**[Final slide: "clawhub install dontdie"]**

One command. 60-second setup. Your AI checks if you're alive every day. 92 million people living alone, and all it takes is a lobster that cares.

一行命令。60秒设置。你的 AI 每天检查你是否还活着。九千两百万独居的人，只需要一只在乎你的龙虾。

Try not to die. 🦞

努力不要死掉。🦞

---

*Thank you.*

*谢谢。*
