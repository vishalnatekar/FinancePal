import { z } from 'zod';

// TrueLayer API configuration
// Determine environment using (in priority order):
// 1) Explicit flag TRUELAYER_ENV=live or TRUELAYER_USE_LIVE=true
// 2) Presence of LIVE-specific credentials
// 3) Fallback: sandbox
const explicitLiveFlag =
  (process.env.TRUELAYER_ENV || '').toLowerCase() === 'live' ||
  (process.env.TRUELAYER_USE_LIVE || '').toLowerCase() === 'true';
const hasLiveSpecificCreds = !!(process.env.TRUELAYER_CLIENT_ID_LIVE && process.env.TRUELAYER_CLIENT_SECRET_LIVE);
const isLive = explicitLiveFlag || hasLiveSpecificCreds;
const TRUELAYER_BASE_URL = isLive ? 'https://api.truelayer.com' : 'https://api.truelayer-sandbox.com';
const TRUELAYER_AUTH_URL = isLive ? 'https://auth.truelayer.com' : 'https://auth.truelayer-sandbox.com';

// TrueLayer data schemas
const TrueLayerAccountSchema = z.object({
  account_id: z.string(),
  account_type: z.string(),
  display_name: z.string(),
  currency: z.string(),
  account_number: z.object({
    iban: z.string().optional(),
    number: z.string().optional(),
    sort_code: z.string().optional(),
  }),
  provider: z.object({
    display_name: z.string(),
    logo_uri: z.string().optional(),
  }),
});

const TrueLayerBalanceSchema = z.object({
  currency: z.string(),
  available: z.number(),
  current: z.number(),
  overdraft: z.number().optional(),
});

const TrueLayerTransactionSchema = z.object({
  transaction_id: z.string(),
  timestamp: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  transaction_type: z.enum(['DEBIT', 'CREDIT']),
  transaction_category: z.string().optional(),
  merchant_name: z.string().optional(),
  running_balance: z.object({
    currency: z.string(),
    amount: z.number(),
  }).optional(),
});

export type TrueLayerAccount = z.infer<typeof TrueLayerAccountSchema>;
export type TrueLayerBalance = z.infer<typeof TrueLayerBalanceSchema>;
export type TrueLayerTransaction = z.infer<typeof TrueLayerTransactionSchema>;

