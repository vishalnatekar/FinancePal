var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  accountsRelations: () => accountsRelations,
  bankConnections: () => bankConnections,
  bankConnectionsRelations: () => bankConnectionsRelations,
  budgets: () => budgets,
  budgetsRelations: () => budgetsRelations,
  goals: () => goals,
  goalsRelations: () => goalsRelations,
  insertAccountSchema: () => insertAccountSchema,
  insertBankConnectionSchema: () => insertBankConnectionSchema,
  insertBudgetSchema: () => insertBudgetSchema,
  insertGoalSchema: () => insertGoalSchema,
  insertNetWorthHistorySchema: () => insertNetWorthHistorySchema,
  insertTransactionSchema: () => insertTransactionSchema,
  insertUserSchema: () => insertUserSchema,
  netWorthHistory: () => netWorthHistory,
  netWorthHistoryRelations: () => netWorthHistoryRelations,
  oauthStates: () => oauthStates,
  sessions: () => sessions,
  transactions: () => transactions,
  transactionsRelations: () => transactionsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey(),
  // Remove default UUID since we use Firebase UID
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var bankConnections = pgTable("bank_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: text("token_type").notNull().default("Bearer"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope").notNull(),
  isActive: boolean("is_active").default(true),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow()
});
var accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bankConnectionId: varchar("bank_connection_id").references(() => bankConnections.id, { onDelete: "cascade" }),
  externalId: text("external_id").unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // checking, savings, credit_card, etc.
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("GBP"),
  institutionName: text("institution_name"),
  accountNumber: text("account_number"),
  // masked
  isActive: boolean("is_active").default(true),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at").defaultNow()
});
var transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  externalId: text("external_id").unique(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  category: text("category"),
  categoryConfidence: decimal("category_confidence", { precision: 3, scale: 2 }),
  isManuallyOverridden: boolean("is_manually_overridden").default(false),
  metadata: jsonb("metadata"),
  // store additional transaction details
  createdAt: timestamp("created_at").defaultNow()
});
var budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  period: text("period").notNull().default("monthly"),
  // monthly, weekly, yearly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  targetDate: timestamp("target_date"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var netWorthHistory = pgTable("net_worth_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  netWorth: decimal("net_worth", { precision: 12, scale: 2 }).notNull(),
  totalAssets: decimal("total_assets", { precision: 12, scale: 2 }).notNull(),
  totalLiabilities: decimal("total_liabilities", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  budgets: many(budgets),
  goals: many(goals),
  netWorthHistory: many(netWorthHistory),
  bankConnections: many(bankConnections)
}));
var bankConnectionsRelations = relations(bankConnections, ({ one }) => ({
  user: one(users, {
    fields: [bankConnections.userId],
    references: [users.id]
  })
}));
var accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  }),
  transactions: many(transactions)
}));
var transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id]
  })
}));
var budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id]
  })
}));
var goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id]
  })
}));
var netWorthHistoryRelations = relations(netWorthHistory, ({ one }) => ({
  user: one(users, {
    fields: [netWorthHistory.userId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true
});
var insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});
var insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true
});
var insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true
});
var insertNetWorthHistorySchema = createInsertSchema(netWorthHistory).omit({
  id: true,
  createdAt: true
});
var insertBankConnectionSchema = createInsertSchema(bankConnections).omit({
  id: true,
  createdAt: true
});
var oauthStates = pgTable("oauth_states", {
  state: varchar("state").primaryKey(),
  userId: varchar("user_id").notNull(),
  codeVerifier: varchar("code_verifier"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull()
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, gte, lte, sql as sql2 } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async getUserByGoogleId(googleId) {
    const [user] = await db.select().from(users).where(eq(users.id, googleId));
    return user || void 0;
  }
  async createUser(userData) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  async updateUser(id, userData) {
    const updateData = {};
    if (userData.email !== void 0) updateData.email = userData.email;
    if (userData.firstName !== void 0) updateData.firstName = userData.firstName;
    if (userData.lastName !== void 0) updateData.lastName = userData.lastName;
    if (userData.profileImageUrl !== void 0) updateData.profileImageUrl = userData.profileImageUrl;
    updateData.updatedAt = /* @__PURE__ */ new Date();
    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  // Account operations
  async getAccountsByUserId(userId) {
    return await db.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.isActive, true))).orderBy(desc(accounts.createdAt));
  }
  async getAccount(id) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || void 0;
  }
  async createAccount(account) {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }
  async updateAccount(id, account) {
    const [updatedAccount] = await db.update(accounts).set(account).where(eq(accounts.id, id)).returning();
    return updatedAccount;
  }
  async deleteAccount(id) {
    await db.update(accounts).set({ isActive: false }).where(eq(accounts.id, id));
  }
  // Transaction operations
  async getTransactionsByAccountId(accountId, limit = 50) {
    return await db.select().from(transactions).where(eq(transactions.accountId, accountId)).orderBy(desc(transactions.date)).limit(limit);
  }
  async getTransactionsByUserId(userId, limit = 1e3) {
    return await db.select({
      id: transactions.id,
      accountId: transactions.accountId,
      externalId: transactions.externalId,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      category: transactions.category,
      categoryConfidence: transactions.categoryConfidence,
      isManuallyOverridden: transactions.isManuallyOverridden,
      metadata: transactions.metadata,
      createdAt: transactions.createdAt
    }).from(transactions).innerJoin(accounts, eq(transactions.accountId, accounts.id)).where(and(eq(accounts.userId, userId), eq(accounts.isActive, true))).orderBy(desc(transactions.date)).limit(limit);
  }
  async getTransaction(id) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || void 0;
  }
  async createTransaction(transaction) {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }
  async updateTransaction(id, transaction) {
    const [updatedTransaction] = await db.update(transactions).set(transaction).where(eq(transactions.id, id)).returning();
    return updatedTransaction;
  }
  async deleteTransaction(id) {
    await db.delete(transactions).where(eq(transactions.id, id));
  }
  // Budget operations
  async getBudgetsByUserId(userId) {
    return await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.isActive, true))).orderBy(desc(budgets.createdAt));
  }
  async getBudget(id) {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    return budget || void 0;
  }
  async createBudget(budget) {
    const [newBudget] = await db.insert(budgets).values(budget).returning();
    return newBudget;
  }
  async updateBudget(id, budget) {
    const [updatedBudget] = await db.update(budgets).set(budget).where(eq(budgets.id, id)).returning();
    return updatedBudget;
  }
  async deleteBudget(id) {
    await db.update(budgets).set({ isActive: false }).where(eq(budgets.id, id));
  }
  // Goal operations
  async getGoalsByUserId(userId) {
    return await db.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.isActive, true))).orderBy(desc(goals.createdAt));
  }
  async getGoal(id) {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || void 0;
  }
  async createGoal(goal) {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }
  async updateGoal(id, goal) {
    const [updatedGoal] = await db.update(goals).set(goal).where(eq(goals.id, id)).returning();
    return updatedGoal;
  }
  async deleteGoal(id) {
    await db.update(goals).set({ isActive: false }).where(eq(goals.id, id));
  }
  // Net worth operations
  async getNetWorthHistoryByUserId(userId, days = 30) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return await db.select().from(netWorthHistory).where(and(eq(netWorthHistory.userId, userId), gte(netWorthHistory.date, cutoffDate))).orderBy(desc(netWorthHistory.date));
  }
  async createNetWorthHistory(netWorth) {
    const [newNetWorth] = await db.insert(netWorthHistory).values(netWorth).returning();
    return newNetWorth;
  }
  async getLatestNetWorth(userId) {
    const [latest] = await db.select().from(netWorthHistory).where(eq(netWorthHistory.userId, userId)).orderBy(desc(netWorthHistory.date)).limit(1);
    return latest || void 0;
  }
  // Analytics
  async getBudgetSpending(userId, category, startDate, endDate) {
    const result = await db.select({
      total: sql2`COALESCE(SUM(${transactions.amount}), 0)`
    }).from(transactions).innerJoin(accounts, eq(transactions.accountId, accounts.id)).where(
      and(
        eq(accounts.userId, userId),
        eq(transactions.category, category),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        sql2`${transactions.amount} < 0`
        // only expenses
      )
    );
    return Math.abs(parseFloat(result[0]?.total || "0"));
  }
  async getCategorizedTransactions(userId, startDate, endDate) {
    return await db.select({
      category: transactions.category,
      total: sql2`SUM(${transactions.amount})`,
      count: sql2`COUNT(*)`
    }).from(transactions).innerJoin(accounts, eq(transactions.accountId, accounts.id)).where(
      and(
        eq(accounts.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    ).groupBy(transactions.category);
  }
  // Bank Connection operations
  async createBankConnection(connection) {
    const [created] = await db.insert(bankConnections).values(connection).returning();
    return created;
  }
  async getActiveBankConnection(userId) {
    const [connection] = await db.select().from(bankConnections).where(and(eq(bankConnections.userId, userId), eq(bankConnections.isActive, true))).orderBy(desc(bankConnections.createdAt)).limit(1);
    return connection || void 0;
  }
  async getAllActiveBankConnections(userId) {
    return await db.select().from(bankConnections).where(and(eq(bankConnections.userId, userId), eq(bankConnections.isActive, true))).orderBy(desc(bankConnections.createdAt));
  }
  async updateBankConnection(id, connection) {
    const [updated] = await db.update(bankConnections).set(connection).where(eq(bankConnections.id, id)).returning();
    return updated;
  }
  async deactivateBankConnection(userId) {
    await db.update(bankConnections).set({ isActive: false }).where(eq(bankConnections.userId, userId));
    await db.update(accounts).set({ isActive: false }).where(eq(accounts.userId, userId));
  }
  async deactivateSpecificBankConnection(connectionId) {
    const [connection] = await db.select().from(bankConnections).where(eq(bankConnections.id, connectionId)).limit(1);
    if (!connection) {
      throw new Error("Bank connection not found");
    }
    await db.update(bankConnections).set({ isActive: false }).where(eq(bankConnections.id, connectionId));
    await db.update(accounts).set({ isActive: false }).where(eq(accounts.bankConnectionId, connectionId));
  }
  async getAccountByExternalId(externalId) {
    const [account] = await db.select().from(accounts).where(eq(accounts.externalId, externalId)).limit(1);
    return account || void 0;
  }
  async getTransactionByExternalId(externalId) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.externalId, externalId)).limit(1);
    return transaction || void 0;
  }
  async getAccountCountForUser(userId) {
    const result = await db.select({ count: sql2`COUNT(*)` }).from(accounts).where(eq(accounts.userId, userId));
    return parseInt(result[0]?.count || "0");
  }
};
var storage = new DatabaseStorage();

