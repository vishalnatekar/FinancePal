// Open Banking service for connecting to Nordigen/GoCardless
// This is a placeholder implementation that can be easily swapped with real API integration

interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: string;
  maskedNumber: string;
}

interface Institution {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: string;
  description: string;
  date: string;
}

interface ConnectAccountResponse {
  institution: Institution;
  accounts: BankAccount[];
}

interface GetTransactionsResponse {
  transactions: Transaction[];
  currentBalance: string;
}

class OpenBankingService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // Use environment variables for API configuration - GoCardless is the main UK Open Banking provider
    this.apiKey = process.env.GOCARDLESS_SECRET_KEY || process.env.NORDIGEN_SECRET_KEY || "";
    this.baseUrl = process.env.GOCARDLESS_BASE_URL || "https://bankaccountdata.gocardless.com";
  }

  async connectAccount(institutionId: string, credentials: any): Promise<ConnectAccountResponse> {
    // In a real implementation, this would:
    // 1. Create a requisition with the institution
    // 2. Handle the authorization flow
    // 3. Exchange tokens for account access
    // 4. Fetch account details
    
    try {
      if (!this.apiKey) {
        throw new Error("Open Banking API key not configured");
      }

      // Placeholder response structure
      // Replace with actual API calls to Nordigen/GoCardless
      return {
        institution: {
          id: institutionId,
          name: "Demo Bank",
        },
        accounts: [
          {
            id: `account_${Date.now()}`,
            name: "Demo Current Account",
            type: "current",
            balance: "3500.00",
            maskedNumber: "••••5678",
          },
        ],
      };
    } catch (error) {
      console.error("Open Banking connect error:", error);
      throw new Error("Failed to connect to bank account");
    }
  }

  async getTransactions(accountId: string): Promise<GetTransactionsResponse> {
    // In a real implementation, this would:
    // 1. Use the account ID to fetch transactions
    // 2. Handle pagination for large datasets
    // 3. Parse and normalize transaction data
    
    try {
      if (!this.apiKey) {
        throw new Error("Open Banking API key not configured");
      }

      // Placeholder response structure
      // Replace with actual API calls to Nordigen/GoCardless
      const mockTransactions = [
        {
          id: `txn_${Date.now()}_1`,
          amount: "-67.89",
          description: "WHOLE FOODS MARKET",
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `txn_${Date.now()}_2`,
          amount: "4250.00",
          description: "SALARY DEPOSIT - ACME CORP",
          date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `txn_${Date.now()}_3`,
          amount: "-15.99",
          description: "NETFLIX.COM",
          date: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        },
      ];

      return {
        transactions: mockTransactions,
        currentBalance: "5000.00",
      };
    } catch (error) {
      console.error("Open Banking get transactions error:", error);
      throw new Error("Failed to fetch transactions");
    }
  }

  async getInstitutions(): Promise<Institution[]> {
    // Return list of supported institutions
    try {
      if (!this.apiKey) {
        throw new Error("Open Banking API key not configured");
      }

      // Major UK banks supported by Open Banking
      return [
        { id: "lloyds_bank_gb", name: "Lloyds Bank" },
        { id: "barclays_gb", name: "Barclays" },
        { id: "hsbc_gb", name: "HSBC UK" },
        { id: "natwest_gb", name: "NatWest" },
        { id: "santander_gb", name: "Santander UK" },
        { id: "halifax_gb", name: "Halifax" },
        { id: "nationwide_gb", name: "Nationwide Building Society" },
        { id: "monzo_gb", name: "Monzo" },
        { id: "starling_gb", name: "Starling Bank" },
        { id: "revolut_gb", name: "Revolut" },
        { id: "first_direct_gb", name: "First Direct" },
        { id: "metro_bank_gb", name: "Metro Bank" },
      ];
    } catch (error) {
      console.error("Open Banking get institutions error:", error);
      throw new Error("Failed to fetch institutions");
    }
  }
}

export const openBankingService = new OpenBankingService();
