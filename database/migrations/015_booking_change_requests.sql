
BEGIN;

-- =========================================================
-- 015: BOOKING CHANGE REQUESTS
-- Customer cancellation and rescheduling requests
-- =========================================================

CREATE TABLE IF NOT EXISTS public.booking_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES public.bookings(id) ON DELETE RESTRICT,

    -- Type of customer request
    request_type TEXT NOT NULL
        CHECK (
            request_type IN (
                'cancellation',
                'reschedule'
            )
        ),

    -- Proposed appointment details.
    -- Required only for rescheduling requests.
    requested_booking_date DATE,
    requested_start_time TIME,

    -- Customer's reason or additional information
    customer_notes TEXT NOT NULL
        CHECK (
            LENGTH(TRIM(customer_notes)) BETWEEN 1 AND 1000
        ),

    -- Request lifecycle
    request_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            request_status IN (
                'pending',
                'approved',
                'rejected',
                'withdrawn'
            )
        ),

    -- Operations review
    reviewed_by_operations_user_id UUID
        REFERENCES public.operations_users(id) ON DELETE RESTRICT,

    reviewed_at TIMESTAMPTZ,

    review_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Rescheduling requires a proposed date and time.
    -- Cancellation requests must not contain proposed appointment details.
    CONSTRAINT booking_change_request_valid_details
        CHECK (
            (
                request_type = 'reschedule'
                AND requested_booking_date IS NOT NULL
                AND requested_start_time IS NOT NULL
            )
            OR
            (
                request_type = 'cancellation'
                AND requested_booking_date IS NULL
                AND requested_start_time IS NULL
            )
        ),

    -- Pending and withdrawn requests must not have review details.
    -- Approved and rejected requests must have a reviewer and timestamp.
    CONSTRAINT booking_change_request_review_details
        CHECK (
            (
                request_status IN ('approved', 'rejected')
                AND reviewed_by_operations_user_id IS NOT NULL
                AND reviewed_at IS NOT NULL
            )
            OR
            (
                request_status IN ('pending', 'withdrawn')
                AND reviewed_by_operations_user_id IS NULL
                AND reviewed_at IS NULL
            )
        )
);

-- =========================================================
-- INDEXES
-- =========================================================

-- Fetch requests for a particular booking.
CREATE INDEX IF NOT EXISTS idx_booking_change_requests_booking
    ON public.booking_change_requests(
        booking_id,
        created_at DESC
    );

-- Fetch pending requests for operations review.
CREATE INDEX IF NOT EXISTS idx_booking_change_requests_pending
    ON public.booking_change_requests(created_at DESC)
    WHERE request_status = 'pending';

-- Fetch requests by status and date.
CREATE INDEX IF NOT EXISTS idx_booking_change_requests_status
    ON public.booking_change_requests(
        request_status,
        created_at DESC
    );

-- A booking can have only one active pending request at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_change_requests_one_pending
    ON public.booking_change_requests(booking_id)
    WHERE request_status = 'pending';

-- =========================================================
-- APPLICATION PERMISSIONS
-- =========================================================

GRANT SELECT, INSERT, UPDATE
ON public.booking_change_requests
TO nestos_app;

COMMIT;
