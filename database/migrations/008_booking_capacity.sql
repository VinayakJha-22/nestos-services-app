
BEGIN;

-- =========================================================
-- 008: BOOKING CAPACITY AND TEMPORARY RESERVATIONS
-- =========================================================

-- 1. Society booking configuration
CREATE TABLE IF NOT EXISTS public.society_booking_settings (
    society_id UUID PRIMARY KEY
        REFERENCES public.societies(id) ON DELETE RESTRICT,

    reservation_expiry_minutes INTEGER NOT NULL
        CHECK (reservation_expiry_minutes BETWEEN 1 AND 120),

    booking_horizon_days INTEGER NOT NULL DEFAULT 14
        CHECK (booking_horizon_days BETWEEN 1 AND 60),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. Society operating hours
CREATE TABLE IF NOT EXISTS public.society_operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,

    day_of_week SMALLINT NOT NULL
        CHECK (day_of_week BETWEEN 0 AND 6),

    is_open BOOLEAN NOT NULL DEFAULT TRUE,

    opens_at TIME,
    closes_at TIME,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT society_operating_hours_unique_day
        UNIQUE (society_id, day_of_week),

    CONSTRAINT society_operating_hours_valid_configuration
        CHECK (
            (
                is_open = FALSE
                AND opens_at IS NULL
                AND closes_at IS NULL
            )
            OR
            (
                is_open = TRUE
                AND opens_at IS NOT NULL
                AND closes_at IS NOT NULL
                AND closes_at > opens_at
            )
        )
);


-- 3. Explicit fixed society start times
CREATE TABLE IF NOT EXISTS public.society_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,

    day_of_week SMALLINT NOT NULL
        CHECK (day_of_week BETWEEN 0 AND 6),

    start_time TIME NOT NULL,

    capacity_per_slot INTEGER NOT NULL DEFAULT 2 CHECK (capacity_per_slot > 0),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT society_time_slots_unique_start
        UNIQUE (society_id, day_of_week, start_time),

    CONSTRAINT society_time_slots_operating_day_fk
        FOREIGN KEY (society_id, day_of_week)
        REFERENCES public.society_operating_hours(
            society_id,
            day_of_week
        )
        ON DELETE RESTRICT
);


CREATE INDEX IF NOT EXISTS idx_society_time_slots_lookup
    ON public.society_time_slots(
        society_id,
        day_of_week,
        start_time
    )
    WHERE is_active = TRUE;



-- 5. Add responsible owner to bookings
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS responsible_party_type TEXT
    CHECK (
        responsible_party_type IN (
            'central_admin',
            'location_manager'
        )
    ),
ADD COLUMN IF NOT EXISTS responsible_party_reference TEXT,
ADD COLUMN IF NOT EXISTS responsible_party_name_snapshot TEXT;



-- 6. Responsible owner assignment history
CREATE TABLE IF NOT EXISTS public.booking_owner_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES public.bookings(id) ON DELETE RESTRICT,

    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,

    responsible_party_type TEXT NOT NULL
        CHECK (
            responsible_party_type IN (
                'central_admin',
                'location_manager'
            )
        ),

    responsible_party_reference TEXT NOT NULL,
    responsible_party_name_snapshot TEXT NOT NULL,

    assigned_by_type TEXT NOT NULL
        CHECK (
            assigned_by_type IN (
                'system',
                'manager',
                'admin',
                'crm'
            )
        ),

    assigned_by_reference TEXT,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,

    notes TEXT,

    CONSTRAINT booking_owner_assignment_valid_period
        CHECK (
            unassigned_at IS NULL
            OR unassigned_at >= assigned_at
        )
);

CREATE INDEX IF NOT EXISTS idx_booking_owner_assignment_booking
    ON public.booking_owner_assignment_history(
        booking_id,
        assigned_at DESC
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_owner_one_active_per_booking
    ON public.booking_owner_assignment_history(booking_id)
    WHERE unassigned_at IS NULL;

-- 7. Temporary checkout reservations
CREATE TABLE IF NOT EXISTS public.booking_slot_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES public.bookings(id) ON DELETE RESTRICT,

    society_id UUID NOT NULL
        REFERENCES public.societies(id) ON DELETE RESTRICT,


    society_time_slot_id UUID NOT NULL
        REFERENCES public.society_time_slots(id) ON DELETE RESTRICT,

    booking_date DATE NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'converted',
                'expired',
                'released'
            )
        ),

    expires_at TIMESTAMPTZ NOT NULL,

    converted_at TIMESTAMPTZ,

    released_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT booking_reservation_valid_time
        CHECK (end_time > start_time),

    CONSTRAINT booking_reservation_expiry
        CHECK (expires_at > created_at)
);


CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_reservation_active_booking
    ON public.booking_slot_reservations(booking_id)
    WHERE status = 'active';


CREATE INDEX IF NOT EXISTS idx_booking_reservation_society_slot
    ON public.booking_slot_reservations(
        society_id,
        booking_date,
        society_time_slot_id
    )
    WHERE status IN ('active', 'converted');




CREATE INDEX IF NOT EXISTS idx_booking_reservation_expiry
    ON public.booking_slot_reservations(expires_at)
    WHERE status = 'active';



-- 9. Application permissions
-- 9. Application permissions
GRANT SELECT, INSERT, UPDATE, DELETE
ON public.society_booking_settings,
   public.society_operating_hours,
   public.society_time_slots,
   public.booking_owner_assignment_history,
   public.booking_slot_reservations,
   public.bookings
TO nestos_app, postgres;

COMMIT;
