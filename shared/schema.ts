import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // Remove default UUID since we use Firebase UID
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TrueLayer bank connections for users
export const bankConnections = pgTable("bank_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: text("token_type").notNull().default("Bearer"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope").notNull(),
  isActive: boolean("is_active").default(true),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  externalId: text("external_id").unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // checking, savings, credit_card, etc.
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("GBP"),
  institutionName: text("institution_name"),
  accountNumber: text("account_number"), // masked
  isActive: boolean("is_active").default(true),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  externalId: text("external_id").unique(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  category: text("category"),
  categoryConfidence: decimal("category_confidence", { precision: 3, scale: 2 }),
  isManuallyOverridden: boolean("is_manually_overridden").default(false),
  metadata: jsonb("metadata"), // store additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  period: text("period").notNull().default("monthly"), // monthly, weekly, yearly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  targetDate: timestamp("target_date"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const netWorthHistory = pgTable("net_worth_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  netWorth: decimal("net_worth", { precision: 12, scale: 2 }).notNull(),
  totalAssets: decimal("total_assets", { precision: 12, scale: 2 }).notNull(),
  totalLiabilities: decimal("total_liabilities", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  budgets: many(budgets),
  goals: many(goals),
  netWorthHistory: many(netWorthHistory),
  bankConnections: many(bankConnections),
}));

export const bankConnectionsRelations = relations(bankConnections, ({ one }) => ({
  user: one(users, {
    fields: [bankConnections.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

export const netWorthHistoryRelations = relations(netWorthHistory, ({ one }) => ({
  user: one(users, {
    fields: [netWorthHistory.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export const insertNetWorthHistorySchema = createInsertSchema(netWorthHistory).omit({
  id: true,
  createdAt: true,
});

export const insertBankConnectionSchema = createInsertSchema(bankConnections).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type NetWorthHistory = typeof netWorthHistory.$inferSelect;
export type InsertNetWorthHistory = z.infer<typeof insertNetWorthHistorySchema>;

export type BankConnection = typeof bankConnections.$inferSelect;
export type InsertBankConnection = z.infer<typeof insertBankConnectionSchema>;

// OAuth state storage for PKCE flow
export const oauthStates = pgTable("oauth_states", {
  state: varchar("state").primaryKey(),
  userId: varchar("user_id").notNull(),
  codeVerifier: varchar("code_verifier"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type OAuthState = typeof oauthStates.$inferSelect;
