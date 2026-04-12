/**
 * 💎 Gemma Discord Bot — Persistent Memory (SQLite)
 * 3 layers: conversation history, user facts, notes
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, 'gemma-memory.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ─── Schema ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    guild_id TEXT,
    user_id TEXT,
    user_name TEXT,
    role TEXT NOT NULL,       -- 'user' | 'assistant'
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    fact TEXT NOT NULL,
    source TEXT,              -- 'learned' | 'admin_set'
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, fact)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    author_id TEXT,
    author_name TEXT,
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT,                -- comma-separated
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    channel_id TEXT,
    user_id TEXT,
    user_name TEXT,
    message TEXT NOT NULL,
    remind_at TEXT NOT NULL,
    sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_conv_channel ON conversations(channel_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_facts_user ON user_facts(user_id);
  CREATE INDEX IF NOT EXISTS idx_notes_guild ON notes(guild_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(remind_at, sent);

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    user_id TEXT,
    user_name TEXT,
    task TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_todos_guild ON todos(guild_id, status);

  CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    learned_by TEXT DEFAULT 'gemma',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(topic, content)
  );

  CREATE INDEX IF NOT EXISTS idx_knowledge_topic ON knowledge(topic);
`);

// ─── Conversations ──────────────────────────────
const stmtInsertConv = db.prepare(`
  INSERT INTO conversations (channel_id, guild_id, user_id, user_name, role, content)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtGetHistory = db.prepare(`
  SELECT role, content FROM conversations
  WHERE channel_id = ?
  ORDER BY created_at DESC
  LIMIT ?
`);
const stmtCleanOld = db.prepare(`
  DELETE FROM conversations WHERE created_at < datetime('now', '-7 days')
`);

export function addMessage(channelId, guildId, userId, userName, role, content) {
  stmtInsertConv.run(channelId, guildId, userId, userName, role, content.slice(0, 4000));
}

export function getHistory(channelId, limit = 20) {
  const rows = stmtGetHistory.all(channelId, limit);
  return rows.reverse(); // oldest first
}

// ─── User Facts ─────────────────────────────────
const stmtAddFact = db.prepare(`
  INSERT OR IGNORE INTO user_facts (user_id, fact, source) VALUES (?, ?, ?)
`);
const stmtGetFacts = db.prepare(`
  SELECT fact FROM user_facts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
`);
const stmtDeleteFact = db.prepare(`
  DELETE FROM user_facts WHERE user_id = ? AND fact LIKE ?
`);

export function addUserFact(userId, fact, source = 'learned') {
  stmtAddFact.run(userId, fact, source);
}

export function getUserFacts(userId) {
  return stmtGetFacts.all(userId).map(r => r.fact);
}

export function removeUserFact(userId, factPattern) {
  stmtDeleteFact.run(userId, `%${factPattern}%`);
}

// ─── Notes ──────────────────────────────────────
const stmtAddNote = db.prepare(`
  INSERT INTO notes (guild_id, author_id, author_name, title, content, tags)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtGetNotes = db.prepare(`
  SELECT id, title, content, tags, author_name, created_at FROM notes
  WHERE guild_id = ?
  ORDER BY created_at DESC LIMIT ?
`);
const stmtSearchNotes = db.prepare(`
  SELECT id, title, content, tags, author_name, created_at FROM notes
  WHERE guild_id = ? AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
  ORDER BY created_at DESC LIMIT 10
`);
const stmtDeleteNote = db.prepare(`DELETE FROM notes WHERE id = ?`);

export function addNote(guildId, authorId, authorName, title, content, tags = '') {
  return stmtAddNote.run(guildId, authorId, authorName, title, content, tags);
}

export function getNotes(guildId, limit = 10) {
  return stmtGetNotes.all(guildId, limit);
}

export function searchNotes(guildId, query) {
  const q = `%${query}%`;
  return stmtSearchNotes.all(guildId, q, q, q);
}

export function deleteNote(id) {
  return stmtDeleteNote.run(id);
}

// ─── Reminders ──────────────────────────────────
const stmtAddReminder = db.prepare(`
  INSERT INTO reminders (guild_id, channel_id, user_id, user_name, message, remind_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtGetDueReminders = db.prepare(`
  SELECT * FROM reminders WHERE remind_at <= datetime('now') AND sent = 0
`);
const stmtMarkSent = db.prepare(`UPDATE reminders SET sent = 1 WHERE id = ?`);
const stmtGetUserReminders = db.prepare(`
  SELECT id, message, remind_at FROM reminders
  WHERE user_id = ? AND sent = 0
  ORDER BY remind_at ASC LIMIT 10
`);

export function addReminder(guildId, channelId, userId, userName, message, remindAt) {
  return stmtAddReminder.run(guildId, channelId, userId, userName, message, remindAt);
}

export function getDueReminders() {
  return stmtGetDueReminders.all();
}

export function markReminderSent(id) {
  stmtMarkSent.run(id);
}

export function getUserReminders(userId) {
  return stmtGetUserReminders.all(userId);
}

// ─── Todos ────────────────────────────────────────
const stmtAddTodo = db.prepare(`
  INSERT INTO todos (guild_id, user_id, user_name, task, priority, due_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtGetTodos = db.prepare(`
  SELECT id, task, priority, due_at, created_at FROM todos
  WHERE user_id = ? AND status = 'pending'
  ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at ASC
  LIMIT 20
`);
const stmtGetGuildTodos = db.prepare(`
  SELECT id, task, priority, user_name, due_at FROM todos
  WHERE guild_id = ? AND status = 'pending'
  ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  LIMIT 20
`);
const stmtCompleteTodo = db.prepare(`
  UPDATE todos SET status = 'done', completed_at = datetime('now') WHERE id = ?
`);
const stmtDeleteTodo = db.prepare(`DELETE FROM todos WHERE id = ?`);

export function addTodo(guildId, userId, userName, task, priority = 'medium', dueAt = null) {
  return stmtAddTodo.run(guildId, userId, userName, task, priority, dueAt);
}

export function getTodos(userId) {
  return stmtGetTodos.all(userId);
}

export function getGuildTodos(guildId) {
  return stmtGetGuildTodos.all(guildId);
}

export function completeTodo(id) {
  return stmtCompleteTodo.run(id);
}

export function deleteTodo(id) {
  return stmtDeleteTodo.run(id);
}

// ─── Knowledge (Self-learning) ───────────────────
const stmtAddKnowledge = db.prepare(`
  INSERT OR IGNORE INTO knowledge (topic, content, source, learned_by)
  VALUES (?, ?, ?, ?)
`);
const stmtGetKnowledge = db.prepare(`
  SELECT topic, content, source, created_at FROM knowledge
  WHERE topic LIKE ? OR content LIKE ?
  ORDER BY created_at DESC LIMIT 10
`);
const stmtGetRecentKnowledge = db.prepare(`
  SELECT topic, content FROM knowledge
  ORDER BY created_at DESC LIMIT 20
`);
const stmtDeleteKnowledge = db.prepare(`
  DELETE FROM knowledge WHERE topic LIKE ? OR content LIKE ?
`);

export function addKnowledge(topic, content, source = 'web', learnedBy = 'gemma') {
  return stmtAddKnowledge.run(topic, content.slice(0, 2000), source, learnedBy);
}

export function searchKnowledge(query) {
  const q = `%${query}%`;
  return stmtGetKnowledge.all(q, q);
}

export function getRecentKnowledge() {
  return stmtGetRecentKnowledge.all();
}

export function deleteKnowledge(query) {
  const q = `%${query}%`;
  return stmtDeleteKnowledge.run(q, q);
}

// ─── Maintenance ────────────────────────────────
export function cleanup() {
  stmtCleanOld.run();
}

export function close() {
  db.close();
}

// Shared DB connection for other modules (avoid multiple connections)
export function getDb() {
  return db;
}
