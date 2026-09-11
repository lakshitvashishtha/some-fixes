-- ==============================================================================
-- CODEFIESTA 5.0 // DATABASE DDL SCHEMA FOR TiDB CLOUD SERVERLESS (MySQL 8.0+)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS codefiesta_db;
USE codefiesta_db;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(20) NOT NULL DEFAULT '',
  college VARCHAR(255) NOT NULL DEFAULT '',
  roll_number VARCHAR(50) NOT NULL DEFAULT '',
  course VARCHAR(50) NOT NULL DEFAULT 'B.Tech CSE',
  year VARCHAR(20) NOT NULL DEFAULT '1st',
  gender VARCHAR(20) NOT NULL DEFAULT 'male',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  leader_email VARCHAR(191) NOT NULL,
  size INT NOT NULL DEFAULT 3,
  status VARCHAR(20) NOT NULL DEFAULT 'forming', -- 'forming' | 'locked'
  payment_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted', -- 'not_submitted' | 'under_review' | 'verified' | 'rejected'
  payment_reference VARCHAR(100) NULL,
  payment_amount INT NOT NULL DEFAULT 600,
  payment_submitted_at TIMESTAMP NULL,
  payment_verified_at TIMESTAMP NULL,
  table_number VARCHAR(20) NULL,
  track VARCHAR(50) NULL,
  track_name VARCHAR(100) NULL,
  submission_repo TEXT NULL,
  submission_demo TEXT NULL,
  submission_notes TEXT NULL,
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(64) PRIMARY KEY,
  team_id VARCHAR(64) NOT NULL,
  email VARCHAR(191) NOT NULL,
  name VARCHAR(100) NOT NULL,
  college VARCHAR(255) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'leader' | 'member'
  status VARCHAR(20) NOT NULL DEFAULT 'accepted', -- 'pending' | 'accepted' | 'declined'
  invite_code VARCHAR(50) NULL,
  early_exit BOOLEAN NOT NULL DEFAULT FALSE,
  early_exit_at TIMESTAMP NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_tm_email (email),
  INDEX idx_tm_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. OPS & GLOBAL CONFIG STATE (Flexible Key-Value store for Live Tournament State)
CREATE TABLE IF NOT EXISTS ops_state (
  state_key VARCHAR(64) PRIMARY KEY,
  state_val LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. MENTOR EVALUATIONS
CREATE TABLE IF NOT EXISTS evaluations (
  id VARCHAR(64) PRIMARY KEY,
  team_id VARCHAR(64) NOT NULL,
  mentor_id VARCHAR(64) NOT NULL,
  mentor_name VARCHAR(100) NOT NULL,
  round VARCHAR(20) NOT NULL DEFAULT 'round1', -- 'round1' | 'round2'
  score_innovation INT NOT NULL DEFAULT 0,
  score_technical INT NOT NULL DEFAULT 0,
  score_feasibility INT NOT NULL DEFAULT 0,
  score_presentation INT NOT NULL DEFAULT 0,
  total_score INT NOT NULL DEFAULT 0,
  feedback TEXT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_eval_team (team_id),
  INDEX idx_eval_round (round)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. LIVE ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED INITIAL OPS STATE
INSERT INTO ops_state (state_key, state_val) VALUES
('round1_unlocked', 'false'),
('round2_unlocked', 'false'),
('problems_unlocked', 'false')
ON DUPLICATE KEY UPDATE state_key=state_key;