// server/services/truelayer.ts
import { z } from "zod";
var isLive = process.env.TRUELAYER_CLIENT_ID_LIVE && process.env.TRUELAYER_CLIENT_SECRET_LIVE;
var TRUELAYER_BASE_URL = isLive ? "https://api.truelayer.com" : "https://api.truelayer-sandbox.com";
var TRUELAYER_AUTH_URL = isLive ? "https://auth.truelayer.com" : "https://auth.truelayer-sandbox.com";
var TrueLayerAccountSchema = z.object({
  account_id: z.string(),
  account_type: z.string(),
  display_name: z.string(),
  currency: z.string(),
  account_number: z.object({
    iban: z.string().optional(),
    number: z.string().optional(),
    sort_code: z.string().optional()
  }),
  provider: z.object({
    display_name: z.string(),
    logo_uri: z.string().optional()
  })
});
var TrueLayerBalanceSchema = z.object({
  currency: z.string(),
  available: z.number(),
  current: z.number(),
  overdraft: z.number().optional()
});
var TrueLayerTransactionSchema = z.object({
  transaction_id: z.string(),
  timestamp: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  transaction_type: z.enum(["DEBIT", "CREDIT"]),
  transaction_category: z.string().optional(),
  merchant_name: z.string().optional(),
  running_balance: z.object({
    currency: z.string(),
    amount: z.number()
  }).optional()
});
var TrueLayerService = class {
  clientId;
  clientSecret;
  constructor() {
    if (process.env.TRUELAYER_CLIENT_ID_LIVE && process.env.TRUELAYER_CLIENT_SECRET_LIVE) {
      this.clientId = process.env.TRUELAYER_CLIENT_ID_LIVE;
      this.clientSecret = process.env.TRUELAYER_CLIENT_SECRET_LIVE;
    } else if (process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET) {
      this.clientId = process.env.TRUELAYER_CLIENT_ID;
      this.clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
    } else {
      throw new Error("TrueLayer credentials not found. Please add TRUELAYER_CLIENT_ID_LIVE/TRUELAYER_CLIENT_SECRET_LIVE or TRUELAYER_CLIENT_ID/TRUELAYER_CLIENT_SECRET to your environment variables.");
    }
    console.log("TrueLayer Service initialized:");
    console.log("- Client ID:", this.clientId);
    console.log("- Using live environment:", isLive);
    console.log("- Auth URL base:", TRUELAYER_AUTH_URL);
    console.log("- API URL base:", TRUELAYER_BASE_URL);
  }
  /**
   * Generate TrueLayer authorization URL for bank connection
   */
  generateAuthUrl(redirectUri, scope = ["info", "accounts", "balance", "cards", "transactions", "direct_debits", "standing_orders", "offline_access"]) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scope.join(" "),
      state: this.generateState(),
      // For security
      providers: isLive ? "uk-ob-all uk-oauth-all" : "uk-cs-mock uk-ob-all uk-oauth-all"
      // Live or sandbox providers
    });
    const authUrl = `${TRUELAYER_AUTH_URL}/?${params.toString()}`;
    console.log("Generated TrueLayer auth URL:", authUrl);
    console.log("Redirect URI:", redirectUri);
    console.log("Using environment:", process.env.NODE_ENV);
    console.log("Auth base URL:", TRUELAYER_AUTH_URL);
    return authUrl;
  }
  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, redirectUri) {
    const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("TrueLayer token exchange error details:", {
        status: response.status,
        error: errorText,
        clientId: this.clientId,
        redirectUri,
        hasClientSecret: !!this.clientSecret,
        secretLength: this.clientSecret?.length || 0
      });
      throw new Error(`TrueLayer token exchange failed: ${response.status} ${errorText}`);
    }
    return response.json();
  }
  /**
   * Fetch all accounts for a user
   */
  async getAccounts(accessToken) {
    const response = await fetch(`${TRUELAYER_BASE_URL}/data/v1/accounts`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.results.map((account) => TrueLayerAccountSchema.parse(account));
  }
  /**
   * Fetch account balance
   */
  async getAccountBalance(accessToken, accountId) {
    const response = await fetch(`${TRUELAYER_BASE_URL}/data/v1/accounts/${accountId}/balance`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch balance for account ${accountId}: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return TrueLayerBalanceSchema.parse(data.results[0]);
  }
  /**
   * Fetch account transactions
   */
  async getAccountTransactions(accessToken, accountId, from, to) {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const url = `${TRUELAYER_BASE_URL}/data/v1/accounts/${accountId}/transactions${params.toString() ? "?" + params.toString() : ""}`;
    console.log("\u{1F310} Fetching transactions from URL:", url);
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\u274C TrueLayer transactions API error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url
      });
      throw new Error(`Failed to fetch transactions for account ${accountId}: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`\u{1F4CA} Raw transaction response:`, {
      resultsCount: data.results?.length || 0,
      hasResults: !!data.results,
      dataKeys: Object.keys(data)
    });
    if (!data.results || !Array.isArray(data.results)) {
      console.log("\u26A0\uFE0F No results array in transaction response:", data);
      return [];
    }
    return data.results.map((transaction) => TrueLayerTransactionSchema.parse(transaction));
  }
  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TrueLayer token refresh failed: ${response.status} ${errorText}`);
    }
    return response.json();
  }
  /**
   * Generate a secure random state for OAuth
   */
  generateState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  /**
   * Format currency amount for UK display (GBP)
   */
  formatCurrency(amount, currency = "GBP") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency
    }).format(amount);
  }
  /**
   * Categorize transaction based on TrueLayer category and description
   */
  categorizeTransaction(transaction) {
    if (transaction.transaction_category) {
      return this.mapTrueLayerCategory(transaction.transaction_category);
    }
    const description = transaction.description.toLowerCase();
    const merchantName = transaction.merchant_name?.toLowerCase() || "";
    if (description.includes("tesco") || description.includes("sainsbury") || description.includes("asda") || description.includes("morrisons") || merchantName.includes("tesco") || merchantName.includes("sainsbury")) {
      return "Groceries";
    }
    if (description.includes("tfl") || description.includes("uber") || description.includes("transport") || description.includes("bus") || description.includes("train") || description.includes("petrol")) {
      return "Transportation";
    }
    if (description.includes("restaurant") || description.includes("cafe") || description.includes("takeaway") || description.includes("delivery") || merchantName.includes("restaurant") || merchantName.includes("cafe")) {
      return "Dining Out";
    }
    if (description.includes("cinema") || description.includes("netflix") || description.includes("spotify") || description.includes("entertainment")) {
      return "Entertainment";
    }
    if (description.includes("amazon") || description.includes("shop") || description.includes("store") || merchantName.includes("amazon")) {
      return "Shopping";
    }
    if (description.includes("direct debit") || description.includes("standing order") || description.includes("utility") || description.includes("council tax") || description.includes("insurance")) {
      return "Bills & Utilities";
    }
    return "Other";
  }
  /**
   * Map TrueLayer categories to our internal categories
   */
  mapTrueLayerCategory(trueLayerCategory) {
    const categoryMap = {
      "GROCERIES": "Groceries",
      "TRANSPORT": "Transportation",
      "RESTAURANTS": "Dining Out",
      "ENTERTAINMENT": "Entertainment",
      "SHOPPING": "Shopping",
      "BILLS_AND_UTILITIES": "Bills & Utilities",
      "CASH_AND_ATM": "Cash & ATM",
      "GENERAL": "Other"
    };
    return categoryMap[trueLayerCategory.toUpperCase()] || "Other";
  }
};
var trueLayerService = new TrueLayerService();

