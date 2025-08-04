const API_BASE_URL = 'https://finance-pal-vishalnatekar.replit.app/api';

class ApiService {
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request<any>('/auth/user');
  }

  // Account endpoints
  async getAccounts() {
    return this.request<any[]>('/accounts');
  }

  async createAccount(account: any) {
    return this.request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  }

  async updateAccount(id: string, account: any) {
    return this.request<any>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(account),
    });
  }

  async deleteAccount(id: string) {
    return this.request<any>(`/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Transaction endpoints
  async getTransactions() {
    return this.request<any[]>('/transactions');
  }

  async createTransaction(transaction: any) {
    return this.request<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async updateTransaction(id: string, transaction: any) {
    return this.request<any>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaction),
    });
  }

  async deleteTransaction(id: string) {
    return this.request<any>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Budget endpoints
  async getBudgets() {
    return this.request<any[]>('/budgets');
  }

  async createBudget(budget: any) {
    return this.request<any>('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  async updateBudget(id: string, budget: any) {
    return this.request<any>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(budget),
    });
  }

  async deleteBudget(id: string) {
    return this.request<any>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  // Goal endpoints
  async getGoals() {
    return this.request<any[]>('/goals');
  }

  async createGoal(goal: any) {
    return this.request<any>('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  async updateGoal(id: string, goal: any) {
    return this.request<any>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(goal),
    });
  }

  async deleteGoal(id: string) {
    return this.request<any>(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  // Net worth endpoint
  async getNetWorth() {
    return this.request<{ currentNetWorth: number; history: any[] }>('/networth');
  }

  // Banking endpoints
  async getBankingStatus() {
    return this.request<{ connected: boolean; lastSynced: string | null; accountsCount: number }>('/banking/status');
  }

  async connectBank() {
    return this.request<{ authUrl: string }>('/banking/connect');
  }

  async syncBankingData() {
    return this.request<{ accountsCount: number; transactionsCount: number }>('/banking/sync', {
      method: 'POST',
    });
  }

  async disconnectBank() {
    return this.request<{ success: boolean }>('/banking/disconnect', {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();