-- Restore submission statuses after "Reset All to Draft" corrupted them
-- Based on production DB copy taken before the reset was run
-- Run this on the LIVE production database

-- Approved submissions (these were changed to Draft by the reset)
UPDATE submission SET status = 'Approved' WHERE id IN (35, 31, 30, 27, 26, 36, 20, 19, 38, 24, 18, 37, 33);

-- Rejected submissions (these were changed to Draft by the reset)
UPDATE submission SET status = 'Rejected' WHERE id IN (25, 10, 7, 23, 15, 29, 17, 34, 12);

-- Draft submissions stay as Draft (no change needed)
-- IDs: 32, 28, 22, 21, 16, 14, 13, 11, 9, 8, 6, 5, 4
