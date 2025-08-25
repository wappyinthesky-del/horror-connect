-- HorrorConnect 初期データベーススキーマ
-- 本番環境用のユーザーテーブル作成

-- ユーザー基本情報テーブル
CREATE TABLE IF NOT EXISTS users (
  userid TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_verified BOOLEAN DEFAULT 0
);

-- ユーザープロフィールテーブル
CREATE TABLE IF NOT EXISTS user_profiles (
  userid TEXT PRIMARY KEY,
  birth_date TEXT,
  gender TEXT,
  prefecture TEXT,
  bio TEXT,
  avatar_url TEXT,
  FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
);

-- ホラー好み設定テーブル
CREATE TABLE IF NOT EXISTS horror_preferences (
  userid TEXT PRIMARY KEY,
  media_types TEXT, -- JSON形式で保存
  genre_types TEXT, -- JSON形式で保存
  ghost_belief TEXT,
  story_belief TEXT,
  FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
);

-- ダイレクトメッセージテーブル
CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  FOREIGN KEY (sender_id) REFERENCES users(userid) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(userid) ON DELETE CASCADE
);

-- ブロックユーザーテーブル
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(userid) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(userid) ON DELETE CASCADE
);

-- フォローユーザーテーブル
CREATE TABLE IF NOT EXISTS following_users (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(userid) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(userid) ON DELETE CASCADE
);

-- インデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_dm_timestamp ON direct_messages(timestamp);