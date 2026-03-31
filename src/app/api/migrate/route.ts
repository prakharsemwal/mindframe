import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Only allow migration if Redis is configured
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json(
        { error: "Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN." },
        { status: 400 }
      );
    }

    // Dynamic import to avoid module load issues
    const { migrateToRedis } = await import("@/lib/storage");
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
  } catch (error) {
    return NextResponse.json(
      { error: "Migration error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      message: "POST to this endpoint to migrate data from file system to Redis",
      redisConfigured: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Route error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