// server/routes.ts
var processedCodes = /* @__PURE__ */ new Set();
setInterval(() => {
  processedCodes.clear();
}, 60 * 60 * 1e3);
function requireFirebaseAuth(req, res, next) {
  const firebaseUid = req.headers["x-firebase-uid"];
  if (!firebaseUid || typeof firebaseUid !== "string") {
    return res.status(401).json({ message: "Unauthorized - Firebase UID required" });
  }
  req.firebaseUid = firebaseUid;
  next();
}
async function registerRoutes(app2) {
  app2.get("/api/banking/callback", async (req, res) => {
    console.log("CB HIT", { query: req.query, host: req.get("host") });
    if (req.query.probe) {
      return res.status(200).send("Callback endpoint is accessible without auth");
    }
    try {
      console.log("=== BANKING CALLBACK START ===");
      console.log("Query params:", JSON.stringify(req.query, null, 2));
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      const { code, state } = req.query;
      if (!code) {
        console.log("\u274C No authorization code in callback");
        return res.redirect("/?connection=error&reason=missing_code");
      }
      console.log("\u{1F50D} TrueLayer state parameter:", state);
      console.log("\u{1F504} Redirecting to frontend with auth code for client-side user identification");
      const scheme = req.get("x-forwarded-proto") || "https";
      const host = req.get("x-forwarded-host") || req.get("host");
      const frontendUrl = `${scheme}://${host}/?connection=success&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || "")}`;
      console.log("\u{1F310} Redirecting to:", frontendUrl);
      return res.redirect(frontendUrl);
    } catch (error) {
      console.error("\u274C Banking callback error:", error.message);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        code: req.query.code,
        state: req.query.state
      });
      res.redirect("/?connection=error");
    }
  });
  app2.get("/api/banking/callback-test", async (req, res) => {
    console.log("\u2705 Callback test endpoint hit");
    res.json({
      message: "Callback endpoint is accessible",
      authenticated: req.requireFirebaseAuth(),
      userId: req.user?.claims?.sub || null,
      sessionId: req.sessionID,
      hasSession: !!req.session
    });
  });
  app2.get("/api/debug/session", (req, res) => {
    res.json({
      authenticated: req.requireFirebaseAuth(),
      sessionId: req.sessionID,
      userId: req.user?.claims?.sub || null,
      sessionExists: !!req.session,
      userExists: !!req.user
    });
  });
  app2.get("/api/auth/user", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          email: null,
          // Will be updated when we get user info from Firebase
          firstName: null,
          lastName: null,
          profileImageUrl: null
        });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/accounts", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const accounts2 = await storage.getAccountsByUserId(userId);
      res.json(accounts2);
    } catch (error) {
      console.error("Get accounts error:", error);
      res.status(500).json({ message: "Failed to get accounts" });
    }
  });
  app2.post("/api/accounts", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const validatedData = insertAccountSchema.parse({ ...req.body, userId });
      const account = await storage.createAccount(validatedData);
      res.json(account);
    } catch (error) {
      console.error("Create account error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  app2.put("/api/accounts/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const account = await storage.updateAccount(id, req.body);
      res.json(account);
    } catch (error) {
      console.error("Update account error:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });
  app2.delete("/api/accounts/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAccount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
  app2.get("/api/transactions", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const transactions2 = await storage.getTransactionsByUserId(userId, limit);
      res.json(transactions2);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });
  app2.post("/api/transactions", requireFirebaseAuth, async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });
  app2.put("/api/transactions/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.updateTransaction(id, req.body);
      res.json(transaction);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });
  app2.get("/api/budgets", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const budgets2 = await storage.getBudgetsByUserId(userId);
      const transactions2 = await storage.getTransactionsByUserId(userId);
      const budgetsWithCalculations = budgets2.map((budget) => {
        const relevantTransactions = transactions2.filter((transaction) => {
          const transactionDate = new Date(transaction.date);
          const budgetStart = new Date(budget.startDate);
          const budgetEnd = budget.endDate ? new Date(budget.endDate) : /* @__PURE__ */ new Date();
          return transaction.category === budget.category && transactionDate >= budgetStart && transactionDate <= budgetEnd && parseFloat(transaction.amount) < 0;
        });
        const spent = relevantTransactions.reduce(
          (total, transaction) => total + Math.abs(parseFloat(transaction.amount)),
          0
        );
        const budgetAmount = parseFloat(budget.amount);
        const remaining = budgetAmount - spent;
        const percentageUsed = budgetAmount > 0 ? spent / budgetAmount * 100 : 0;
        return {
          ...budget,
          spent,
          remaining,
          percentageUsed
        };
      });
      res.json(budgetsWithCalculations);
    } catch (error) {
      console.error("Get budgets error:", error);
      res.status(500).json({ message: "Failed to get budgets" });
    }
  });
  app2.post("/api/budgets", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const budgetData = {
        ...req.body,
        userId,
        startDate: /* @__PURE__ */ new Date(),
        // Set current date as start date
        endDate: req.body.period === "monthly" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3) : req.body.period === "weekly" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3)
        // yearly
      };
      const validatedData = insertBudgetSchema.parse(budgetData);
      const budget = await storage.createBudget(validatedData);
      res.json(budget);
    } catch (error) {
      console.error("Create budget error:", error);
      res.status(500).json({ message: "Failed to create budget" });
    }
  });
  app2.put("/api/budgets/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const budget = await storage.updateBudget(id, req.body);
      res.json(budget);
    } catch (error) {
      console.error("Update budget error:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });
  app2.delete("/api/budgets/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBudget(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete budget error:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });
  app2.get("/api/goals", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const goals2 = await storage.getGoalsByUserId(userId);
      const goalsWithCalculations = goals2.map((goal) => {
        const current = parseFloat(goal.currentAmount);
        const target = parseFloat(goal.targetAmount);
        const progress = target > 0 ? current / target * 100 : 0;
        const remaining = target - current;
        let timeRemaining = null;
        if (goal.targetDate) {
          const now = /* @__PURE__ */ new Date();
          const targetDate = new Date(goal.targetDate);
          const timeDiff = targetDate.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1e3 * 3600 * 24));
          if (daysRemaining > 0) {
            if (daysRemaining === 1) {
              timeRemaining = "1 day";
            } else if (daysRemaining < 30) {
              timeRemaining = `${daysRemaining} days`;
            } else if (daysRemaining < 365) {
              const months = Math.ceil(daysRemaining / 30);
              timeRemaining = months === 1 ? "1 month" : `${months} months`;
            } else {
              const years = Math.ceil(daysRemaining / 365);
              timeRemaining = years === 1 ? "1 year" : `${years} years`;
            }
          } else {
            timeRemaining = "Overdue";
          }
        }
        return {
          ...goal,
          progress,
          remaining,
          timeRemaining
        };
      });
      res.json(goalsWithCalculations);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ message: "Failed to get goals" });
    }
  });
  app2.post("/api/goals", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const goalData = {
        ...req.body,
        userId,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null
      };
      const validatedData = insertGoalSchema.parse(goalData);
      const goal = await storage.createGoal(validatedData);
      res.json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });
  app2.put("/api/goals/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const goal = await storage.updateGoal(id, req.body);
      res.json(goal);
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });
  app2.delete("/api/goals/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });
  app2.get("/api/net-worth", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const days = req.query.days ? parseInt(req.query.days) : 90;
      let history = await storage.getNetWorthHistoryByUserId(userId, days);
      const current = await storage.getLatestNetWorth(userId);
      try {
        const transactions2 = await storage.getTransactionsByUserId(userId);
        if (transactions2 && transactions2.length > 0 && current) {
          const currentBalance = parseFloat(current.netWorth);
          const historicalData = [];
          const sortedTransactions = transactions2.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const earliestDate = new Date(sortedTransactions[0].date);
          const currentDate = /* @__PURE__ */ new Date();
          const totalTransactionValue = transactions2.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          let startingBalance = currentBalance - totalTransactionValue;
          const daysBetween = Math.ceil((currentDate.getTime() - earliestDate.getTime()) / (1e3 * 60 * 60 * 24));
          let runningBalance = startingBalance;
          for (let day = 0; day <= daysBetween; day++) {
            const dayDate = new Date(earliestDate);
            dayDate.setDate(earliestDate.getDate() + day);
            if (dayDate > currentDate) break;
            const transactionsUpToDay = sortedTransactions.filter(
              (t) => new Date(t.date) <= dayDate
            );
            const balanceChange = transactionsUpToDay.reduce((sum, t) => sum + parseFloat(t.amount), 0);
            runningBalance = startingBalance + balanceChange;
            historicalData.push({
              id: `historical-${day}`,
              userId,
              netWorth: runningBalance.toString(),
              totalAssets: Math.max(runningBalance, 0).toString(),
              totalLiabilities: Math.max(-runningBalance, 0).toString(),
              date: dayDate,
              createdAt: dayDate,
              updatedAt: dayDate
            });
          }
          history = historicalData;
        }
      } catch (error) {
        console.error("Error creating historical data from transactions:", error);
      }
      res.json({
        current: current || null,
        history: history || []
      });
    } catch (error) {
      console.error("Get net worth error:", error);
      res.status(500).json({ message: "Failed to get net worth history" });
    }
  });
  app2.get("/api/net-worth/latest", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const latest = await storage.getLatestNetWorth(userId);
      res.json(latest);
    } catch (error) {
      console.error("Get latest net worth error:", error);
      res.status(500).json({ message: "Failed to get latest net worth" });
    }
  });
  app2.post("/api/net-worth/calculate", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const accounts2 = await storage.getAccountsByUserId(userId);
      let totalAssets = 0;
      let totalLiabilities = 0;
      for (const account of accounts2) {
        const balance = parseFloat(account.balance);
        if (account.type === "credit_card" || account.type === "credit") {
          totalLiabilities += Math.abs(balance);
        } else {
          totalAssets += balance;
        }
      }
      const netWorth = totalAssets - totalLiabilities;
      const newRecord = await storage.createNetWorthHistory({
        userId,
        totalAssets: totalAssets.toString(),
        totalLiabilities: totalLiabilities.toString(),
        netWorth: netWorth.toString(),
        date: /* @__PURE__ */ new Date()
      });
      res.json(newRecord);
    } catch (error) {
      console.error("Calculate net worth error:", error);
      res.status(500).json({ message: "Failed to calculate net worth" });
    }
  });
  app2.get("/api/analytics/spending", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const { category, startDate, endDate } = req.query;
      const spending = await storage.getBudgetSpending(
        userId,
        category,
        new Date(startDate),
        new Date(endDate)
      );
      res.json({ spending });
    } catch (error) {
      console.error("Get spending analytics error:", error);
      res.status(500).json({ message: "Failed to get spending analytics" });
    }
  });
  app2.get("/api/analytics/categories", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const { startDate, endDate } = req.query;
      const categoryData = await storage.getCategorizedTransactions(
        userId,
        new Date(startDate),
        new Date(endDate)
      );
      res.json(categoryData);
    } catch (error) {
      console.error("Get category analytics error:", error);
      res.status(500).json({ message: "Failed to get category analytics" });
    }
  });
  app2.get("/api/banking/connect", requireFirebaseAuth, async (req, res) => {
    try {
      const redirectUri = "https://myfinancepal.co.uk/api/banking/callback";
      console.log("\u{1F310} Using whitelisted callback URL:", redirectUri);
      const authUrl = trueLayerService.generateAuthUrl(redirectUri);
      res.json({ authUrl });
    } catch (error) {
      console.error("Generate auth URL error:", error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });
  app2.post("/api/banking/complete-connection", requireFirebaseAuth, async (req, res) => {
    try {
      const { code } = req.body;
      const userId = req.firebaseUid;
      if (!code) {
        return res.status(400).json({ message: "Authorization code is required" });
      }
      if (processedCodes.has(code)) {
        console.log("\u274C Authorization code already processed:", code.substring(0, 10) + "...");
        return res.status(400).json({
          success: false,
          message: "Authorization code has already been used",
          hint: "Please start a fresh banking connection - authorization codes can only be used once."
        });
      }
      processedCodes.add(code);
      console.log("\u{1F504} Completing banking connection for user:", userId);
      let user = await storage.getUser(userId);
      if (!user) {
        console.log("\u{1F464} Creating user record in database:", userId);
        const uniqueEmail = `user-${userId.slice(-8)}@firebase-temp.com`;
        user = await storage.upsertUser({
          id: userId,
          email: uniqueEmail,
          firstName: "User",
          lastName: "",
          profileImageUrl: null
        });
        console.log("\u2705 User created with unique email:", user);
      }
      const redirectUri = "https://myfinancepal.co.uk/api/banking/callback";
      console.log("\u{1F504} Exchanging code for token...");
      console.log("Code received:", code.substring(0, 20) + "...");
      console.log("Redirect URI:", redirectUri);
      let tokenData;
      try {
        tokenData = await trueLayerService.exchangeCodeForToken(code, redirectUri);
        console.log("\u2705 Token exchange successful");
        console.log("Token type:", tokenData.token_type);
      } catch (tokenError) {
        console.error("\u274C TrueLayer token exchange failed:", tokenError.message);
        let errorMessage = "Failed to complete banking connection";
        let hint = "Please try connecting your bank again";
        if (tokenError.message.includes("invalid_grant")) {
          errorMessage = "Authorization code has expired or been used already";
          hint = "Authorization codes can only be used once and expire quickly. Please start a fresh banking connection.";
        } else if (tokenError.message.includes("400")) {
          errorMessage = "Invalid authorization request";
          hint = "There was an issue with the banking authorization. Please try connecting again.";
        }
        return res.status(500).json({
          success: false,
          message: errorMessage,
          error: `TrueLayer token exchange failed: ${tokenError.message}`,
          hint
        });
      }
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1e3);
      const bankConnection = await storage.createBankConnection({
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresAt,
        scope: "accounts balance transactions"
      });
      console.log("\u{1F504} Starting automatic data sync...");
      let trueLayerAccounts;
      try {
        trueLayerAccounts = await trueLayerService.getAccounts(tokenData.access_token);
        console.log(`\u{1F4CA} Found ${trueLayerAccounts.length} accounts`);
        console.log("\u{1F4CB} Account details:", trueLayerAccounts.map((acc) => ({
          id: acc.account_id,
          name: acc.display_name,
          type: acc.account_type,
          provider: acc.provider?.display_name
        })));
      } catch (accountFetchError) {
        console.error("\u274C Failed to fetch accounts from TrueLayer:", accountFetchError.message);
        console.error("Account fetch error details:", accountFetchError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch account data from bank",
          error: accountFetchError.message
        });
      }
      let syncedAccountsCount = 0;
      let syncedTransactionsCount = 0;
      try {
        console.log("\u{1F680} Starting account processing loop...");
        for (let i = 0; i < trueLayerAccounts.length; i++) {
          const tlAccount = trueLayerAccounts[i];
          console.log(`\u{1F3E6} Processing account ${i + 1}/${trueLayerAccounts.length}: ${tlAccount.display_name} (${tlAccount.account_id})`);
          try {
            let account = await storage.getAccountByExternalId(tlAccount.account_id);
            if (!account) {
              console.log(`\u2795 Creating new account: ${tlAccount.display_name}`);
              account = await storage.createAccount({
                userId,
                bankConnectionId: bankConnection.id,
                externalId: tlAccount.account_id,
                name: tlAccount.display_name,
                type: tlAccount.account_type.toLowerCase(),
                currency: tlAccount.currency,
                institutionName: tlAccount.provider.display_name,
                accountNumber: tlAccount.account_number?.number || "Hidden",
                balance: "0"
              });
              syncedAccountsCount++;
              console.log(`\u2705 Account created: ${account.id}`);
            } else {
              console.log(`\u{1F504} Updating existing account: ${tlAccount.display_name}`);
            }
            console.log(`\u{1F4B0} Fetching balance for ${tlAccount.display_name}`);
            try {
              const balance = await trueLayerService.getAccountBalance(tokenData.access_token, tlAccount.account_id);
              await storage.updateAccount(account.id, {
                balance: balance.current.toString(),
                lastSynced: /* @__PURE__ */ new Date()
              });
              console.log(`\u2705 Balance updated: ${balance.current} ${balance.currency}`);
            } catch (balanceError) {
              console.error(`\u274C Failed to fetch balance for ${tlAccount.display_name}:`, balanceError.message);
            }
            const fromDate = /* @__PURE__ */ new Date();
            fromDate.setDate(fromDate.getDate() - 180);
            console.log(`\u{1F50D} Fetching transactions for account ${tlAccount.display_name} from ${fromDate.toISOString().split("T")[0]}`);
            let transactions2 = [];
            try {
              transactions2 = await trueLayerService.getAccountTransactions(
                tokenData.access_token,
                tlAccount.account_id,
                fromDate.toISOString().split("T")[0]
              );
              console.log(`\u{1F4CA} Found ${transactions2.length} transactions for ${tlAccount.display_name}`);
            } catch (transactionError) {
              console.error(`\u274C Failed to fetch transactions for ${tlAccount.display_name}:`, transactionError.message);
              transactions2 = [];
            }
            console.log(`\u{1F4BE} Processing ${transactions2.length} transactions for ${tlAccount.display_name}`);
            for (let j = 0; j < transactions2.length; j++) {
              const tlTransaction = transactions2[j];
              try {
                const existingTransaction = await storage.getTransactionByExternalId(tlTransaction.transaction_id);
                if (!existingTransaction) {
                  const category = trueLayerService.categorizeTransaction(tlTransaction);
                  await storage.createTransaction({
                    accountId: account.id,
                    externalId: tlTransaction.transaction_id,
                    amount: tlTransaction.amount.toString(),
                    description: tlTransaction.description,
                    date: new Date(tlTransaction.timestamp),
                    category,
                    categoryConfidence: "0.8",
                    metadata: {
                      merchantName: tlTransaction.merchant_name,
                      transactionType: tlTransaction.transaction_type,
                      trueLayerCategory: tlTransaction.transaction_category
                    }
                  });
                  syncedTransactionsCount++;
                }
              } catch (transactionSaveError) {
                console.error(`\u274C Failed to save transaction ${j + 1} for ${tlAccount.display_name}:`, transactionSaveError.message);
              }
            }
            console.log(`\u2705 Completed processing account: ${tlAccount.display_name}`);
          } catch (accountError) {
            console.error(`\u274C Failed to process account ${tlAccount.display_name}:`, accountError.message);
            console.error("Account error details:", accountError);
          }
        }
        console.log("\u2705 Finished processing all accounts");
      } catch (syncError) {
        console.error("\u274C Critical error in account sync loop:", syncError.message);
        console.error("Sync error details:", syncError);
        console.error("Error stack:", syncError.stack);
      }
      await storage.updateBankConnection(bankConnection.id, {
        lastSynced: /* @__PURE__ */ new Date()
      });
      res.json({
        success: true,
        message: `Banking connection completed. Synced ${syncedAccountsCount} accounts and ${syncedTransactionsCount} transactions.`,
        accountsCount: syncedAccountsCount,
        transactionsCount: syncedTransactionsCount
      });
    } catch (error) {
      console.error("Complete banking connection error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to complete banking connection",
        error: error.message,
        details: error.stack
      });
    }
  });
  app2.post("/api/banking/sync", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const bankConnection = await storage.getActiveBankConnection(userId);
      if (!bankConnection) {
        return res.status(404).json({ message: "No active bank connection found. Please connect your bank first." });
      }
      let accessToken = bankConnection.accessToken;
      if (/* @__PURE__ */ new Date() >= bankConnection.expiresAt) {
        const refreshedTokens = await trueLayerService.refreshToken(bankConnection.refreshToken);
        const newExpiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1e3);
        await storage.updateBankConnection(bankConnection.id, {
          accessToken: refreshedTokens.access_token,
          refreshToken: refreshedTokens.refresh_token,
          expiresAt: newExpiresAt
        });
        accessToken = refreshedTokens.access_token;
      }
      const trueLayerAccounts = await trueLayerService.getAccounts(accessToken);
      let syncedAccountsCount = 0;
      let syncedTransactionsCount = 0;
      for (const tlAccount of trueLayerAccounts) {
        let account = await storage.getAccountByExternalId(tlAccount.account_id);
        if (!account) {
          account = await storage.createAccount({
            userId,
            bankConnectionId: bankConnection.id,
            externalId: tlAccount.account_id,
            name: tlAccount.display_name,
            type: tlAccount.account_type.toLowerCase(),
            currency: tlAccount.currency,
            institutionName: tlAccount.provider.display_name,
            accountNumber: tlAccount.account_number.number || "Hidden",
            balance: "0"
            // Will be updated below
          });
          syncedAccountsCount++;
        }
        const balance = await trueLayerService.getAccountBalance(accessToken, tlAccount.account_id);
        await storage.updateAccount(account.id, {
          balance: balance.current.toString(),
          lastSynced: /* @__PURE__ */ new Date()
        });
        const fromDate = /* @__PURE__ */ new Date();
        fromDate.setDate(fromDate.getDate() - 180);
        const transactions2 = await trueLayerService.getAccountTransactions(
          accessToken,
          tlAccount.account_id,
          fromDate.toISOString().split("T")[0]
        );
        for (const tlTransaction of transactions2) {
          const existingTransaction = await storage.getTransactionByExternalId(tlTransaction.transaction_id);
          if (!existingTransaction) {
            const category = trueLayerService.categorizeTransaction(tlTransaction);
            await storage.createTransaction({
              accountId: account.id,
              externalId: tlTransaction.transaction_id,
              amount: tlTransaction.amount.toString(),
              description: tlTransaction.description,
              date: new Date(tlTransaction.timestamp),
              category,
              categoryConfidence: "0.8",
              // High confidence from TrueLayer categorization
              metadata: {
                merchantName: tlTransaction.merchant_name,
                transactionType: tlTransaction.transaction_type,
                trueLayerCategory: tlTransaction.transaction_category
              }
            });
            syncedTransactionsCount++;
          }
        }
      }
      await storage.updateBankConnection(bankConnection.id, {
        lastSynced: /* @__PURE__ */ new Date()
      });
      res.json({
        success: true,
        accountsSynced: syncedAccountsCount,
        transactionsSynced: syncedTransactionsCount,
        totalAccounts: trueLayerAccounts.length
      });
    } catch (error) {
      console.error("Banking sync error:", error);
      res.status(500).json({ message: "Failed to sync banking data" });
    }
  });
  app2.get("/api/banking/debug", (req, res) => {
    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/banking/callback`;
      const authUrl = trueLayerService.generateAuthUrl(redirectUri);
      const isLive2 = process.env.TRUELAYER_CLIENT_ID_LIVE && process.env.TRUELAYER_CLIENT_SECRET_LIVE;
      res.json({
        authUrl,
        redirectUri,
        clientId: isLive2 ? process.env.TRUELAYER_CLIENT_ID_LIVE : process.env.TRUELAYER_CLIENT_ID,
        environment: isLive2 ? "live" : "sandbox"
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/banking/force-sync", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const bankConnection = await storage.getActiveBankConnection(userId);
      if (!bankConnection) {
        return res.status(404).json({ message: "No active bank connection found." });
      }
      const refreshedTokens = await trueLayerService.refreshToken(bankConnection.refreshToken);
      const newExpiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1e3);
      await storage.updateBankConnection(bankConnection.id, {
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token,
        expiresAt: newExpiresAt
      });
      const trueLayerAccounts = await trueLayerService.getAccounts(refreshedTokens.access_token);
      let newTransactions = 0;
      for (const tlAccount of trueLayerAccounts) {
        const account = await storage.getAccountByExternalId(tlAccount.account_id);
        if (!account) continue;
        const balance = await trueLayerService.getAccountBalance(refreshedTokens.access_token, tlAccount.account_id);
        await storage.updateAccount(account.id, {
          balance: balance.current.toString(),
          lastSynced: /* @__PURE__ */ new Date()
        });
        const fromDate = /* @__PURE__ */ new Date();
        fromDate.setDate(fromDate.getDate() - 180);
        const transactions2 = await trueLayerService.getAccountTransactions(
          refreshedTokens.access_token,
          tlAccount.account_id,
          fromDate.toISOString().split("T")[0]
        );
        for (const tlTransaction of transactions2) {
          const existingTransaction = await storage.getTransactionByExternalId(tlTransaction.transaction_id);
          if (!existingTransaction) {
            const category = trueLayerService.categorizeTransaction(tlTransaction);
            await storage.createTransaction({
              accountId: account.id,
              externalId: tlTransaction.transaction_id,
              amount: tlTransaction.amount.toString(),
              description: tlTransaction.description,
              date: new Date(tlTransaction.timestamp),
              category,
              categoryConfidence: "0.8",
              metadata: {
                merchantName: tlTransaction.merchant_name,
                transactionType: tlTransaction.transaction_type,
                trueLayerCategory: tlTransaction.transaction_category
              }
            });
            newTransactions++;
          }
        }
      }
      await storage.updateBankConnection(bankConnection.id, {
        lastSynced: /* @__PURE__ */ new Date()
      });
      res.json({
        success: true,
        message: `Fresh sync completed. Found ${newTransactions} new transactions.`,
        newTransactions
      });
    } catch (error) {
      console.error("Force sync error:", error);
      res.status(500).json({ message: "Failed to sync fresh bank data" });
    }
  });
  app2.get("/api/banking/status", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      const bankConnections2 = await storage.getAllActiveBankConnections(userId);
      const accounts2 = await storage.getAccountsByUserId(userId);
      const institutions = Array.from(new Set(accounts2.map((acc) => acc.institutionName).filter(Boolean)));
      const lastSynced = bankConnections2.map((conn) => conn.lastSynced).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      res.json({
        connected: bankConnections2.length > 0,
        connections: bankConnections2.map((conn) => ({
          id: conn.id,
          lastSynced: conn.lastSynced,
          createdAt: conn.createdAt
        })),
        institutions,
        lastSynced: lastSynced || null,
        accountsCount: accounts2.length
      });
    } catch (error) {
      console.error("Banking status error:", error);
      res.status(500).json({ message: "Failed to get banking status" });
    }
  });
  app2.delete("/api/banking/disconnect", requireFirebaseAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid;
      await storage.deactivateBankConnection(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Banking disconnect error:", error);
      res.status(500).json({ message: "Failed to disconnect banking" });
    }
  });
  app2.delete("/api/banking/disconnect/:connectionId", requireFirebaseAuth, async (req, res) => {
    try {
      const { connectionId } = req.params;
      await storage.deactivateSpecificBankConnection(connectionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Banking disconnect specific error:", error);
      res.status(500).json({ message: "Failed to disconnect specific banking connection" });
    }
  });
  if (process.env.NODE_ENV === "production") {
    setInterval(async () => {
      try {
        console.log("Starting automatic daily bank sync...");
        const connections = await storage.getAllActiveBankConnections("");
        for (const connection of connections) {
          try {
            let accessToken = connection.accessToken;
            if (/* @__PURE__ */ new Date() >= connection.expiresAt) {
              const refreshedTokens = await trueLayerService.refreshToken(connection.refreshToken);
              const newExpiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1e3);
              await storage.updateBankConnection(connection.id, {
                accessToken: refreshedTokens.access_token,
                refreshToken: refreshedTokens.refresh_token,
                expiresAt: newExpiresAt
              });
              accessToken = refreshedTokens.access_token;
            }
            const trueLayerAccounts = await trueLayerService.getAccounts(accessToken);
            for (const tlAccount of trueLayerAccounts) {
              const account = await storage.getAccountByExternalId(tlAccount.account_id);
              if (!account) continue;
              const balance = await trueLayerService.getAccountBalance(accessToken, tlAccount.account_id);
              await storage.updateAccount(account.id, {
                balance: balance.current.toString(),
                lastSynced: /* @__PURE__ */ new Date()
              });
              const fromDate = /* @__PURE__ */ new Date();
              fromDate.setDate(fromDate.getDate() - 7);
              const transactions2 = await trueLayerService.getAccountTransactions(
                accessToken,
                tlAccount.account_id,
                fromDate.toISOString().split("T")[0]
              );
              for (const tlTransaction of transactions2) {
                const existingTransaction = await storage.getTransactionByExternalId(tlTransaction.transaction_id);
                if (!existingTransaction) {
                  const category = trueLayerService.categorizeTransaction(tlTransaction);
                  await storage.createTransaction({
                    accountId: account.id,
                    externalId: tlTransaction.transaction_id,
                    amount: tlTransaction.amount.toString(),
                    description: tlTransaction.description,
                    date: new Date(tlTransaction.timestamp),
                    category,
                    categoryConfidence: "0.8",
                    metadata: {
                      merchantName: tlTransaction.merchant_name,
                      transactionType: tlTransaction.transaction_type,
                      trueLayerCategory: tlTransaction.transaction_category
                    }
                  });
                }
              }
            }
            await storage.updateBankConnection(connection.id, {
              lastSynced: /* @__PURE__ */ new Date()
            });
            console.log(`Daily sync completed for user ${connection.userId}`);
          } catch (error) {
            console.error(`Daily sync failed for connection ${connection.id}:`, error);
          }
        }
      } catch (error) {
        console.error("Daily sync scheduler error:", error);
      }
    }, 24 * 60 * 60 * 1e3);
  }
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    // Emit the client build to repo-root/dist for Vercel static hosting
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const __filename2 = fileURLToPath2(import.meta.url);
      const __dirname2 = path2.dirname(__filename2);
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const __filename2 = fileURLToPath2(import.meta.url);
  const __dirname2 = path2.dirname(__filename2);
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
