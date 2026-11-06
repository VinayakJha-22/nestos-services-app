
BEGIN;

-- Set confirmed cleaning durations in the central service catalogue.
UPDATE public.services
SET
    duration_minutes = CASE id
        WHEN 'exterior-cleaning' THEN 30
        WHEN 'interior-exterior-cleaning' THEN 30
        WHEN 'premium-cleaning' THEN 60
    END,
    updated_at = NOW()
WHERE id IN (
    'exterior-cleaning',
    'interior-exterior-cleaning',
    'premium-cleaning'
);

COMMIT;
