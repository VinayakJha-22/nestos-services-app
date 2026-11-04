
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const societyId = request.nextUrl.searchParams.get("societyId");

    if (!societyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Society ID is required.",
        },
        { status: 400 }
      );
    }

    // Validate society UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(societyId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid society ID.",
        },
        { status: 400 }
      );
    }

    // Check that the society is accepting bookings
    const societyResult = await db.query(
      `SELECT id, name
       FROM public.societies
       WHERE id = $1
         AND is_accepting_bookings = TRUE
       LIMIT 1`,
      [societyId]
    );

    if (societyResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "This society is currently unavailable.",
        },
        { status: 404 }
      );
    }

    // Fetch packages enabled for this society
    const packageResult = await db.query(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.currency,
         p.credits,
         p.validity_months AS "validityMonths",
         p.display_order AS "displayOrder"
       FROM public.society_packages sp
       INNER JOIN public.packages p
         ON p.id = sp.package_id
       WHERE sp.society_id = $1
         AND sp.is_available = TRUE
         AND p.is_active = TRUE
       ORDER BY p.display_order ASC`,
      [societyId]
    );

    // Fetch prepaid-eligible services available at this society
    const serviceResult = await db.query(
      `SELECT
         svc.id,
         svc.name,
         svc.description,
         svc.duration_minutes AS "durationMinutes",
         psc.credit_cost AS "creditCost"
       FROM public.package_service_credit_costs psc
       INNER JOIN public.services svc
         ON svc.id = psc.service_id
       INNER JOIN public.society_services ss
         ON ss.service_id = svc.id
       WHERE ss.society_id = $1
         AND ss.is_available = TRUE
         AND svc.is_active = TRUE
       ORDER BY psc.credit_cost ASC`,
      [societyId]
    );

    return NextResponse.json(
      {
        success: true,
        society: societyResult.rows[0],
        packages: packageResult.rows,
        eligibleServices: serviceResult.rows,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch packages:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load packages at this time.",
      },
      { status: 500 }
    );
  }
}
