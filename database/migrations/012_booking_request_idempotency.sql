
BEGIN;

-- =========================================================
-- 012: BOOKING REQUEST IDEMPOTENCY
-- Prevent duplicate customer bookings when a reservation
-- request is retried or submitted more than once.
-- =========================================================

-- A client-generated UUID identifies one booking attempt.
-- Nullable so existing bookings and non-customer bookings
-- remain unaffected.
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- SHA-256 hash of the normalized booking request payload.
-- Used to reject reuse of the same key with different details.
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS idempotency_request_hash TEXT;

-- Both fields must either be populated together or remain NULL.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'bookings_idempotency_fields_consistent'
          AND conrelid = 'public.bookings'::regclass
    ) THEN
        ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_idempotency_fields_consistent
        CHECK (
            (
                idempotency_key IS NULL
                AND idempotency_request_hash IS NULL
            )
            OR
            (
                idempotency_key IS NOT NULL
                AND idempotency_request_hash IS NOT NULL
                AND idempotency_request_hash ~ '^[0-9a-f]{64}$'
            )
        );
    END IF;
END
$$;

-- One idempotency key can identify only one booking
-- for a given customer.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_bookings_customer_idempotency_key
ON public.bookings (customer_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.bookings.idempotency_key IS
    'Client-generated UUID identifying one customer booking request.';

COMMENT ON COLUMN public.bookings.idempotency_request_hash IS
    'SHA-256 hash of the normalized booking request payload.';

COMMIT;
