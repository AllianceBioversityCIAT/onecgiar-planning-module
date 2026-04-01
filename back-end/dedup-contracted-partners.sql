-- Deduplicate porb_contracted_partners: keep the row with the highest budget
-- for each (porb_partner_id, center_id) combination, delete the rest.
--
-- Step 1: Preview duplicates (run this first to see what will be deleted)
SELECT
  porb_partner_id,
  center_id,
  COUNT(*) AS row_count,
  GROUP_CONCAT(id ORDER BY id) AS ids,
  GROUP_CONCAT(budget ORDER BY id) AS budgets
FROM porb_contracted_partners
GROUP BY porb_partner_id, center_id
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates (keeps the row with highest budget; on tie, keeps lowest id)
DELETE pcp
FROM porb_contracted_partners pcp
INNER JOIN (
  SELECT porb_partner_id, center_id, MIN(keep_id) AS keep_id
  FROM (
    SELECT
      porb_partner_id,
      center_id,
      id AS keep_id,
      ROW_NUMBER() OVER (
        PARTITION BY porb_partner_id, center_id
        ORDER BY COALESCE(budget, 0) DESC, id ASC
      ) AS rn
    FROM porb_contracted_partners
  ) ranked
  WHERE rn = 1
  GROUP BY porb_partner_id, center_id
) keepers
  ON pcp.porb_partner_id = keepers.porb_partner_id
  AND pcp.center_id = keepers.center_id
  AND pcp.id != keepers.keep_id;
