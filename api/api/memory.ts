// Redis-backed memory API for DontDie
// Uses Upstash Redis for serverless, per-user state management
// This is the "Redis Memory Plugin" integration for the DontDie skill

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
function getRedis() {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const r = getRedis();
  if (!r) {
    return res.status(503).json({ error: "Redis not configured" });
  }

  const apiKey = req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");
  if (process.env.DONTDIE_API_KEY && apiKey !== process.env.DONTDIE_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method } = req.query;
  const { userId, key, value, query } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const prefix = `dontdie:${userId}:`;

  try {
    switch (method) {
      case "store": {
        // Store a key-value pair in Redis with user namespace
        if (!key || value === undefined) {
          return res.status(400).json({ error: "key and value are required" });
        }
        await r.set(`${prefix}${key}`, JSON.stringify(value));
        // Also add to user's key index for recall
        await r.sadd(`${prefix}_keys`, key);
        return res.status(200).json({ success: true, key });
      }

      case "recall": {
        // Recall values by key prefix or exact key
        if (key) {
          // Exact key lookup
          const val = await r.get(`${prefix}${key}`);
          return res.status(200).json({ key, value: val ? JSON.parse(val as string) : null });
        }
        if (query) {
          // Search keys matching a prefix/pattern
          const allKeys = await r.smembers(`${prefix}_keys`) as string[];
          const matching = allKeys.filter(k => k.includes(query));
          const results: Record<string, any> = {};
          for (const k of matching) {
            const val = await r.get(`${prefix}${k}`);
            results[k] = val ? JSON.parse(val as string) : null;
          }
          return res.status(200).json({ results });
        }
        return res.status(400).json({ error: "key or query is required" });
      }

      case "forget": {
        // Delete a key or all keys for a user
        if (key === "*") {
          // Delete all user data
          const allKeys = await r.smembers(`${prefix}_keys`) as string[];
          for (const k of allKeys) {
            await r.del(`${prefix}${k}`);
          }
          await r.del(`${prefix}_keys`);
          return res.status(200).json({ success: true, deleted: allKeys.length });
        }
        if (key) {
          await r.del(`${prefix}${key}`);
          await r.srem(`${prefix}_keys`, key);
          return res.status(200).json({ success: true, key });
        }
        return res.status(400).json({ error: "key is required" });
      }

      case "status": {
        // Return Redis connection status and user key count
        const allKeys = await r.smembers(`${prefix}_keys`) as string[];
        return res.status(200).json({
          redis: "connected 🦞",
          userId,
          keys: allKeys.length,
          keyList: allKeys,
        });
      }

      default:
        return res.status(400).json({
          error: "Invalid method. Use: store, recall, forget, status",
          usage: {
            store: "POST /api/memory?method=store { userId, key, value }",
            recall: "POST /api/memory?method=recall { userId, key } or { userId, query }",
            forget: "POST /api/memory?method=forget { userId, key } (use key='*' to delete all)",
            status: "POST /api/memory?method=status { userId }",
          }
        });
    }
  } catch (err) {
    console.error("Redis error:", err);
    return res.status(500).json({ error: "Redis operation failed" });
  }
}
