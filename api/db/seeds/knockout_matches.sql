-- Seed data for 2026 World Cup Knockout Stage matches
-- Match numbers 73-104 (Round of 32 → Final)
-- Teams are placeholders; admin assigns actual teams after group stage via /admin/knockout/seed
-- Times in UTC (Costa Rica = UTC-6, so CST = UTC − 6 h)

INSERT INTO matches (match_number, kickoff_utc, home_team, away_team, stage, bracket_position, home_score, away_score, status)
VALUES

-- ===== Round of 32 (Matches 73-88, bracket positions 1-16) =====
-- Sun Jun 28 (1 match → 1:00 PM CST)
(73,  '2026-06-28 19:00:00+00', 'TBD-A', 'TBD-B', 'round_of_32', 1,  NULL, NULL, 'upcoming'),

-- Mon Jun 29 (3 matches → 11 AM, 2:30 PM, 7 PM CST)
(74,  '2026-06-29 17:00:00+00', 'TBD-C', 'TBD-D', 'round_of_32', 2,  NULL, NULL, 'upcoming'),
(75,  '2026-06-29 20:30:00+00', 'TBD-E', 'TBD-F', 'round_of_32', 3,  NULL, NULL, 'upcoming'),
(76,  '2026-06-30 01:00:00+00', 'TBD-G', 'TBD-H', 'round_of_32', 4,  NULL, NULL, 'upcoming'),

-- Tue Jun 30 (3 matches → 11 AM, 3 PM, 7 PM CST)
(77,  '2026-06-30 17:00:00+00', 'TBD-I', 'TBD-J', 'round_of_32', 5,  NULL, NULL, 'upcoming'),
(78,  '2026-06-30 21:00:00+00', 'TBD-K', 'TBD-L', 'round_of_32', 6,  NULL, NULL, 'upcoming'),
(79,  '2026-07-01 01:00:00+00', 'TBD-M', 'TBD-N', 'round_of_32', 7,  NULL, NULL, 'upcoming'),

-- Wed Jul 1 (3 matches → 10 AM, 2 PM, 6 PM CST)
(80,  '2026-07-01 16:00:00+00', 'TBD-O', 'TBD-P', 'round_of_32', 8,  NULL, NULL, 'upcoming'),
(81,  '2026-07-01 20:00:00+00', 'TBD-Q', 'TBD-R', 'round_of_32', 9,  NULL, NULL, 'upcoming'),
(82,  '2026-07-02 00:00:00+00', 'TBD-S', 'TBD-T', 'round_of_32', 10, NULL, NULL, 'upcoming'),

-- Thu Jul 2 (3 matches → 1 PM, 5 PM, 9 PM CST)
(83,  '2026-07-02 19:00:00+00', 'TBD-U', 'TBD-V', 'round_of_32', 11, NULL, NULL, 'upcoming'),
(84,  '2026-07-02 23:00:00+00', 'TBD-W', 'TBD-X', 'round_of_32', 12, NULL, NULL, 'upcoming'),
(85,  '2026-07-03 03:00:00+00', 'TBD-Y', 'TBD-Z', 'round_of_32', 13, NULL, NULL, 'upcoming'),

-- Fri Jul 3 (3 matches → 12 PM, 4 PM, 7:30 PM CST)
(86,  '2026-07-03 18:00:00+00', 'TBD-AA', 'TBD-AB', 'round_of_32', 14, NULL, NULL, 'upcoming'),
(87,  '2026-07-03 22:00:00+00', 'TBD-AC', 'TBD-AD', 'round_of_32', 15, NULL, NULL, 'upcoming'),
(88,  '2026-07-04 01:30:00+00', 'TBD-AE', 'TBD-AF', 'round_of_32', 16, NULL, NULL, 'upcoming'),

-- ===== Round of 16 (Matches 89-96) =====
-- Sat Jul 4 (11 AM, 3 PM CST)
(89, '2026-07-04 17:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),
(90, '2026-07-04 21:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),
-- Sun Jul 5 (2 PM, 6 PM CST)
(91, '2026-07-05 20:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),
(92, '2026-07-06 00:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),
-- Mon Jul 6 (1 PM, 6 PM CST)
(93, '2026-07-06 19:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),
(94, '2026-07-07 00:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),
-- Tue Jul 7 (10 AM, 2 PM CST)
(95, '2026-07-07 16:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),
(96, '2026-07-07 20:00:00+00', 'TBD', 'TBD', 'round_of_16', NULL, NULL, NULL, 'upcoming'),

-- ===== Quarter-finals (Matches 97-100) =====
-- Thu Jul 9 (2 PM CST), Fri Jul 10 (1 PM CST), Sat Jul 11 (3 PM, 7 PM CST)
(97,  '2026-07-09 20:00:00+00', 'TBD', 'TBD', 'quarter', NULL, NULL, NULL, 'upcoming'),
(98,  '2026-07-10 19:00:00+00', 'TBD', 'TBD', 'quarter', NULL, NULL, NULL, 'upcoming'),
(99,  '2026-07-11 21:00:00+00', 'TBD', 'TBD', 'quarter', NULL, NULL, NULL, 'upcoming'),
(100, '2026-07-12 01:00:00+00', 'TBD', 'TBD', 'quarter', NULL, NULL, NULL, 'upcoming'),

-- ===== Semi-finals (Matches 101-102) =====
-- Tue Jul 14 (1 PM CST), Wed Jul 15 (1 PM CST)
(101, '2026-07-14 19:00:00+00', 'TBD', 'TBD', 'semi', NULL, NULL, NULL, 'upcoming'),
(102, '2026-07-15 19:00:00+00', 'TBD', 'TBD', 'semi', NULL, NULL, NULL, 'upcoming'),

-- ===== Third place (Match 103) =====
-- Sat Jul 18 (3 PM CST)
(103, '2026-07-18 21:00:00+00', 'TBD', 'TBD', 'third', NULL, NULL, NULL, 'upcoming'),

-- ===== Final (Match 104) =====
-- Sun Jul 19 (1 PM CST)
(104, '2026-07-19 19:00:00+00', 'TBD', 'TBD', 'final', NULL, NULL, NULL, 'upcoming');

-- Update existing group matches to have stage = 'group'
UPDATE matches SET stage = 'group' WHERE stage IS NULL OR stage = '';
