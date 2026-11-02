
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const societyId = request.nextUrl.searchParams.get("societyId");

    if (!societyId) {
      return NextResponse.json(
        { success: false, error: "Society ID is required." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
        SELECT
          svc.id,
          svc.name,
          svc.description,
          ss.price,
          svc.is_featured AS featured,
          svc.duration_minutes
        FROM public.society_services ss
        INNER JOIN public.services svc
          ON svc.id = ss.service_id
        INNER JOIN public.societies s
          ON s.id = ss.society_id
        WHERE ss.society_id = $1
          AND ss.is_available = TRUE
          AND svc.is_active = TRUE
          AND s.is_accepting_bookings = TRUE
        ORDER BY svc.display_order ASC, svc.name ASC
      `,
      [societyId]
    );

    return NextResponse.json(
      { success: true, services: result.rows },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Failed to fetch services:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load services at this time." },
      { status: 500 }
    );
  }
}
