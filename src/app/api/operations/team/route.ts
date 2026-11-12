
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getOperationsUser,
  hasOperationsRole,
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

    if (!hasOperationsRole(user, ["central_admin"])) {
      return NextResponse.json(
        { error: "Only Central Admin can manage team access." },
        { status: 403 },
      );
    }

    const [usersResult, societiesResult] = await Promise.all([
      db.query(
        `SELECT
           u.id,
           u.user_reference,
           u.full_name,
           u.phone_number,
           u.email,
           u.role,
           u.account_status,
           u.phone_verified_at,
           u.created_at,
           COALESCE(
             jsonb_agg(
               jsonb_build_object(
                 'id', s.id,
                 'name', s.name
               )
               ORDER BY s.name
             ) FILTER (WHERE a.id IS NOT NULL),
             '[]'::jsonb
           ) AS assigned_societies
         FROM public.operations_users u
         LEFT JOIN public.society_manager_assignment_history a
           ON a.responsible_party_reference = u.user_reference
          AND a.responsible_party_type = 'location_manager'
          AND a.unassigned_at IS NULL
         LEFT JOIN public.societies s
           ON s.id = a.society_id
         GROUP BY u.id
         ORDER BY u.created_at DESC`,
      ),

      db.query(
        `SELECT
           id,
           name,
           address_line,
           locality,
           city,
           state,
           is_accepting_bookings
         FROM public.societies
         ORDER BY city ASC, name ASC`,
      ),
    ]);

    return NextResponse.json({
      users: usersResult.rows,
      societies: societiesResult.rows,
    });
  } catch (error) {
    console.error("Operations team API error:", error);

    return NextResponse.json(
      { error: "Unable to fetch team information." },
      { status: 500 },
    );
  }
}
