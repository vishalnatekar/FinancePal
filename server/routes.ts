import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { openBankingService } from "./services/openBanking";
import { categorizeTransaction } from "./services/categorization";
import { insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertGoalSchema, insertBankConnectionSchema } from "@shared/schema";
import { trueLayerService } from "./services/truelayer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Banking callback route (must be before other protected routes)
  app.get("/api/banking/callback", async (req: any, res) => {
    try {
      console.log('=== BANKING CALLBACK START ===');
      console.log('Query params:', req.query);
      console.log('User authenticated:', req.isAuthenticated());
      console.log('User claims:', req.user?.claims);
      
      const { code, state } = req.query;
      
      if (!code) {
        console.log('❌ No authorization code in callback');
        return res.redirect('/?connection=error&reason=missing_code');
      }

      // Check if user is authenticated, if not redirect to login
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        console.log('❌ User not authenticated, redirecting to login');
        console.log('Session ID:', req.sessionID);
        console.log('Session data:', req.session);
        // Store the callback URL to redirect after login
        const callbackUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        return res.redirect(`/api/login?returnTo=${encodeURIComponent(callbackUrl)}`);
      }

      const userId = req.user.claims.sub;
      console.log('✅ User ID:', userId);

      // Always use production domain for callback (matches TrueLayer console config)
      const redirectUri = 'https://finance-pal-vishalnatekar.replit.app/api/banking/callback';
      
      console.log('🔄 Exchanging code for token...');
      console.log('Redirect URI:', redirectUri);
      const tokenData = await trueLayerService.exchangeCodeForToken(code as string, redirectUri);
      console.log('✅ Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in
      });

      // Save the bank connection
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      const bankConnection = await storage.createBankConnection({
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresAt,
        scope: 'accounts balance transactions',
      });

      // Immediately sync bank data after connection
      try {
        console.log('Starting automatic data sync for new bank connection...');
        
        // Fetch accounts from TrueLayer
        const trueLayerAccounts = await trueLayerService.getAccounts(tokenData.access_token);
        let syncedAccountsCount = 0;
        let syncedTransactionsCount = 0;

        for (const tlAccount of trueLayerAccounts) {
          // Check if account already exists
          let account = await storage.getAccountByExternalId(tlAccount.account_id);
          
          if (!account) {
            // Create new account
            account = await storage.createAccount({
              userId,
              externalId: tlAccount.account_id,
              name: tlAccount.display_name,
              type: tlAccount.account_type.toLowerCase(),
              currency: tlAccount.currency,
              institutionName: tlAccount.provider.display_name,
              accountNumber: tlAccount.account_number.number || 'Hidden',
              balance: '0', // Will be updated below
            });
            syncedAccountsCount++;
          }

          // Get current balance
          const balance = await trueLayerService.getAccountBalance(tokenData.access_token, tlAccount.account_id);
          await storage.updateAccount(account.id, {
            balance: balance.current.toString(),
            lastSynced: new Date(),
          });

          // Get transactions (last 6 months to capture full history)
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 180);
          const transactions = await trueLayerService.getAccountTransactions(
            tokenData.access_token,
            tlAccount.account_id,
            fromDate.toISOString().split('T')[0]
          );

          // Save transactions
          for (const tlTransaction of transactions) {
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
                categoryConfidence: '0.8',
                metadata: {
                  merchantName: tlTransaction.merchant_name,
                  transactionType: tlTransaction.transaction_type,
                  trueLayerCategory: tlTransaction.transaction_category,
                },
              });
              syncedTransactionsCount++;
            }
          }
        }

        // Update last sync time
        await storage.updateBankConnection(bankConnection.id, {
          lastSynced: new Date(),
        });

        console.log(`✅ Auto sync completed: ${syncedAccountsCount} accounts, ${syncedTransactionsCount} transactions`);
      } catch (syncError) {
        console.error('❌ Auto sync failed, but bank connection saved:', syncError);
        // Don't fail the entire callback if sync fails
      }

      console.log('=== BANKING CALLBACK END ===');
      // Redirect to frontend with success
      res.redirect('/?connection=success');
    } catch (error) {
      console.error("❌ Banking callback error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        code: req.query.code,
        state: req.query.state
      });
      res.redirect('/?connection=error');
    }
  });

  // Test endpoint to verify callback route works
  app.get("/api/banking/callback-test", async (req: any, res) => {
    console.log('✅ Callback test endpoint hit');
    res.json({ 
      message: "Callback endpoint is accessible",
      authenticated: req.isAuthenticated(),
      userId: req.user?.claims?.sub || null,
      sessionId: req.sessionID,
      hasSession: !!req.session
    });
  });

  // Debug endpoint for session info
  app.get("/api/debug/session", (req: any, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      sessionId: req.sessionID,
      userId: req.user?.claims?.sub || null,
      sessionExists: !!req.session,
      userExists: !!req.user
    });
  });

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
      const days = req.query.days ? parseInt(req.query.days) : 90; // Default to 90 days for better charts
      
      // Get net worth history
      let history = await storage.getNetWorthHistoryByUserId(userId, days);
      
      // Get the latest record
      const current = await storage.getLatestNetWorth(userId);
      
      // Always create historical data based on actual transaction history
      try {
        const transactions = await storage.getTransactionsByUserId(userId);
        if (transactions && transactions.length > 0 && current) {
          const currentBalance = parseFloat(current.netWorth);
          const historicalData = [];
          
          // Sort transactions by date (oldest first)
          const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          // Get the earliest transaction date
          const earliestDate = new Date(sortedTransactions[0].date);
          const currentDate = new Date();
          
          // Calculate starting balance by working backwards from current balance
          const totalTransactionValue = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          let startingBalance = currentBalance - totalTransactionValue;
          
          // Create weekly data points from earliest transaction to now
          const daysBetween = Math.ceil((currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
          const weeksBetween = Math.ceil(daysBetween / 7);
          
          let runningBalance = startingBalance;
          
          for (let week = 0; week <= weeksBetween; week++) {
            const weekDate = new Date(earliestDate);
            weekDate.setDate(earliestDate.getDate() + (week * 7));
            
            if (weekDate > currentDate) break;
            
            // Find transactions up to this week
            const transactionsUpToWeek = sortedTransactions.filter(t => 
              new Date(t.date) <= weekDate
            );
            
            // Calculate balance at this point in time
            const balanceChange = transactionsUpToWeek.reduce((sum, t) => sum + parseFloat(t.amount), 0);
            runningBalance = startingBalance + balanceChange;
            
            historicalData.push({
              id: `historical-${week}`,
              userId,
              netWorth: runningBalance.toString(),
              totalAssets: Math.max(runningBalance, 0).toString(),
              totalLiabilities: Math.max(-runningBalance, 0).toString(),
              date: weekDate,
              createdAt: weekDate,
              updatedAt: weekDate
            });
          }
          
          // Use historical data instead of database records
          history = historicalData;
        }
      } catch (error) {
        console.error("Error creating historical data from transactions:", error);
        // Use existing history if available
      }
      
      // Return in the format expected by the dashboard
      res.json({
        current: current || null,
        history: history || []
      });
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

  app.post("/api/net-worth/calculate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all accounts for the user
      const accounts = await storage.getAccountsByUserId(userId);
      
      // Calculate total net worth
      let totalAssets = 0;
      let totalLiabilities = 0;
      
      for (const account of accounts) {
        const balance = parseFloat(account.balance);
        if (account.type === 'credit_card' || account.type === 'credit') {
          totalLiabilities += Math.abs(balance); // Credit cards are liabilities
        } else {
          totalAssets += balance;
        }
      }
      
      const netWorth = totalAssets - totalLiabilities;
      
      // Save the calculation to history
      const newRecord = await storage.createNetWorthHistory({
        userId,
        totalAssets: totalAssets.toString(),
        totalLiabilities: totalLiabilities.toString(),
        netWorth: netWorth.toString(),
        date: new Date(),
      });
      
      res.json(newRecord);
    } catch (error) {
      console.error("Calculate net worth error:", error);
      res.status(500).json({ message: "Failed to calculate net worth" });
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

  // TrueLayer Banking Integration Routes
  app.get("/api/banking/connect", isAuthenticated, async (req: any, res) => {
    try {
      // Always use production domain for callback (matches TrueLayer console config)
      const redirectUri = 'https://finance-pal-vishalnatekar.replit.app/api/banking/callback';
      const authUrl = trueLayerService.generateAuthUrl(redirectUri);
      res.json({ authUrl });
    } catch (error) {
      console.error("Generate auth URL error:", error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  app.post("/api/banking/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get active bank connection
      const bankConnection = await storage.getActiveBankConnection(userId);
      if (!bankConnection) {
        return res.status(404).json({ message: "No active bank connection found. Please connect your bank first." });
      }

      // Check if token needs refresh
      let accessToken = bankConnection.accessToken;
      if (new Date() >= bankConnection.expiresAt) {
        const refreshedTokens = await trueLayerService.refreshToken(bankConnection.refreshToken);
        const newExpiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1000);
        
        await storage.updateBankConnection(bankConnection.id, {
          accessToken: refreshedTokens.access_token,
          refreshToken: refreshedTokens.refresh_token,
          expiresAt: newExpiresAt,
        });
        
        accessToken = refreshedTokens.access_token;
      }

      // Fetch accounts from TrueLayer
      const trueLayerAccounts = await trueLayerService.getAccounts(accessToken);
      let syncedAccountsCount = 0;
      let syncedTransactionsCount = 0;

      for (const tlAccount of trueLayerAccounts) {
        // Check if account already exists
        let account = await storage.getAccountByExternalId(tlAccount.account_id);
        
        if (!account) {
          // Create new account
          account = await storage.createAccount({
            userId,
            externalId: tlAccount.account_id,
            name: tlAccount.display_name,
            type: tlAccount.account_type.toLowerCase(),
            currency: tlAccount.currency,
            institutionName: tlAccount.provider.display_name,
            accountNumber: tlAccount.account_number.number || 'Hidden',
            balance: '0', // Will be updated below
          });
          syncedAccountsCount++;
        }

        // Get current balance
        const balance = await trueLayerService.getAccountBalance(accessToken, tlAccount.account_id);
        await storage.updateAccount(account.id, {
          balance: balance.current.toString(),
          lastSynced: new Date(),
        });

        // Get transactions (last 180 days to match transaction history)
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 180);
        const transactions = await trueLayerService.getAccountTransactions(
          accessToken,
          tlAccount.account_id,
          fromDate.toISOString().split('T')[0]
        );

        // Save transactions
        for (const tlTransaction of transactions) {
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
              categoryConfidence: '0.8', // High confidence from TrueLayer categorization
              metadata: {
                merchantName: tlTransaction.merchant_name,
                transactionType: tlTransaction.transaction_type,
                trueLayerCategory: tlTransaction.transaction_category,
              },
            });
            syncedTransactionsCount++;
          }
        }
      }

      // Update last sync time
      await storage.updateBankConnection(bankConnection.id, {
        lastSynced: new Date(),
      });

      res.json({
        success: true,
        accountsSynced: syncedAccountsCount,
        transactionsSynced: syncedTransactionsCount,
        totalAccounts: trueLayerAccounts.length,
      });
    } catch (error) {
      console.error("Banking sync error:", error);
      res.status(500).json({ message: "Failed to sync banking data" });
    }
  });

  // Debug endpoint for TrueLayer URL (remove in production)
  app.get("/api/banking/debug", (req: any, res) => {
    try {
      const redirectUri = `${req.protocol}://${req.get('host')}/api/banking/callback`;
      const authUrl = trueLayerService.generateAuthUrl(redirectUri);
      const isLive = process.env.TRUELAYER_CLIENT_ID_LIVE && process.env.TRUELAYER_CLIENT_SECRET_LIVE;
      res.json({ 
        authUrl, 
        redirectUri,
        clientId: isLive ? process.env.TRUELAYER_CLIENT_ID_LIVE : process.env.TRUELAYER_CLIENT_ID,
        environment: isLive ? 'live' : 'sandbox'
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Add manual fresh sync endpoint
  app.post("/api/banking/force-sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get active bank connection
      const bankConnection = await storage.getActiveBankConnection(userId);
      if (!bankConnection) {
        return res.status(404).json({ message: "No active bank connection found." });
      }

      // Force refresh token to ensure we have fresh access
      const refreshedTokens = await trueLayerService.refreshToken(bankConnection.refreshToken);
      const newExpiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1000);
      
      await storage.updateBankConnection(bankConnection.id, {
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token,
        expiresAt: newExpiresAt,
      });

      // Fetch fresh transactions from past 6 months
      const trueLayerAccounts = await trueLayerService.getAccounts(refreshedTokens.access_token);
      let newTransactions = 0;

      for (const tlAccount of trueLayerAccounts) {
        const account = await storage.getAccountByExternalId(tlAccount.account_id);
        if (!account) continue;

        // Update balance
        const balance = await trueLayerService.getAccountBalance(refreshedTokens.access_token, tlAccount.account_id);
        await storage.updateAccount(account.id, {
          balance: balance.current.toString(),
          lastSynced: new Date(),
        });

        // Get fresh transactions (6 months)
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 180);
        const transactions = await trueLayerService.getAccountTransactions(
          refreshedTokens.access_token,
          tlAccount.account_id,
          fromDate.toISOString().split('T')[0]
        );

        // Save new transactions
        for (const tlTransaction of transactions) {
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
              categoryConfidence: '0.8',
              metadata: {
                merchantName: tlTransaction.merchant_name,
                transactionType: tlTransaction.transaction_type,
                trueLayerCategory: tlTransaction.transaction_category,
              },
            });
            newTransactions++;
          }
        }
      }

      await storage.updateBankConnection(bankConnection.id, {
        lastSynced: new Date(),
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

  app.get("/api/banking/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bankConnections = await storage.getAllActiveBankConnections(userId);
      const accounts = await storage.getAccountsByUserId(userId);
      
      // Get unique institutions from accounts
      const institutions = [...new Set(accounts.map(acc => acc.institutionName).filter(Boolean))];
      
      // Find the most recent sync time across all connections
      const lastSynced = bankConnections
        .map(conn => conn.lastSynced)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
      
      res.json({
        connected: bankConnections.length > 0,
        connections: bankConnections.map(conn => ({
          id: conn.id,
          lastSynced: conn.lastSynced,
          createdAt: conn.createdAt,
        })),
        institutions,
        lastSynced: lastSynced || null,
        accountsCount: accounts.length,
      });
    } catch (error) {
      console.error("Banking status error:", error);
      res.status(500).json({ message: "Failed to get banking status" });
    }
  });

  app.delete("/api/banking/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deactivateBankConnection(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Banking disconnect error:", error);
      res.status(500).json({ message: "Failed to disconnect banking" });
    }
  });

  app.delete("/api/banking/disconnect/:connectionId", isAuthenticated, async (req: any, res) => {
    try {
      const { connectionId } = req.params;
      await storage.deactivateSpecificBankConnection(connectionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Banking disconnect specific error:", error);
      res.status(500).json({ message: "Failed to disconnect specific banking connection" });
    }
  });

  // Add automatic daily sync scheduler
  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      try {
        console.log('Starting automatic daily bank sync...');
        
        // Get all active bank connections
        const connections = await storage.getAllActiveBankConnections();
        
        for (const connection of connections) {
          try {
            // Check if token needs refresh
            let accessToken = connection.accessToken;
            if (new Date() >= connection.expiresAt) {
              const refreshedTokens = await trueLayerService.refreshToken(connection.refreshToken);
              const newExpiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1000);
              
              await storage.updateBankConnection(connection.id, {
                accessToken: refreshedTokens.access_token,
                refreshToken: refreshedTokens.refresh_token,
                expiresAt: newExpiresAt,
              });
              
              accessToken = refreshedTokens.access_token;
            }

            // Sync latest transactions (last 7 days)
            const trueLayerAccounts = await trueLayerService.getAccounts(accessToken);
            
            for (const tlAccount of trueLayerAccounts) {
              const account = await storage.getAccountByExternalId(tlAccount.account_id);
              if (!account) continue;

              // Update balance
              const balance = await trueLayerService.getAccountBalance(accessToken, tlAccount.account_id);
              await storage.updateAccount(account.id, {
                balance: balance.current.toString(),
                lastSynced: new Date(),
              });

              // Get recent transactions (last 7 days)
              const fromDate = new Date();
              fromDate.setDate(fromDate.getDate() - 7);
              const transactions = await trueLayerService.getAccountTransactions(
                accessToken,
                tlAccount.account_id,
                fromDate.toISOString().split('T')[0]
              );

              // Save new transactions
              for (const tlTransaction of transactions) {
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
                    categoryConfidence: '0.8',
                    metadata: {
                      merchantName: tlTransaction.merchant_name,
                      transactionType: tlTransaction.transaction_type,
                      trueLayerCategory: tlTransaction.transaction_category,
                    },
                  });
                }
              }
            }

            await storage.updateBankConnection(connection.id, {
              lastSynced: new Date(),
            });
            
            console.log(`Daily sync completed for user ${connection.userId}`);
          } catch (error) {
            console.error(`Daily sync failed for connection ${connection.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Daily sync scheduler error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run every 24 hours
  }

  const httpServer = createServer(app);
  return httpServer;
}