import { NextResponse } from "next/server";

export async function GET() {
  const health: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    redis: {
      configured: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      urlPresent: !!process.env.UPSTASH_REDIS_REST_URL,
      tokenPresent: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  };

  // Test Redis connection if configured
  if (health.redis && (health.redis as Record<string, boolean>).configured) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      // Test write
      const testKey = `health-check:${Date.now()}`;
      await redis.set(testKey, { test: true, time: Date.now() });

      // Test read
      const readBack = await redis.get(testKey);

      // Cleanup
      await redis.del(testKey);

      // Test keys listing
      const workspaceKeys = await redis.keys("workspace:*");
      const projectKeys = await redis.keys("project:*");

      (health.redis as Record<string, unknown>).connection = "ok";
      (health.redis as Record<string, unknown>).writeTest = "passed";
      (health.redis as Record<string, unknown>).readTest = readBack ? "passed" : "failed";
      (health.redis as Record<string, unknown>).workspaceCount = workspaceKeys.length;
      (health.redis as Record<string, unknown>).projectCount = projectKeys.length;
    } catch (error) {
      (health.redis as Record<string, unknown>).connection = "failed";
      (health.redis as Record<string, unknown>).error = error instanceof Error ? error.message : String(error);
      health.status = "degraded";
    }
  }

  return NextResponse.json(health);
}
