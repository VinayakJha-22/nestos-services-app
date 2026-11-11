
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  getOperationsSocietyIds,
} from "@/lib/operations/auth";

export async function GET() {
  try {
    const user = await getOperationsUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const societyIds = await getOperationsSocietyIds(user);

    if (societyIds.length === 0) {
      return NextResponse.json({ societies: [] });
    }

    const result = await db.query(
      `SELECT
         id,
         name,
         address_line,
         locality,
         city,
         state,
         postal_code,
         is_accepting_bookings
       FROM public.societies
       WHERE id = ANY($1::uuid[])
       ORDER BY city ASC, name ASC`,
      [societyIds],
    );

    return NextResponse.json({
      societies: result.rows,
    });
  } catch (error) {
    console.error("Operations societies API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch societies" },
      { status: 500 },
    );
  }
}
