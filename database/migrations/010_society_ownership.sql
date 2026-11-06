
BEGIN;

-- =========================================================
-- 010: SOCIETY OWNERSHIP AND MANAGER ASSIGNMENT
-- =========================================================

-- 1. Maintain the ownership history for each society.
CREATE TABLE IF NOT EXISTS public.society_manager_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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
                'admin'
            )
        ),

    assigned_by_reference TEXT,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,

    notes TEXT,

    CONSTRAINT society_manager_assignment_valid_period
        CHECK (
            unassigned_at IS NULL
            OR unassigned_at >= assigned_at
        )
);

-- 2. Only one active responsible owner per society.
CREATE UNIQUE INDEX IF NOT EXISTS
    idx_society_manager_one_active_owner
ON public.society_manager_assignment_history(society_id)
WHERE unassigned_at IS NULL;

-- 3. Retrieve society ownership history.
CREATE INDEX IF NOT EXISTS
    idx_society_manager_assignment_history
ON public.society_manager_assignment_history(
    society_id,
    assigned_at DESC
);

-- 4. Initially assign every existing society to Central NestOS Admin.
INSERT INTO public.society_manager_assignment_history (
    society_id,
    responsible_party_type,
    responsible_party_reference,
    responsible_party_name_snapshot,
    assigned_by_type,
    notes
)
SELECT
    s.id,
    'central_admin',
    'central-nestos-admin',
    'Central NestOS Admin',
    'system',
    'Initial default society ownership'
FROM public.societies s
WHERE NOT EXISTS (
    SELECT 1
    FROM public.society_manager_assignment_history a
    WHERE a.society_id = s.id
      AND a.unassigned_at IS NULL
);

-- 5. Give the application access to the ownership records.
GRANT SELECT, INSERT, UPDATE, DELETE
ON public.society_manager_assignment_history
TO nestos_app, postgres;

COMMIT;
