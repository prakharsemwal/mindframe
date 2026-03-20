import { NextResponse } from "next/server";
import { migrateToRedis } from "@/lib/storage";

export async function POST() {
  // Only allow migration if Redis is configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return NextResponse.json(
      { error: "Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN." },
      { status: 400 }
    );
  }

  const result = await migrateToRedis();

  if (result.success) {
    return NextResponse.json({
      message: "Migration completed successfully",
      migrated: result.migrated,
      count: result.migrated.length,
    });
  } else {
    return NextResponse.json(
      { error: "Migration failed", migrated: result.migrated },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to migrate data from file system to Redis",
    redisConfigured: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  });
}
