
BEGIN;

-- Close the old default Central Admin ownership records.
-- Central Admin access is now role-based and global.
UPDATE public.society_manager_assignment_history
SET
    unassigned_at = NOW(),
    notes = CONCAT(
        COALESCE(notes, ''),
        ' | Closed: Central Admin access is global and role-based.'
    )
WHERE responsible_party_type = 'central_admin'
  AND unassigned_at IS NULL;

-- Replace the old one-owner-per-society index.
DROP INDEX IF EXISTS public.idx_society_manager_one_active_owner;

-- Only one active Location Manager per society.
CREATE UNIQUE INDEX idx_society_manager_one_active_owner
ON public.society_manager_assignment_history(society_id)
WHERE unassigned_at IS NULL
  AND responsible_party_type = 'location_manager';

COMMIT;
