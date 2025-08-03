import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openBankingService } from "./services/openBanking";
import { categorizeTransaction } from "./services/categorization";
import { insertUserSchema, insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertGoalSchema } from "@shared/schema";

interface AuthenticatedRequest extends Request {
  user?: any;
  session: any;
}

// Middleware to check authentication
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { token } = req.body;
      
      // Verify Google token (placeholder - implement with actual Google Auth)
      // In real implementation, verify the token with Google's API
      const { email, name, picture, sub: googleId } = req.body.user;
      
      let user = await storage.getUserByGoogleId(googleId);
      if (!user) {
        user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.createUser({
            email,
            name,
            avatar: picture,
            googleId,
          });
        } else {
          user = await storage.updateUser(user.id, { googleId });
        }
      }
      
      // Set user session (simplified)
      req.session = { userId: user.id };
      
      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session = null;
    res.json({ message: "Logged out successfully" });
  });

  // Helper middleware to add user to request
  app.use("/api", async (req: any, res, next) => {
    if (req.session?.userId) {
      req.user = await storage.getUser(req.session.userId);
    }
    next();
  });

  // Accounts routes
  app.get("/api/accounts", requireAuth, async (req: any, res) => {
    try {
      const accounts = await storage.getAccountsByUserId(req.user.id);
      res.json(accounts);
    } catch (error) {
      console.error("Get accounts error:", error);
      res.status(500).json({ message: "Failed to get accounts" });
    }
  });

  app.post("/api/accounts/connect", requireAuth, async (req: any, res) => {
    try {
      const { institutionId, credentials } = req.body;
      
      // Connect to Open Banking API (placeholder)
      const accountData = await openBankingService.connectAccount(institutionId, credentials);
      
      // Create accounts in our database
      const accounts = [];
      for (const accountInfo of accountData.accounts) {
        const account = await storage.createAccount({
          userId: req.user.id,
          externalId: accountInfo.id,
          name: accountInfo.name,
          type: accountInfo.type,
          balance: accountInfo.balance.toString(),
          institutionName: accountData.institution.name,
          accountNumber: accountInfo.maskedNumber,
          lastSynced: new Date(),
        });
        accounts.push(account);
      }
      
      res.json({ accounts });
    } catch (error) {
      console.error("Connect account error:", error);
      res.status(500).json({ message: "Failed to connect account" });
    }
  });

  app.post("/api/accounts/:id/sync", requireAuth, async (req: any, res) => {
    try {
      const account = await storage.getAccount(req.params.id);
      if (!account || account.userId !== req.user.id) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Sync transactions from Open Banking API
      const transactionData = await openBankingService.getTransactions(account.externalId!);
      
      let newTransactionsCount = 0;
      for (const txn of transactionData.transactions) {
        // Check if transaction already exists
        const existing = await storage.getTransactionsByAccountId(account.id);
        const exists = existing.some(t => t.externalId === txn.id);
        
        if (!exists) {
          const category = await categorizeTransaction(txn.description, parseFloat(txn.amount));
          
          await storage.createTransaction({
            accountId: account.id,
            externalId: txn.id,
            amount: txn.amount,
            description: txn.description,
            date: new Date(txn.date),
            category: category.category,
            categoryConfidence: category.confidence.toString(),
          });
          newTransactionsCount++;
        }
      }

      // Update account balance and sync time
      await storage.updateAccount(account.id, {
        balance: transactionData.currentBalance,
        lastSynced: new Date(),
      });

      res.json({ 
        message: `Synced ${newTransactionsCount} new transactions`,
        newTransactions: newTransactionsCount 
      });
    } catch (error) {
      console.error("Sync account error:", error);
      res.status(500).json({ message: "Failed to sync account" });
    }
  });

  // Transactions routes
  app.get("/api/transactions", requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getTransactionsByUserId(req.user.id, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  app.post("/api/transactions/:id/categorize", requireAuth, async (req: any, res) => {
    try {
      const { category } = req.body;
      const transaction = await storage.getTransaction(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const updatedTransaction = await storage.updateTransaction(req.params.id, {
        category,
        isManuallyOverridden: true,
        categoryConfidence: "1.00", // 100% confidence for manual override
      });

      res.json(updatedTransaction);
    } catch (error) {
      console.error("Categorize transaction error:", error);
      res.status(500).json({ message: "Failed to categorize transaction" });
    }
  });

  // Net worth routes
  app.get("/api/networth", requireAuth, async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const history = await storage.getNetWorthHistoryByUserId(req.user.id, days);
      const latest = await storage.getLatestNetWorth(req.user.id);
      
      res.json({
        current: latest,
        history,
      });
    } catch (error) {
      console.error("Get net worth error:", error);
      res.status(500).json({ message: "Failed to get net worth" });
    }
  });

  app.post("/api/networth/calculate", requireAuth, async (req: any, res) => {
    try {
      const accounts = await storage.getAccountsByUserId(req.user.id);
      
      let totalAssets = 0;
      let totalLiabilities = 0;
      
      for (const account of accounts) {
        const balance = parseFloat(account.balance);
        if (account.type === "credit_card" || balance < 0) {
          totalLiabilities += Math.abs(balance);
        } else {
          totalAssets += balance;
        }
      }
      
      const netWorth = totalAssets - totalLiabilities;
      
      const netWorthEntry = await storage.createNetWorthHistory({
        userId: req.user.id,
        netWorth: netWorth.toString(),
        totalAssets: totalAssets.toString(),
        totalLiabilities: totalLiabilities.toString(),
        date: new Date(),
      });
      
      res.json(netWorthEntry);
    } catch (error) {
      console.error("Calculate net worth error:", error);
      res.status(500).json({ message: "Failed to calculate net worth" });
    }
  });

  // Budget routes
  app.get("/api/budgets", requireAuth, async (req: any, res) => {
    try {
      const budgets = await storage.getBudgetsByUserId(req.user.id);
      
      // Calculate spending for each budget
      const budgetsWithSpending = await Promise.all(
        budgets.map(async (budget) => {
          const spending = await storage.getBudgetSpending(
            req.user.id,
            budget.category,
            budget.startDate,
            budget.endDate || new Date()
          );
          
          return {
            ...budget,
            spent: spending,
            remaining: Math.max(0, parseFloat(budget.amount) - spending),
            percentageUsed: Math.min(100, (spending / parseFloat(budget.amount)) * 100),
          };
        })
      );
      
      res.json(budgetsWithSpending);
    } catch (error) {
      console.error("Get budgets error:", error);
      res.status(500).json({ message: "Failed to get budgets" });
    }
  });

  app.post("/api/budgets", requireAuth, async (req: any, res) => {
    try {
      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const budget = await storage.createBudget(budgetData);
      res.json(budget);
    } catch (error) {
      console.error("Create budget error:", error);
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", requireAuth, async (req: any, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget || budget.userId !== req.user.id) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      const updatedBudget = await storage.updateBudget(req.params.id, req.body);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Update budget error:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", requireAuth, async (req: any, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget || budget.userId !== req.user.id) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      await storage.deleteBudget(req.params.id);
      res.json({ message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Delete budget error:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // Goals routes
  app.get("/api/goals", requireAuth, async (req: any, res) => {
    try {
      const goals = await storage.getGoalsByUserId(req.user.id);
      
      const goalsWithProgress = goals.map(goal => {
        const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
        const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount);
        
        let timeRemaining = null;
        if (goal.targetDate) {
          const now = new Date();
          const target = new Date(goal.targetDate);
          const diffTime = target.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            if (diffDays < 30) {
              timeRemaining = `${diffDays} days remaining`;
            } else {
              const months = Math.ceil(diffDays / 30);
              timeRemaining = `${months} months remaining`;
            }
          } else {
            timeRemaining = "Overdue";
          }
        }
        
        return {
          ...goal,
          progress: Math.min(100, progress),
          remaining,
          timeRemaining,
        };
      });
      
      res.json(goalsWithProgress);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ message: "Failed to get goals" });
    }
  });

  app.post("/api/goals", requireAuth, async (req: any, res) => {
    try {
      const goalData = insertGoalSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.put("/api/goals/:id", requireAuth, async (req: any, res) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal || goal.userId !== req.user.id) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const updatedGoal = await storage.updateGoal(req.params.id, req.body);
      res.json(updatedGoal);
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req: any, res) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal || goal.userId !== req.user.id) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      await storage.deleteGoal(req.params.id);
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
