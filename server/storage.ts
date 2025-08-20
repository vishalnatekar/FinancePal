import {
  users,
  accounts,
  transactions,
  budgets,
  goals,
  netWorthHistory,
  bankConnections,
  type User,
  type InsertUser,
  type UpsertUser,
  type Account,
  type InsertAccount,
  type Transaction,
  type InsertTransaction,
  type Budget,
  type InsertBudget,
  type Goal,
  type InsertGoal,
  type NetWorthHistory,
  type InsertNetWorthHistory,
  type BankConnection,
  type InsertBankConnection,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;

  // Account operations
  getAccountsByUserId(userId: string): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  // Transaction operations
  getTransactionsByAccountId(accountId: string, limit?: number): Promise<Transaction[]>;
  getTransactionsByUserId(userId: string, limit?: number): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Budget operations
  getBudgetsByUserId(userId: string): Promise<Budget[]>;
  getBudget(id: string): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;

  // Goal operations
  getGoalsByUserId(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: string): Promise<void>;

  // Net worth operations
  getNetWorthHistoryByUserId(userId: string, days?: number): Promise<NetWorthHistory[]>;
  createNetWorthHistory(netWorth: InsertNetWorthHistory): Promise<NetWorthHistory>;
  getLatestNetWorth(userId: string): Promise<NetWorthHistory | undefined>;

  // Analytics
  getBudgetSpending(userId: string, category: string, startDate: Date, endDate: Date): Promise<number>;
  getCategorizedTransactions(userId: string, startDate: Date, endDate: Date): Promise<any>;

  // Bank Connection operations
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  getActiveBankConnection(userId: string): Promise<BankConnection | undefined>;
  getAllActiveBankConnections(userId: string): Promise<BankConnection[]>;
  updateBankConnection(id: string, connection: Partial<InsertBankConnection>): Promise<BankConnection>;
  deactivateBankConnection(userId: string): Promise<void>;
  deactivateSpecificBankConnection(connectionId: string): Promise<void>;
  getAccountByExternalId(externalId: string): Promise<Account | undefined>;
  getTransactionByExternalId(externalId: string): Promise<Transaction | undefined>;
  getAccountCountForUser(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  // Removed getUserByGoogleId - not needed with Replit Auth

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Account operations
  async getAccountsByUserId(userId: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .orderBy(desc(accounts.createdAt));
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account> {
    const [updatedAccount] = await db
      .update(accounts)
      .set(account)
      .where(eq(accounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteAccount(id: string): Promise<void> {
    await db.update(accounts).set({ isActive: false }).where(eq(accounts.id, id));
  }

  // Transaction operations
  async getTransactionsByAccountId(accountId: string, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getTransactionsByUserId(userId: string, limit = 1000): Promise<Transaction[]> {
    return await db
      .select({
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
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(accounts.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(transaction)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Budget operations
  async getBudgetsByUserId(userId: string): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.isActive, true)))
      .orderBy(desc(budgets.createdAt));
  }

  async getBudget(id: string): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    return budget || undefined;
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db.insert(budgets).values(budget).returning();
    return newBudget;
  }

  async updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget> {
    const [updatedBudget] = await db
      .update(budgets)
      .set(budget)
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
  }

  async deleteBudget(id: string): Promise<void> {
    await db.update(budgets).set({ isActive: false }).where(eq(budgets.id, id));
  }

  // Goal operations
  async getGoalsByUserId(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.isActive, true)))
      .orderBy(desc(goals.createdAt));
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal> {
    const [updatedGoal] = await db
      .update(goals)
      .set(goal)
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: string): Promise<void> {
    await db.update(goals).set({ isActive: false }).where(eq(goals.id, id));
  }

  // Net worth operations
  async getNetWorthHistoryByUserId(userId: string, days = 30): Promise<NetWorthHistory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(netWorthHistory)
      .where(and(eq(netWorthHistory.userId, userId), gte(netWorthHistory.date, cutoffDate)))
      .orderBy(desc(netWorthHistory.date));
  }

  async createNetWorthHistory(netWorth: InsertNetWorthHistory): Promise<NetWorthHistory> {
    const [newNetWorth] = await db.insert(netWorthHistory).values(netWorth).returning();
    return newNetWorth;
  }

  async getLatestNetWorth(userId: string): Promise<NetWorthHistory | undefined> {
    const [latest] = await db
      .select()
      .from(netWorthHistory)
      .where(eq(netWorthHistory.userId, userId))
      .orderBy(desc(netWorthHistory.date))
      .limit(1);
    return latest || undefined;
  }

  // Analytics
  async getBudgetSpending(userId: string, category: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          eq(transactions.category, category),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          sql`${transactions.amount} < 0` // only expenses
        )
      );

    return Math.abs(parseFloat(result[0]?.total || "0"));
  }

  async getCategorizedTransactions(userId: string, startDate: Date, endDate: Date): Promise<any> {
    return await db
      .select({
        category: transactions.category,
        total: sql<string>`SUM(${transactions.amount})`,
        count: sql<string>`COUNT(*)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .groupBy(transactions.category);
  }

  // Bank Connection operations
  async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> {
    const [created] = await db
      .insert(bankConnections)
      .values(connection)
      .returning();
    return created;
  }

  async getActiveBankConnection(userId: string): Promise<BankConnection | undefined> {
    const [connection] = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.userId, userId), eq(bankConnections.isActive, true)))
      .orderBy(desc(bankConnections.createdAt))
      .limit(1);
    return connection || undefined;
  }

  async getAllActiveBankConnections(): Promise<BankConnection[]> {
    return await db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.isActive, true))
      .orderBy(desc(bankConnections.createdAt));
  }

  async getAllActiveBankConnections(userId: string): Promise<BankConnection[]> {
    return await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.userId, userId), eq(bankConnections.isActive, true)))
      .orderBy(desc(bankConnections.createdAt));
  }

  async updateBankConnection(id: string, connection: Partial<InsertBankConnection>): Promise<BankConnection> {
    const [updated] = await db
      .update(bankConnections)
      .set(connection)
      .where(eq(bankConnections.id, id))
      .returning();
    return updated;
  }

  async deactivateBankConnection(userId: string): Promise<void> {
    await db
      .update(bankConnections)
      .set({ isActive: false })
      .where(eq(bankConnections.userId, userId));
  }

  async deactivateSpecificBankConnection(connectionId: string): Promise<void> {
    await db
      .update(bankConnections)
      .set({ isActive: false })
      .where(eq(bankConnections.id, connectionId));
  }

  async getAccountByExternalId(externalId: string): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.externalId, externalId))
      .limit(1);
    return account || undefined;
  }

  async getTransactionByExternalId(externalId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.externalId, externalId))
      .limit(1);
    return transaction || undefined;
  }

  async getAccountCountForUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    return parseInt(result[0]?.count || "0");
  }
}

export const storage = new DatabaseStorage();