export class TrueLayerService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    // Credential selection rules:
    // - If in live mode (isLive true), prefer LIVE-specific vars; otherwise use generic TRUELAYER_CLIENT_ID/SECRET (allowing users to place live creds there).
    // - If in sandbox mode, use generic TRUELAYER_CLIENT_ID/SECRET (sandbox creds) if present; otherwise fall back to LIVE vars if those are the only ones set.
    if (isLive) {
      if (process.env.TRUELAYER_CLIENT_ID_LIVE && process.env.TRUELAYER_CLIENT_SECRET_LIVE) {
        this.clientId = process.env.TRUELAYER_CLIENT_ID_LIVE;
        this.clientSecret = process.env.TRUELAYER_CLIENT_SECRET_LIVE;
      } else if (process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET) {
        // Allow using live creds in generic vars when LIVE-specific vars aren't provided
        this.clientId = process.env.TRUELAYER_CLIENT_ID;
        this.clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
      } else {
        throw new Error('TrueLayer live credentials not found. Set TRUELAYER_CLIENT_ID/TRUELAYER_CLIENT_SECRET or TRUELAYER_CLIENT_ID_LIVE/TRUELAYER_CLIENT_SECRET_LIVE.');
      }
    } else {
      if (process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET) {
        // Sandbox creds placed in generic vars
        this.clientId = process.env.TRUELAYER_CLIENT_ID;
        this.clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
      } else if (process.env.TRUELAYER_CLIENT_ID_LIVE && process.env.TRUELAYER_CLIENT_SECRET_LIVE) {
        // Fallback to LIVE creds even if sandbox not configured (useful for environments with only live creds)
        this.clientId = process.env.TRUELAYER_CLIENT_ID_LIVE;
        this.clientSecret = process.env.TRUELAYER_CLIENT_SECRET_LIVE;
      } else {
        throw new Error('TrueLayer credentials not found. Set TRUELAYER_CLIENT_ID/TRUELAYER_CLIENT_SECRET for sandbox or LIVE equivalents.');
      }
    }
    
    console.log('TrueLayer Service initialized:');
    console.log('- Using live environment:', isLive);
    console.log('- Auth URL base:', TRUELAYER_AUTH_URL);
    console.log('- API URL base:', TRUELAYER_BASE_URL);
    console.log('- Credential source:', hasLiveSpecificCreds ? 'LIVE-specific envs' : 'generic envs');
  }

  /**
   * Generate TrueLayer authorization URL for bank connection
   */
  generateAuthUrl(redirectUri: string, scope: string[] = ['info', 'accounts', 'balance', 'cards', 'transactions', 'direct_debits', 'standing_orders', 'offline_access']): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scope.join(' '),
      state: this.generateState(), // For security
      providers: isLive ? 'uk-ob-all uk-oauth-all' : 'uk-cs-mock uk-ob-all uk-oauth-all', // Live or sandbox providers
    });

    // Use the correct TrueLayer auth endpoint (no /auth path needed)
    const authUrl = `${TRUELAYER_AUTH_URL}/?${params.toString()}`;
    console.log('Generated TrueLayer auth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);
    console.log('Using environment:', process.env.NODE_ENV);
    console.log('Auth base URL:', TRUELAYER_AUTH_URL);
    
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TrueLayer token exchange error details:', {
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
  async getAccounts(accessToken: string): Promise<TrueLayerAccount[]> {
    const response = await fetch(`${TRUELAYER_BASE_URL}/data/v1/accounts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results.map((account: any) => TrueLayerAccountSchema.parse(account));
  }

  /**
   * Fetch account balance
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<TrueLayerBalance> {
    const response = await fetch(`${TRUELAYER_BASE_URL}/data/v1/accounts/${accountId}/balance`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
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
  async getAccountTransactions(
    accessToken: string, 
    accountId: string, 
    from?: string, 
    to?: string
  ): Promise<TrueLayerTransaction[]> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const url = `${TRUELAYER_BASE_URL}/data/v1/accounts/${accountId}/transactions${params.toString() ? '?' + params.toString() : ''}`;
    console.log('🌐 Fetching transactions from URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ TrueLayer transactions API error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url
      });
      throw new Error(`Failed to fetch transactions for account ${accountId}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Raw transaction response:`, {
      resultsCount: data.results?.length || 0,
      hasResults: !!data.results,
      dataKeys: Object.keys(data)
    });
    
    if (!data.results || !Array.isArray(data.results)) {
      console.log('⚠️ No results array in transaction response:', data);
      return [];
    }
    
    return data.results.map((transaction: any) => TrueLayerTransactionSchema.parse(transaction));
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
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
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Format currency amount for UK display (GBP)
   */
  formatCurrency(amount: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Categorize transaction based on TrueLayer category and description
   */
  categorizeTransaction(transaction: TrueLayerTransaction): string {
    // Use TrueLayer's category if available
    if (transaction.transaction_category) {
      return this.mapTrueLayerCategory(transaction.transaction_category);
    }

    // Fallback to description-based categorization
    const description = transaction.description.toLowerCase();
    const merchantName = transaction.merchant_name?.toLowerCase() || '';

    // Grocery stores
    if (description.includes('tesco') || description.includes('sainsbury') || 
        description.includes('asda') || description.includes('morrisons') ||
        merchantName.includes('tesco') || merchantName.includes('sainsbury')) {
      return 'Groceries';
    }

    // Transport
    if (description.includes('tfl') || description.includes('uber') || 
        description.includes('transport') || description.includes('bus') ||
        description.includes('train') || description.includes('petrol')) {
      return 'Transportation';
    }

    // Restaurants & Food
    if (description.includes('restaurant') || description.includes('cafe') ||
        description.includes('takeaway') || description.includes('delivery') ||
        merchantName.includes('restaurant') || merchantName.includes('cafe')) {
      return 'Dining Out';
    }

    // Entertainment
    if (description.includes('cinema') || description.includes('netflix') ||
        description.includes('spotify') || description.includes('entertainment')) {
      return 'Entertainment';
    }

    // Shopping
    if (description.includes('amazon') || description.includes('shop') ||
        description.includes('store') || merchantName.includes('amazon')) {
      return 'Shopping';
    }

    // Bills & Utilities
    if (description.includes('direct debit') || description.includes('standing order') ||
        description.includes('utility') || description.includes('council tax') ||
        description.includes('insurance')) {
      return 'Bills & Utilities';
    }

    return 'Other';
  }

  /**
   * Map TrueLayer categories to our internal categories
   */
  private mapTrueLayerCategory(trueLayerCategory: string): string {
    const categoryMap: Record<string, string> = {
      'GROCERIES': 'Groceries',
      'TRANSPORT': 'Transportation',
      'RESTAURANTS': 'Dining Out',
      'ENTERTAINMENT': 'Entertainment',
      'SHOPPING': 'Shopping',
      'BILLS_AND_UTILITIES': 'Bills & Utilities',
      'CASH_AND_ATM': 'Cash & ATM',
      'GENERAL': 'Other',
    };

    return categoryMap[trueLayerCategory.toUpperCase()] || 'Other';
  }
}

export const trueLayerService = new TrueLayerService();