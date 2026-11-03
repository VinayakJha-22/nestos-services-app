import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    try {
      await db.query(
        `UPDATE customer_sessions
         SET revoked_at = NOW()
         WHERE token_hash = $1
           AND revoked_at IS NULL`,
        [tokenHash]
      );
    } catch (error) {
      console.error("Customer logout error:", error);

      return NextResponse.json(
        { error: "Unable to sign out. Please try again." },
        { status: 500 }
      );
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("nestos_phone_verified");

  return NextResponse.json({ success: true });
}