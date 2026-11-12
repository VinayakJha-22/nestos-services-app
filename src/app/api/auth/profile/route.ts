import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { error: "Please sign in to update your profile." },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() : "";

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const preferredSocietyId =
    body.preferredSocietyId === "" ? null : body.preferredSocietyId;

  const promotionalMessages = body.promotionalMessages;

  if (!fullName || fullName.length > 150) {
    return NextResponse.json(
      { error: "Please enter a valid full name (maximum 150 characters)." },
      { status: 400 }
    );
  }

  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (
    preferredSocietyId !== null &&
    (typeof preferredSocietyId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        preferredSocietyId
      ))
  ) {
    return NextResponse.json(
      { error: "Invalid preferred society." },
      { status: 400 }
    );
  }

  if (typeof promotionalMessages !== "boolean") {
    return NextResponse.json(
      { error: "Invalid promotional message preference." },
      { status: 400 }
    );
  }

  const tokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const client = await db.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const sessionResult = await client.query(
      `SELECT c.id
       FROM customer_sessions cs
       JOIN customers c ON c.id = cs.customer_id
       WHERE cs.token_hash = $1
         AND cs.revoked_at IS NULL
         AND cs.expires_at > NOW()
         AND c.account_status = 'active'
       FOR UPDATE OF c`,
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      cookieStore.delete(SESSION_COOKIE_NAME);

      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const customerId = sessionResult.rows[0].id;

    if (preferredSocietyId) {
      const societyResult = await client.query(
        `SELECT id
         FROM public.societies
         WHERE id = $1
           AND is_accepting_bookings = TRUE`,
        [preferredSocietyId]
      );

      if (societyResult.rows.length === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return NextResponse.json(
          { error: "Please select an available society." },
          { status: 400 }
        );
      }
    }

    await client.query(
      `UPDATE customers
       SET full_name = $1,
           email = $2,
           preferred_society_id = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        fullName,
        email || null,
        preferredSocietyId,
        customerId,
      ]
    );

    await client.query(
      `INSERT INTO customer_notification_preferences (
         customer_id,
         essential_booking_updates_enabled,
         promotional_messages_enabled,
         promotional_consent_updated_at,
         updated_at
       )
       VALUES ($1, TRUE, $2, NOW(), NOW())
       ON CONFLICT (customer_id)
       DO UPDATE SET
         essential_booking_updates_enabled = TRUE,
         promotional_messages_enabled = EXCLUDED.promotional_messages_enabled,
         promotional_consent_updated_at = NOW(),
         updated_at = NOW()`,
      [customerId, promotionalMessages]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Customer profile update error:", error);

    return NextResponse.json(
      { error: "Unable to update your profile. Please try again." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}