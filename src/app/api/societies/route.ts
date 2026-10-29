
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        id,
        name,
        address_line,
        locality,
        city,
        state,
        postal_code,
        is_accepting_bookings
      FROM public.societies
      WHERE is_accepting_bookings = TRUE
      ORDER BY city ASC, locality ASC, name ASC
    `);

    return NextResponse.json(
      {
        success: true,
        societies: result.rows,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch societies:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load societies at this time.",
      },
      { status: 500 }
    );
  }
}
