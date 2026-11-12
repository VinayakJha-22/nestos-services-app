import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperationsUser, hasOperationsRole } from "@/lib/operations/auth";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const actor = await getOperationsUser();

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasOperationsRole(actor, ["central_admin"])) {
    return NextResponse.json(
      { error: "Only Central Admin can add team members." },
      { status: 403 },
    );
  }

  let body: {
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    role?: string;
    societyIds?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const fullName = body.fullName?.trim();
  const phoneNumber = normalizePhone(body.phoneNumber ?? "");
  const email = body.email?.trim() || null;
  const role = body.role;
  const societyIds = body.societyIds ?? [];

  if (!fullName || fullName.length > 150) {
    return NextResponse.json(
      { error: "Enter a valid full name (maximum 150 characters)." },
      { status: 400 },
    );
  }

  if (!phoneNumber) {
    return NextResponse.json(
      { error: "Enter a valid Indian mobile number." },
      { status: 400 },
    );
  }

  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (role !== "central_admin" && role !== "location_manager") {
    return NextResponse.json({ error: "Invalid team role." }, { status: 400 });
  }

  if (
    !Array.isArray(societyIds) ||
    societyIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "Invalid society selection." },
      { status: 400 },
    );
  }

  if (new Set(societyIds).size !== societyIds.length) {
    return NextResponse.json(
      { error: "Duplicate societies selected." },
      { status: 400 },
    );
  }

  if (role === "location_manager" && societyIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one society for a Location Manager." },
      { status: 400 },
    );
  }

  if (role === "central_admin" && societyIds.length > 0) {
    return NextResponse.json(
      {
        error:
          "Central Admin access is global; society assignments are not required.",
      },
      { status: 400 },
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    if (societyIds.length > 0) {
      const societiesResult = await client.query(
        `SELECT id
         FROM public.societies
         WHERE id = ANY($1::uuid[])
         FOR UPDATE`,
        [societyIds],
      );

      if (societiesResult.rowCount !== societyIds.length) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "One or more selected societies do not exist." },
          { status: 400 },
        );
      }

      const occupiedResult = await client.query(
        `SELECT s.name
   FROM public.society_manager_assignment_history a
   JOIN public.societies s ON s.id = a.society_id
   WHERE a.society_id = ANY($1::uuid[])
     AND a.responsible_party_type = 'location_manager'
     AND a.unassigned_at IS NULL`,
        [societyIds],
      );

      if (occupiedResult.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "One or more societies already have an active owner.",
            societies: occupiedResult.rows.map((row) => row.name),
          },
          { status: 409 },
        );
      }
    }

    const userResult = await client.query(
      `INSERT INTO public.operations_users
        (full_name, phone_number, email, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_reference, full_name, phone_number, email, role, account_status, created_at`,
      [fullName, phoneNumber, email, role],
    );

    const newUser = userResult.rows[0];

    for (const societyId of societyIds) {
      await client.query(
        `INSERT INTO public.society_manager_assignment_history (
          society_id,
          responsible_party_type,
          responsible_party_reference,
          responsible_party_name_snapshot,
          assigned_by_type,
          assigned_by_reference,
          notes
        )
        VALUES ($1, 'location_manager', $2, $3, 'admin', $4, $5)`,
        [
          societyId,
          newUser.user_reference,
          newUser.full_name,
          actor.userReference,
          "Initial assignment when team member was created",
        ],
      );
    }

    await client.query(
      `INSERT INTO public.operations_audit_log (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        actor.id,
        "team_member_created",
        "operations_user",
        newUser.id,
        JSON.stringify({
          fullName,
          phoneNumber,
          role,
          societyIds,
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Team member created successfully.",
        user: newUser,
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        { error: "A team member with this phone number already exists." },
        { status: 409 },
      );
    }

    console.error("Create team member error:", error);

    return NextResponse.json(
      { error: "Unable to create team member." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
