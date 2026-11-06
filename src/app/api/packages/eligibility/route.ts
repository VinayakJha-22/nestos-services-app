
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "nestos_customer_session";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const societyId = request.nextUrl.searchParams.get("societyId");

    if (!societyId || !uuidRegex.test(societyId)) {
      return NextResponse.json(
        { success: false, error: "A valid society ID is required." },
        { status: 400 }
      );
    }

    // 1. Validate the customer's existing session.
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Please sign in to check your package eligibility.",
        },
        { status: 401 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const customerResult = await db.query(
      `SELECT c.id
       FROM public.customer_sessions s
       INNER JOIN public.customers c
         ON c.id = s.customer_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND c.account_status = 'active'
       LIMIT 1`,
      [tokenHash]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const customerId = customerResult.rows[0].id;

    // 2. Get the credit cost configured for each service.
    const costsResult = await db.query(
      `SELECT
         psc.service_id AS "serviceId",
         psc.credit_cost AS "creditCost"
       FROM public.package_service_credit_costs psc
       ORDER BY psc.service_id`
    );

    // 3. Get this customer's subscriptions for the selected society.
    // Credits are never combined across subscriptions.
    const subscriptionsResult = await db.query(
      `SELECT
         cs.id AS "subscriptionId",
         p.name AS "packageName",
         cs.credits_remaining AS "remainingCredits",
         cs.expires_at AS "expiresAt",
         (
           cs.status = 'active'
           AND cs.starts_at <= NOW()
           AND cs.expires_at > NOW()
           AND p.is_active = TRUE
           AND sp.is_available = TRUE
         ) AS "isActiveEligible"
       FROM public.customer_subscriptions cs
       INNER JOIN public.packages p
         ON p.id = cs.package_id
       INNER JOIN public.society_packages sp
         ON sp.society_id = cs.society_id
        AND sp.package_id = cs.package_id
       WHERE cs.customer_id = $1
         AND cs.society_id = $2
         AND cs.status IN ('active', 'exhausted', 'expired')
       ORDER BY
         CASE
           WHEN cs.status = 'active'
            AND cs.starts_at <= NOW()
            AND cs.expires_at > NOW()
            AND p.is_active = TRUE
            AND sp.is_available = TRUE
           THEN 0
           ELSE 1
         END,
         cs.expires_at ASC,
         cs.created_at ASC`,
      [customerId, societyId]
    );

    const subscriptions = subscriptionsResult.rows.map((row) => ({
      subscriptionId: row.subscriptionId,
      packageName: row.packageName,
      remainingCredits: Number(row.remainingCredits),
      expiresAt: row.expiresAt,
      isActiveEligible: row.isActiveEligible === true,
    }));

    const eligibleSubscriptions = subscriptions.filter(
      (subscription) => subscription.isActiveEligible
    );

    const services = costsResult.rows.map((row) => {
      const creditCost = Number(row.creditCost);

      // A single subscription must cover the entire service cost.
      const redeemableSubscription = eligibleSubscriptions.find(
        (subscription) =>
          subscription.remainingCredits >= creditCost
      );

      const availableCredits = eligibleSubscriptions.reduce(
        (highest, subscription) =>
          Math.max(highest, subscription.remainingCredits),
        0
      );

      return {
        serviceId: row.serviceId,
        creditCost,
        availableCredits,
        canRedeem: Boolean(redeemableSubscription),
        packageName: redeemableSubscription?.packageName ?? null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        societyId,
        hasActivePackage: eligibleSubscriptions.length > 0,
        services,
        subscriptions,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to check package eligibility:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to check package eligibility at this time.",
      },
      { status: 500 }
    );
  }
}
