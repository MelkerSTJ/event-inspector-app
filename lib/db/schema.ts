import { pgTable, text, timestamp, uuid, jsonb, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// NextAuth tables (required by DrizzleAdapter)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: timestamp('expires_at', { mode: 'date' }),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Relations for NextAuth tables
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  projects: many(projects),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// App-specific tables
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

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
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

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventName: text('event_name').notNull(),
  payload: jsonb('payload'),
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