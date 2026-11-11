
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


export async function getOperationsSocietyIds(
  user: OperationsUser,
): Promise<string[]> {
  // Central Admin has system-wide access.
  if (user.role === "central_admin") {
    const result = await db.query(
      `SELECT id
       FROM public.societies`,
    );

    return result.rows.map((row) => row.id);
  }

  // Location Managers can access only societies
  // currently assigned to their operations account.
  const result = await db.query(
    `SELECT society_id
     FROM public.society_manager_assignment_history
     WHERE responsible_party_type = 'location_manager'
       AND responsible_party_reference = $1
       AND unassigned_at IS NULL`,
    [user.userReference],
  );

  return result.rows.map((row) => row.society_id);
}


export function hasOperationsRole(
  user: OperationsUser,
  allowedRoles: OperationsRole[],
): boolean {
  return allowedRoles.includes(user.role);
}

export async function canAccessOperationsSociety(
  user: OperationsUser,
  societyId: string,
): Promise<boolean> {
  // Central Admin can access every society.
  if (user.role === "central_admin") {
    return true;
  }

  // Location Manager can access only actively assigned societies.
  const result = await db.query(
    `SELECT 1
     FROM public.society_manager_assignment_history
     WHERE society_id = $1
       AND responsible_party_type = 'location_manager'
       AND responsible_party_reference = $2
       AND unassigned_at IS NULL
     LIMIT 1`,
    [societyId, user.userReference],
  );

  return result.rowCount !== null && result.rowCount > 0;
}