
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export type OperationsRole = "central_admin" | "location_manager";

export type OperationsUser = {
  id: string;
  userReference: string;
  fullName: string;
  role: OperationsRole;
};

export async function getOperationsUser(): Promise<OperationsUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nestos_operations_session")?.value;

  if (!sessionToken) {
    return null;
  }

  const tokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const result = await db.query(
    `UPDATE operations_sessions AS s
     SET last_seen_at = NOW()
     FROM operations_users AS u
     WHERE s.token_hash = $1
       AND s.operations_user_id = u.id
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
       AND u.account_status = 'active'
     RETURNING
       u.id,
       u.user_reference,
       u.full_name,
       u.role`,
    [tokenHash],
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    userReference: user.user_reference,
    fullName: user.full_name,
    role: user.role as OperationsRole,
  };
}
