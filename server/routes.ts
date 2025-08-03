import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { openBankingService } from "./services/openBanking";
import { categorizeTransaction } from "./services/categorization";
import { insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertGoalSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Protected routes - All require authentication
  
  // Account routes
  app.get("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getAccountsByUserId(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Get accounts error:", error);
      res.status(500).json({ message: "Failed to get accounts" });
    }
  });

  app.post("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertAccountSchema.parse({ ...req.body, userId });
      const account = await storage.createAccount(validatedData);
      res.json(account);
    } catch (error) {
      console.error("Create account error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const account = await storage.updateAccount(id, req.body);
      res.json(account);
    } catch (error) {
      console.error("Update account error:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAccount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const transactions = await storage.getTransactionsByUserId(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/transactions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.updateTransaction(id, req.body);
      res.json(transaction);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  // Budget routes
  app.get("/api/budgets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgets = await storage.getBudgetsByUserId(userId);
      res.json(budgets);
    } catch (error) {
      console.error("Get budgets error:", error);
      res.status(500).json({ message: "Failed to get budgets" });
    }
  });

  app.post("/api/budgets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertBudgetSchema.parse({ ...req.body, userId });
      const budget = await storage.createBudget(validatedData);
      res.json(budget);
    } catch (error) {
      console.error("Create budget error:", error);
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const budget = await storage.updateBudget(id, req.body);
      res.json(budget);
    } catch (error) {
      console.error("Update budget error:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBudget(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete budget error:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // Goal routes
  app.get("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getGoalsByUserId(userId);
      res.json(goals);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ message: "Failed to get goals" });
    }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertGoalSchema.parse({ ...req.body, userId });
      const goal = await storage.createGoal(validatedData);
      res.json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.put("/api/goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const goal = await storage.updateGoal(id, req.body);
      res.json(goal);
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Net worth routes
  app.get("/api/net-worth", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = req.query.days ? parseInt(req.query.days) : 30;
      const netWorthHistory = await storage.getNetWorthHistoryByUserId(userId, days);
      res.json(netWorthHistory);
    } catch (error) {
      console.error("Get net worth error:", error);
      res.status(500).json({ message: "Failed to get net worth history" });
    }
  });

  app.get("/api/net-worth/latest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const latest = await storage.getLatestNetWorth(userId);
      res.json(latest);
    } catch (error) {
      console.error("Get latest net worth error:", error);
      res.status(500).json({ message: "Failed to get latest net worth" });
    }
  });

  // Open Banking routes
  app.get("/api/banking/institutions", isAuthenticated, async (req, res) => {
    try {
      const institutions = await openBankingService.getInstitutions();
      res.json(institutions);
    } catch (error) {
      console.error("Get institutions error:", error);
      res.status(500).json({ message: "Failed to get institutions" });
    }
  });

  app.post("/api/banking/connect", isAuthenticated, async (req: any, res) => {
    try {
      const { institutionId } = req.body;
      const userId = req.user.claims.sub;
      
      // Connect to bank account through Open Banking
      const connection = await openBankingService.connectAccount(institutionId, {});
      
      // Create accounts in our database
      for (const account of connection.accounts) {
        await storage.createAccount({
          userId,
          externalId: account.id,
          name: account.name,
          type: account.type as any,
          balance: account.balance,
          maskedNumber: account.maskedNumber,
          institutionName: connection.institution.name,
          isActive: true,
        });
      }
      
      res.json(connection);
    } catch (error) {
      console.error("Connect bank error:", error);
      res.status(500).json({ message: "Failed to connect bank account" });
    }
  });

  app.post("/api/banking/sync/:accountId", isAuthenticated, async (req, res) => {
    try {
      const { accountId } = req.params;
      const account = await storage.getAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Fetch transactions from Open Banking API
      const transactionData = await openBankingService.getTransactions(account.externalId!);
      
      // Save transactions to database
      for (const txn of transactionData.transactions) {
        const category = categorizeTransaction(txn.description);
        
        await storage.createTransaction({
          accountId: account.id,
          externalId: txn.id,
          amount: txn.amount,
          description: txn.description,
          date: new Date(txn.date),
          category: category.category,
          categoryConfidence: category.confidence,
          isManuallyOverridden: false,
        });
      }
      
      // Update account balance
      await storage.updateAccount(accountId, {
        balance: transactionData.currentBalance,
      });
      
      res.json({ success: true, transactionCount: transactionData.transactions.length });
    } catch (error) {
      console.error("Sync transactions error:", error);
      res.status(500).json({ message: "Failed to sync transactions" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/spending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get("/api/analytics/categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}