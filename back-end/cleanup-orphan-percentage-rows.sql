-- Cleanup orphaned country-percentage and location-of-benefit rows.
--
-- Background: when a TOC change removes a country from an HLO's hlo_geo (or a
-- location from an outcome's outcome_geo), the associated porb_country_percentage
-- / porb_location_benefit row is no longer rendered in the UI (filtered out by
-- the read endpoints) but stays in the database. Its percentage was still being
-- summed by updateCountryPercentage / updateLocationBenefit, producing phantom
-- 100%-blocks where users couldn't enter any value because invisible orphans
-- already filled the cap.
--
-- The validation logic was patched to mirror the read filter, so this script is
-- only needed once to clean up the residue from before the fix. After this it's
-- safe to re-run; it is idempotent (only deletes rows that do not match any
-- live HLO geo / outcome geo).
--
-- Manual rows (is_manual=1) are NEVER deleted — only auto-derived orphans.

-- 1) Country percentage orphans: non-manual rows whose country_name is not in
--    any HLO hlo_geo for the same (program, aow, center).
DELETE cp
FROM porb_country_percentage cp
WHERE cp.is_manual = 0
  AND NOT EXISTS (
    SELECT 1 FROM porb_hlo h
    WHERE h.program_id = cp.program_id
      AND h.porb_aow_id = cp.porb_aow_id
      AND h.center_id = cp.center_id
      AND h.hlo_geo IS NOT NULL
      AND FIND_IN_SET(cp.country_name, REPLACE(h.hlo_geo, ', ', ',')) > 0
  );

-- 2) Location-of-benefit orphans: non-manual rows whose location_name is not
--    in any outcome's outcome_geo for the same (program, aow). Note that
--    outcome_geo is matched by substring (LIKE) because it stores composite
--    strings like "Region: X, Y; Country: A, B" — the read path parses these
--    into discrete (name, type) pairs, but for an SQL cleanup we settle for a
--    safer substring check (won't delete a name that's mentioned anywhere in
--    the geo string for that program+aow).
--
--    Outcomes are restricted to toc_is_deleted = 0 to mirror getLocationBenefit.
DELETE lb
FROM porb_location_benefit lb
WHERE lb.is_manual = 0
  AND NOT EXISTS (
    SELECT 1 FROM porb_outcome o
    WHERE o.program_id = lb.program_id
      AND o.porb_aow_id = lb.porb_aow_id
      AND o.toc_is_deleted = 0
      AND o.outcome_geo IS NOT NULL
      AND o.outcome_geo LIKE CONCAT('%', lb.location_name, '%')
  );
