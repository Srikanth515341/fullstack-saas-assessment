import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  displayName: varchar('display_name', { length: 100 }),
  bio: varchar('bio', { length: 280 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  avatarUrl: text('avatar_url'),
  emailVerifiedAt: timestamp('email_verified_at'),
  // Platform-level admin flag — deliberately a separate field from `role`
  // (which is a legacy, loosely-used field) and from `team_members.role`
  // (which is team-scoped). Being a platform admin has nothing to do with
  // owning or belonging to any particular team.
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const taskCategories = pgTable('task_categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  categoryId: integer('category_id').references(() => taskCategories.id),
  title: varchar('title', { length: 500 }).notNull(),
  // Both added for AI task suggestions (#24) — a suggestion needs somewhere
  // to put its extra fields to actually be useful once accepted, not just
  // a title.
  description: text('description'),
  priority: varchar('priority', { length: 10 }),
  completed: boolean('completed').notNull().default(false),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Shared by password reset (#8) and email verification (#9) — same shape
// (belongs to a user, single-use, expires), distinguished by `type`.
export const verificationTokens = pgTable('verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  type: varchar('type', { length: 30 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const oauthAccounts = pgTable('oauth_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  provider: varchar('provider', { length: 20 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  // Only the hash is stored — same reasoning as passwords and verification
  // tokens. `keyPrefix` is stored in the clear purely so the UI can show
  // "sk_live_ab12...9f" without ever having the full key to display again.
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  keyPrefix: varchar('key_prefix', { length: 16 }).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
});

// Local usage ledger for metered billing (#22) — this is the source of
// truth for "how much has this team used," independent of whether Stripe
// reporting succeeds. `reportedToStripeAt` is set only once a meter event
// for this row has actually been accepted by Stripe; a null value means
// either Stripe reporting hasn't been attempted (team not on a metered
// plan) or it failed and can be retried.
export const meteredUsage = pgTable('metered_usage', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  reportedToStripeAt: timestamp('reported_to_stripe_at'),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  category: one(taskCategories, {
    fields: [tasks.categoryId],
    references: [taskCategories.id],
  }),
}));

export const taskCategoriesRelations = relations(taskCategories, ({ many }) => ({
  tasks: many(tasks),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  tasks: many(tasks),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const meteredUsageRelations = relations(meteredUsage, ({ one }) => ({
  team: one(teams, {
    fields: [meteredUsage.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskCategory = typeof taskCategories.$inferSelect;
export type NewTaskCategory = typeof taskCategories.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type MeteredUsage = typeof meteredUsage.$inferSelect;
export type NewMeteredUsage = typeof meteredUsage.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
  CREATE_TASK = 'CREATE_TASK',
  COMPLETE_TASK = 'COMPLETE_TASK',
  DELETE_TASK = 'DELETE_TASK',
  RESTORE_TASK = 'RESTORE_TASK',
  REQUEST_PASSWORD_RESET = 'REQUEST_PASSWORD_RESET',
  RESET_PASSWORD = 'RESET_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  OAUTH_LOGIN = 'OAUTH_LOGIN',
  CREATE_API_KEY = 'CREATE_API_KEY',
  REVOKE_API_KEY = 'REVOKE_API_KEY',
  INVOICE_PAID = 'INVOICE_PAID',
}

// Team-scoped roles (team_members.role) — ordered from most to least
// privileged. Kept as plain strings at the DB level (already varchar(50))
// so adding a tier never needs a migration; the ordering/permission mapping
// lives in lib/auth/permissions.ts.
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
