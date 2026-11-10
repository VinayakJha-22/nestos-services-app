
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nestos_operations_session")?.value;

  try {
    if (sessionToken) {
      const tokenHash = createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      await db.query(
        `UPDATE operations_sessions
         SET revoked_at = NOW()
         WHERE token_hash = $1
           AND revoked_at IS NULL`,
        [tokenHash],
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    response.cookies.set("nestos_operations_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Operations logout failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to log out. Please try again." },
      { status: 500 },
    );
  }
}
