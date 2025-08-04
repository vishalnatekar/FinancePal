import { z } from 'zod';

// TrueLayer API configuration - force sandbox for development with sandbox client ID
const isSandbox = process.env.TRUELAYER_CLIENT_ID?.includes('sandbox') || process.env.NODE_ENV !== 'production';
const TRUELAYER_BASE_URL = isSandbox ? 'https://api.truelayer-sandbox.com' : 'https://api.truelayer.com';
const TRUELAYER_AUTH_URL = isSandbox ? 'https://auth.truelayer-sandbox.com' : 'https://auth.truelayer.com';

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
    if (!process.env.TRUELAYER_CLIENT_ID || !process.env.TRUELAYER_CLIENT_SECRET) {
      throw new Error('TrueLayer credentials not found. Please add TRUELAYER_CLIENT_ID and TRUELAYER_CLIENT_SECRET to your environment variables.');
    }
    
    this.clientId = process.env.TRUELAYER_CLIENT_ID;
    this.clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
    
    console.log('TrueLayer Service initialized:');
    console.log('- Client ID:', this.clientId);
    console.log('- Using sandbox:', isSandbox);
    console.log('- Auth URL base:', TRUELAYER_AUTH_URL);
    console.log('- API URL base:', TRUELAYER_BASE_URL);
  }

  /**
   * Generate TrueLayer authorization URL for bank connection
   */
  generateAuthUrl(redirectUri: string, scope: string[] = ['accounts', 'balance', 'transactions']): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scope.join(' '),
      state: this.generateState(), // For security
    });

    const authUrl = `${TRUELAYER_AUTH_URL}?${params.toString()}`;
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
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions for account ${accountId}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
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