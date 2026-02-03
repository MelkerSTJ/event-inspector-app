import { pgTable, text, timestamp, uuid, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users-tabell: alla som loggar in
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  githubId: text('github_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

// Projects-tabell: varje projekt du skapar (t.ex. "Moteva")
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('projects_user_id_idx').on(table.userId),
  slugIdx: uniqueIndex('projects_slug_idx').on(table.userId, table.slug),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  environments: many(environments),
}));

// Environments-tabell: prod, staging, etc.
export const environments = pgTable('environments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('environments_project_id_idx').on(table.projectId),
  nameProjectIdx: uniqueIndex('environments_name_project_idx').on(table.projectId, table.name),
}));

export const environmentsRelations = relations(environments, ({ one, many }) => ({
  project: one(projects, {
    fields: [environments.projectId],
    references: [projects.id],
  }),
  apiKeys: many(apiKeys),
  events: many(events),
}));

// API Keys-tabell: hemliga nycklar för varje environment
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(), // bcrypt hash (säkert)
  keyPrefix: text('key_prefix').notNull(), // "ei_abc123..." (visar i UI)
  environmentId: uuid('environment_id').notNull().references(() => environments.id, { onDelete: 'cascade' }),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  environmentIdIdx: index('api_keys_environment_id_idx').on(table.environmentId),
  keyHashIdx: uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  environment: one(environments, {
    fields: [apiKeys.environmentId],
    references: [environments.id],
  }),
}));

// Events-tabell: varje klick, submit, etc. från sajten
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventName: text('event_name').notNull(),
  payload: jsonb('payload'), // JSON-data från eventet
  url: text('url'),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  ip: text('ip'),
  environmentId: uuid('environment_id').notNull().references(() => environments.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  environmentIdIdx: index('events_environment_id_idx').on(table.environmentId),
  timestampIdx: index('events_timestamp_idx').on(table.timestamp),
  environmentTimestampIdx: index('events_environment_timestamp_idx').on(table.environmentId, table.timestamp),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  environment: one(environments, {
    fields: [events.environmentId],
    references: [environments.id],
  }),
}));