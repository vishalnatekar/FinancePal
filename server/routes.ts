import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertGoalSchema, insertBankConnectionSchema } from "@shared/schema";
import { trueLayerService } from "./services/truelayer";

// Simple middleware to extract Firebase user ID from headers
function requireFirebaseAuth(req: any, res: any, next: any) {
  const firebaseUid = req.headers['x-firebase-uid'];
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    return res.status(401).json({ message: "Unauthorized - Firebase UID required" });
  }
  req.firebaseUid = firebaseUid;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {

  // PUBLIC Banking callback route (MUST be before auth middleware)
  app.get("/api/banking/callback", async (req: any, res) => {
    console.log('CB HIT', { query: req.query, host: req.get('host') });
    // Temporary debug endpoint
    if (req.query.probe) {
      return res.status(200).send('Callback endpoint is accessible without auth');
    }
    try {
      console.log('=== BANKING CALLBACK START ===');
      console.log('Query params:', JSON.stringify(req.query, null, 2));
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      
      const { code, state } = req.query;
      
      if (!code) {
        console.log('❌ No authorization code in callback');
        return res.redirect('/?connection=error&reason=missing_code');
      }

      // The state parameter from TrueLayer is their own generated value
      console.log('🔍 TrueLayer state parameter:', state);
      
      // For now, redirect to frontend with success and let client handle user identification
      // The frontend will need to identify the current user and make an API call to complete the connection
      console.log('🔄 Redirecting to frontend with auth code for client-side user identification');
      
      // Determine the current domain and redirect appropriately
      const scheme = req.get('x-forwarded-proto') || 'https';
      const host = req.get('x-forwarded-host') || req.get('host');
      const frontendUrl = `${scheme}://${host}/?connection=success&code=${encodeURIComponent(code as string)}&state=${encodeURIComponent(state || '')}`;
      
      console.log('🌐 Redirecting to:', frontendUrl);
      return res.redirect(frontendUrl);
      
      // The rest of this code will be moved to a separate API endpoint that the frontend calls
      /*
      // Use the whitelisted redirect URI from TrueLayer console
      const redirectUri = 'https://myfinancepal.co.uk/api/banking/callback';
      console.log('🌐 Using callback URL:', redirectUri);
      
      console.log('🔄 Exchanging code for token...');
      console.log('Redirect URI:', redirectUri);
      const tokenData = await trueLayerService.exchangeCodeForToken(code as string, redirectUri);
      console.log('✅ Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in
      });

      // This code is no longer used - handled by frontend
      const userId = req.firebaseUid; // This would need to be defined if we ever use this code
      
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
        console.log('🔄 Starting automatic data sync for new bank connection...');
        
        // Fetch accounts from TrueLayer
        console.log('📡 Fetching accounts from TrueLayer...');
        const trueLayerAccounts = await trueLayerService.getAccounts(tokenData.access_token);
        console.log(`📊 Found ${trueLayerAccounts.length} accounts from TrueLayer`);
        
        let syncedAccountsCount = 0;
        let syncedTransactionsCount = 0;

        for (const tlAccount of trueLayerAccounts) {
          console.log(`🏦 Processing account: ${tlAccount.display_name} (${tlAccount.account_id})`);
          
          // Check if account already exists
          let account = await storage.getAccountByExternalId(tlAccount.account_id);
          
          if (!account) {
            console.log(`➕ Creating new account: ${tlAccount.display_name}`);
            // Create new account
            account = await storage.createAccount({
              userId,
              externalId: tlAccount.account_id,
              name: tlAccount.display_name,
              type: tlAccount.account_type.toLowerCase(),
              currency: tlAccount.currency,
              institutionName: tlAccount.provider.display_name,
              accountNumber: tlAccount.account_number?.number || 'Hidden',
              balance: '0', // Will be updated below
            });
            syncedAccountsCount++;
            console.log(`✅ Account created with ID: ${account.id}`);
          } else {
            console.log(`📋 Using existing account: ${account.id}`);
          }

          // Get current balance
          console.log(`💰 Fetching balance for account: ${tlAccount.account_id}`);
          const balance = await trueLayerService.getAccountBalance(tokenData.access_token, tlAccount.account_id);
          console.log(`💷 Balance: ${balance.current} ${balance.currency}`);
          
          await storage.updateAccount(account.id, {
            balance: balance.current.toString(),
            lastSynced: new Date(),
          });

          // Get transactions (last 3 months to capture recent history)
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 90); // 3 months instead of 6 for faster initial sync
          
          console.log(`📄 Fetching transactions from ${fromDate.toISOString().split('T')[0]}...`);
          const transactions = await trueLayerService.getAccountTransactions(
            tokenData.access_token,
            tlAccount.account_id,
            fromDate.toISOString().split('T')[0]
          );
          console.log(`📝 Found ${transactions.length} transactions`);

          // Save transactions
          for (let i = 0; i < transactions.length; i++) {
            const tlTransaction = transactions[i];
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
              
              // Log progress every 10 transactions
              if (syncedTransactionsCount % 10 === 0) {
                console.log(`📊 Synced ${syncedTransactionsCount} transactions so far...`);
              }
            }
          }
        }

        // Update last sync time
        await storage.updateBankConnection(bankConnection.id, {
          lastSynced: new Date(),
        });

        console.log(`🎉 Auto sync completed: ${syncedAccountsCount} accounts, ${syncedTransactionsCount} transactions`);
      } catch (syncError: any) {
        console.error('❌ Auto sync failed:', syncError.message);
        console.error('Full sync error:', syncError);
        // Don't fail the entire callback if sync fails - but log the error detail
      }

      console.log('=== BANKING CALLBACK END ===');
      // Redirect to frontend with success
      res.redirect('/?connection=success');
      */
    } catch (error: any) {
      console.error("❌ Banking callback error:", error.message);
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
      authenticated: req.requireFirebaseAuth(),
      userId: req.user?.claims?.sub || null,
      sessionId: req.sessionID,
      hasSession: !!req.session
    });
  });

  // Debug endpoint for session info
  app.get("/api/debug/session", (req: any, res) => {
    res.json({
      authenticated: req.requireFirebaseAuth(),
      sessionId: req.sessionID,
      userId: req.user?.claims?.sub || null,
      sessionExists: !!req.session,
      userExists: !!req.user
    });
  });

  // Auth routes - Firebase compatible
  app.get('/api/auth/user', requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      let user = await storage.getUser(userId);
      
      // If user doesn't exist, create them (auto-provision from Firebase)
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          email: null, // Will be updated when we get user info from Firebase
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Protected routes - All require authentication
  
  // Account routes
  app.get("/api/accounts", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      const accounts = await storage.getAccountsByUserId(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Get accounts error:", error);
      res.status(500).json({ message: "Failed to get accounts" });
    }
  });

  app.post("/api/accounts", requireFirebaseAuth, async (req: any, res) => {
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

  app.put("/api/accounts/:id", requireFirebaseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const account = await storage.updateAccount(id, req.body);
      res.json(account);
    } catch (error) {
      console.error("Update account error:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", requireFirebaseAuth, async (req: any, res) => {
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
  app.get("/api/transactions", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const transactions = await storage.getTransactionsByUserId(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  app.post("/api/transactions", requireFirebaseAuth, async (req: any, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put("/api/transactions/:id", requireFirebaseAuth, async (req: any, res) => {
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
  app.get("/api/budgets", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      const budgets = await storage.getBudgetsByUserId(userId);
      const transactions = await storage.getTransactionsByUserId(userId);
      
      // Calculate spent amounts for each budget
      const budgetsWithCalculations = budgets.map(budget => {
        // Filter transactions for this budget's category and time period
        const relevantTransactions = transactions.filter(transaction => {
          const transactionDate = new Date(transaction.date);
          const budgetStart = new Date(budget.startDate);
          const budgetEnd = budget.endDate ? new Date(budget.endDate) : new Date();
          
          // Check if transaction is in the budget period and matches category
          return transaction.category === budget.category && 
                 transactionDate >= budgetStart && 
                 transactionDate <= budgetEnd &&
                 parseFloat(transaction.amount) < 0; // Only outgoing transactions (negative amounts)
        });
        
        // Calculate total spent (convert negative amounts to positive)
        const spent = relevantTransactions.reduce((total, transaction) => 
          total + Math.abs(parseFloat(transaction.amount)), 0
        );
        
        const budgetAmount = parseFloat(budget.amount);
        const remaining = budgetAmount - spent;
        const percentageUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        
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

  app.post("/api/budgets", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      const budgetData = {
        ...req.body,
        userId,
        startDate: new Date(), // Set current date as start date
        endDate: req.body.period === "monthly" ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : 
          req.body.period === "weekly" ? 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) :
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // yearly
      };
      const validatedData = insertBudgetSchema.parse(budgetData);
      const budget = await storage.createBudget(validatedData);
      res.json(budget);
    } catch (error) {
      console.error("Create budget error:", error);
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", requireFirebaseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const budget = await storage.updateBudget(id, req.body);
      res.json(budget);
    } catch (error) {
      console.error("Update budget error:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", requireFirebaseAuth, async (req: any, res) => {
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
  app.get("/api/goals", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      const goals = await storage.getGoalsByUserId(userId);
      
      // Calculate progress for each goal
      const goalsWithCalculations = goals.map(goal => {
        const current = parseFloat(goal.currentAmount);
        const target = parseFloat(goal.targetAmount);
        const progress = target > 0 ? (current / target) * 100 : 0;
        const remaining = target - current;
        
        // Calculate time remaining if target date exists
        let timeRemaining = null;
        if (goal.targetDate) {
          const now = new Date();
          const targetDate = new Date(goal.targetDate);
          const timeDiff = targetDate.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
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

  app.post("/api/goals", requireFirebaseAuth, async (req: any, res) => {
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

  app.put("/api/goals/:id", requireFirebaseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const goal = await storage.updateGoal(id, req.body);
      res.json(goal);
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(500).json({ message: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", requireFirebaseAuth, async (req: any, res) => {
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
  app.get("/api/net-worth", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
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
          
          // Create daily data points from earliest transaction to now
          const daysBetween = Math.ceil((currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
          
          let runningBalance = startingBalance;
          
          for (let day = 0; day <= daysBetween; day++) {
            const dayDate = new Date(earliestDate);
            dayDate.setDate(earliestDate.getDate() + day);
            
            if (dayDate > currentDate) break;
            
            // Find transactions up to this day
            const transactionsUpToDay = sortedTransactions.filter(t => 
              new Date(t.date) <= dayDate
            );
            
            // Calculate balance at this point in time
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

  app.get("/api/net-worth/latest", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      const latest = await storage.getLatestNetWorth(userId);
      res.json(latest);
    } catch (error) {
      console.error("Get latest net worth error:", error);
      res.status(500).json({ message: "Failed to get latest net worth" });
    }
  });

  app.post("/api/net-worth/calculate", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      
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

  // Legacy routes removed - using TrueLayer instead

  // Analytics routes
  app.get("/api/analytics/spending", requireFirebaseAuth, async (req: any, res) => {
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

  app.get("/api/analytics/categories", requireFirebaseAuth, async (req: any, res) => {
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

  // TrueLayer Banking Integration Routes
  app.get("/api/banking/connect", requireFirebaseAuth, async (req: any, res) => {
    try {
      // Use the whitelisted redirect URI from TrueLayer console
      const redirectUri = 'https://myfinancepal.co.uk/api/banking/callback';
      console.log('🌐 Using whitelisted callback URL:', redirectUri);
      const authUrl = trueLayerService.generateAuthUrl(redirectUri);
      res.json({ authUrl });
    } catch (error) {
      console.error("Generate auth URL error:", error);
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  // Complete banking connection after callback (called by frontend)
  app.post("/api/banking/complete-connection", requireFirebaseAuth, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.firebaseUid;
      
      if (!code) {
        return res.status(400).json({ message: "Authorization code is required" });
      }

      console.log('🔄 Completing banking connection for user:', userId);
      
      // Ensure user exists in database first
      let user = await storage.getUser(userId);
      if (!user) {
        console.log('👤 Creating user record in database:', userId);
        // Create user with unique email based on Firebase UID to avoid conflicts
        const uniqueEmail = `user-${userId.slice(-8)}@firebase-temp.com`;
        user = await storage.upsertUser({
          id: userId,
          email: uniqueEmail,
          firstName: 'User',
          lastName: '',
          profileImageUrl: null,
        });
        console.log('✅ User created with unique email:', user);
      }
      
      // Use the whitelisted redirect URI from TrueLayer console  
      const redirectUri = 'https://myfinancepal.co.uk/api/banking/callback';
      
      console.log('🔄 Exchanging code for token...');
      console.log('Code received:', code.substring(0, 20) + '...');
      console.log('Redirect URI:', redirectUri);
      
      let tokenData;
      try {
        tokenData = await trueLayerService.exchangeCodeForToken(code, redirectUri);
        console.log('✅ Token exchange successful');
        console.log('Token type:', tokenData.token_type);
        // Token exchange successful
      } catch (tokenError: any) {
        console.error('❌ TrueLayer token exchange failed:', tokenError.message);
        return res.status(500).json({ 
          message: 'Failed to complete banking connection', 
          error: `TrueLayer token exchange failed: ${tokenError.message}`,
          hint: 'Try starting a fresh banking connection - the authorization code may have expired'
        });
      }

      // Store bank connection
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      const bankConnection = await storage.createBankConnection({
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresAt,
        scope: 'accounts balance transactions',
      });

      // Sync bank data immediately
      console.log('🔄 Starting automatic data sync...');
      const trueLayerAccounts = await trueLayerService.getAccounts(tokenData.access_token);
      console.log(`📊 Found ${trueLayerAccounts.length} accounts`);
      
      let syncedAccountsCount = 0;
      let syncedTransactionsCount = 0;

      for (const tlAccount of trueLayerAccounts) {
        let account = await storage.getAccountByExternalId(tlAccount.account_id);
        
        if (!account) {
          account = await storage.createAccount({
            userId,
            externalId: tlAccount.account_id,
            name: tlAccount.display_name,
            type: tlAccount.account_type.toLowerCase(),
            currency: tlAccount.currency,
            institutionName: tlAccount.provider.display_name,
            accountNumber: tlAccount.account_number?.number || 'Hidden',
            balance: '0',
          });
          syncedAccountsCount++;
        }

        // Get current balance
        const balance = await trueLayerService.getAccountBalance(tokenData.access_token, tlAccount.account_id);
        await storage.updateAccount(account.id, {
          balance: balance.current.toString(),
          lastSynced: new Date(),
        });

        // Get transactions (last 3 months)
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
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

      await storage.updateBankConnection(bankConnection.id, {
        lastSynced: new Date(),
      });

      res.json({ 
        success: true, 
        message: `Banking connection completed. Synced ${syncedAccountsCount} accounts and ${syncedTransactionsCount} transactions.`,
        accountsCount: syncedAccountsCount,
        transactionsCount: syncedTransactionsCount 
      });
    } catch (error: any) {
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

  app.post("/api/banking/sync", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      
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
  app.post("/api/banking/force-sync", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      
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

  app.get("/api/banking/status", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      const bankConnections = await storage.getAllActiveBankConnections(userId);
      const accounts = await storage.getAccountsByUserId(userId);
      
      // Get unique institutions from accounts
      const institutions = Array.from(new Set(accounts.map(acc => acc.institutionName).filter(Boolean)));
      
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

  app.delete("/api/banking/disconnect", requireFirebaseAuth, async (req: any, res) => {
    try {
      const userId = req.firebaseUid;
      await storage.deactivateBankConnection(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Banking disconnect error:", error);
      res.status(500).json({ message: "Failed to disconnect banking" });
    }
  });

  app.delete("/api/banking/disconnect/:connectionId", requireFirebaseAuth, async (req: any, res) => {
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
        const connections = await storage.getAllActiveBankConnections("");
        
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