
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(
      "SELECT current_database() AS database, current_user AS user"
    );

    return NextResponse.json({
      connected: true,
      database: result.rows[0].database,
      user: result.rows[0].user,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      { connected: false, error: "Database connection failed" },
      { status: 500 }
    );
  }
}
