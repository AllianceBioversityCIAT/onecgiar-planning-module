-- Migration: Map existing porb_cross rows to standerd_cross_cutting items
--
-- Standard items:
--   1: Program Director and Associated Allocation
--   2: PMU, CGIAR Program Finance Support and associated Allocation
--   3: Area of Work Leads
--   4: Operations
--   5: Communication/Knowledge management
--   6: MELIA
--   7: Discretionary funds
--
-- Strategy: Join porb_cross → cross_cutting to get the free-text title,
-- then use keyword matching to assign the correct standard item ID.

UPDATE porb_cross pc
JOIN cross_cutting cc ON pc.cross_cutting_id = cc.id
SET pc.standerd_cross_cutting_id = CASE

  -- === 1: Program Director and Associated Allocation ===
  -- Matches: director costs, director salary, director staff, director operations, director associated
  WHEN LOWER(TRIM(cc.title)) LIKE '%director%'
    AND LOWER(TRIM(cc.title)) NOT LIKE '%discretion%'
    AND LOWER(TRIM(cc.title)) NOT LIKE '%strategic opportunity%'
    THEN 1

  -- === 7: Discretionary funds ===
  -- Must come before Operations to catch "Director's discretionary" and "Director's Strategic Opportunity"
  WHEN LOWER(TRIM(cc.title)) LIKE '%discretion%'
    THEN 7
  WHEN LOWER(TRIM(cc.title)) LIKE '%strategic opportunity%'
    THEN 7

  -- === 3: Area of Work Leads ===
  -- Matches: AoW lead, AOW lead, Area of Work leaders, AoW Leadership
  WHEN LOWER(TRIM(cc.title)) LIKE '%aow lead%'
    THEN 3
  WHEN LOWER(TRIM(cc.title)) LIKE '%aow%lead%'
    THEN 3
  WHEN LOWER(TRIM(cc.title)) LIKE '%area of work%lead%'
    THEN 3
  WHEN LOWER(TRIM(cc.title)) LIKE '%area of work%'
    THEN 3
  WHEN LOWER(TRIM(cc.title)) LIKE '%capsha accelerator lead%'
    THEN 3
  WHEN LOWER(TRIM(cc.title)) LIKE '%leads for aow%'
    THEN 3
  WHEN LOWER(TRIM(cc.title)) LIKE '%operational funds for the capsha%'
    THEN 3

  -- === 6: MELIA ===
  -- Matches: MELIA activities, MELIA funds, MELIA focal point (standalone)
  WHEN LOWER(TRIM(cc.title)) LIKE '%melia%'
    AND LOWER(TRIM(cc.title)) NOT LIKE '%pmu%'
    AND LOWER(TRIM(cc.title)) NOT LIKE '%coordinator%'
    THEN 6

  -- === 5: Communication/Knowledge management ===
  WHEN LOWER(TRIM(cc.title)) LIKE '%communication%'
    AND LOWER(TRIM(cc.title)) NOT LIKE '%pmu%'
    AND LOWER(TRIM(cc.title)) NOT LIKE '%coordinator%'
    THEN 5
  WHEN LOWER(TRIM(cc.title)) LIKE '%knowledge manage%'
    THEN 5

  -- === 2: PMU, CGIAR Program Finance Support and associated Allocation ===
  -- Matches: PMU, finance support, finance focal point, program coordinator
  WHEN LOWER(TRIM(cc.title)) LIKE '%pmu%'
    THEN 2
  WHEN LOWER(TRIM(cc.title)) LIKE '%finance%'
    THEN 2
  WHEN LOWER(TRIM(cc.title)) LIKE '%program management unit%'
    THEN 2
  WHEN LOWER(TRIM(cc.title)) LIKE '%program coordinator%'
    THEN 2

  -- === 4: Operations ===
  -- Matches: consultants, travel, meetings, workshops, admin, operations, leadership meetings
  -- Also catch-all for remaining items
  WHEN LOWER(TRIM(cc.title)) LIKE '%consultant%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%travel%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%meeting%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%workshop%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%admin%assistant%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%nares%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%operation%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%to be allocated%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%global engagement%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%scaling for impact%'
    THEN 4
  WHEN LOWER(TRIM(cc.title)) LIKE '%annual planning%'
    THEN 5

  -- Fallback: anything not matched goes to Operations (4)
  ELSE 4

END
WHERE pc.standerd_cross_cutting_id IS NULL;

-- Verification: show the mapping results
SELECT
  scc.id AS standard_id,
  scc.name AS standard_name,
  COUNT(pc.id) AS row_count,
  SUM(IFNULL(pc.budget, 0)) AS total_budget
FROM standerd_cross_cutting scc
LEFT JOIN porb_cross pc ON pc.standerd_cross_cutting_id = scc.id
GROUP BY scc.id, scc.name
ORDER BY scc.id;

-- Show any remaining unmapped rows (should be 0)
SELECT COUNT(*) AS unmapped_rows FROM porb_cross WHERE standerd_cross_cutting_id IS NULL;
