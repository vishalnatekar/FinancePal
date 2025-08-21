import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, University, CreditCard, Plus, Edit, TrendingUp, TrendingDown, Clock, RefreshCw } from "lucide-react";
import { NetWorthChart } from "@/components/NetWorthChart";
import { CategoryModal } from "@/components/CategoryModal";
import { BankConnection } from "@/components/BankConnection";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Account, Transaction, Budget, Goal, NetWorthHistory } from "@shared/schema";

interface DashboardData {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Array<Budget & { spent: number; remaining: number; percentageUsed: number }>;
  goals: Array<Goal & { progress: number; remaining: number; timeRemaining: string | null }>;
  netWorth: {
    current: NetWorthHistory | null;
    history: NetWorthHistory[];
  };
}

export default function Dashboard() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all dashboard data
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: budgets, isLoading: budgetsLoading } = useQuery<Array<Budget & { spent: number; remaining: number; percentageUsed: number }>>({
    queryKey: ["/api/budgets"],
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<Array<Goal & { progress: number; remaining: number; timeRemaining: string | null }>>({
    queryKey: ["/api/goals"],
  });

  const { data: netWorthData, isLoading: netWorthLoading } = useQuery<{
    current: NetWorthHistory | null;
    history: NetWorthHistory[];
  }>({
    queryKey: ["/api/net-worth"],
  });

  // Calculate net worth mutation
  const calculateNetWorthMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/net-worth/calculate", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/net-worth"] });
      toast({
        title: "Net Worth Updated",
        description: "Your net worth has been recalculated",
      });
    },
  });

  const handleEditCategory = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setCategoryModalOpen(true);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(num);
  };

  const getAccountIcon = (type: string) => {
    return type === "credit_card" ? CreditCard : University;
  };

  const getCategoryColor = (category: string | null) => {
    const colors: { [key: string]: string } = {
      "Groceries": "bg-blue-100 text-blue-800",
      "Income": "bg-green-100 text-green-800",
      "Entertainment": "bg-purple-100 text-purple-800",
      "Transportation": "bg-yellow-100 text-yellow-800",
      "Shopping": "bg-pink-100 text-pink-800",
      "Dining": "bg-orange-100 text-orange-800",
      "Bills & Utilities": "bg-red-100 text-red-800",
      "Healthcare": "bg-teal-100 text-teal-800",
      "Banking": "bg-gray-100 text-gray-800",
    };
    return colors[category || ""] || "bg-gray-100 text-gray-800";
  };

  const isLoading = accountsLoading || transactionsLoading || budgetsLoading || goalsLoading || netWorthLoading;

  const currentNetWorth = netWorthData?.current;
  const netWorthHistory = netWorthData?.history || [];

  // Auto-calculate net worth when accounts are loaded and no current net worth exists
  useEffect(() => {
    if (accounts && accounts.length > 0 && !currentNetWorth && !calculateNetWorthMutation.isPending) {
      calculateNetWorthMutation.mutate();
    }
  }, [accounts, currentNetWorth, calculateNetWorthMutation]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Net Worth Summary */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Net Worth</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>
                {currentNetWorth && currentNetWorth.createdAt
                  ? `Updated ${format(new Date(currentNetWorth.createdAt), "MMM d, h:mm a")}`
                  : "Calculating from connected accounts..."
                }
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600 mb-1">Current Net Worth</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {currentNetWorth ? formatCurrency(currentNetWorth.netWorth) : "£0.00"}
              </p>
              {netWorthHistory.length > 1 && (() => {
                const recent = parseFloat(netWorthHistory[netWorthHistory.length - 1]?.netWorth || "0");
                const previous = parseFloat(netWorthHistory[netWorthHistory.length - 2]?.netWorth || "0");
                const isGrowing = recent > previous;
                
                return (
                  <div className="flex items-center justify-center md:justify-start mt-2">
                    {isGrowing ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600 text-sm font-medium">
                          Growing trend
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                        <span className="text-red-600 text-sm font-medium">
                          Declining trend
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Assets</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {currentNetWorth ? formatCurrency(currentNetWorth.totalAssets) : "£0.00"}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Liabilities</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {currentNetWorth ? formatCurrency(currentNetWorth.totalLiabilities) : "£0.00"}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <NetWorthChart data={netWorthHistory.length > 0 ? netWorthHistory.map(item => ({
              ...item,
              date: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
            })) : []} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connected Accounts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Connected Accounts</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Connect Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!accounts || accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <University className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No accounts connected</p>
                  <p className="text-sm">Connect your bank accounts to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => {
                    const Icon = getAccountIcon(account.type);
                    const balance = parseFloat(account.balance);
                    const isNegative = balance < 0;
                    
                    return (
                      <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{account.name}</p>
                            <p className="text-sm text-gray-600">
                              {account.accountNumber || "••••••••"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isNegative ? "text-red-600" : "text-gray-900"}`}>
                            {formatCurrency(balance)}
                          </p>
                          <div className="flex items-center mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-xs text-gray-600">Connected</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bank Connection & Budget & Goals */}
        <div className="space-y-6">
          {/* Bank Connection */}
          <BankConnection />
          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>This Month's Budget</CardTitle>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!budgets || budgets.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No budgets set</p>
                  <p className="text-sm">Create budgets to track spending</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgets.slice(0, 3).map((budget) => (
                    <div key={budget.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">{budget.category}</span>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                        </span>
                      </div>
                      <Progress 
                        value={budget.percentageUsed} 
                        className={`h-2 ${budget.percentageUsed > 100 ? "text-red-500" : "text-green-500"}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Goals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Financial Goals</CardTitle>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!goals || goals.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No goals set</p>
                  <p className="text-sm">Set financial goals to track progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.slice(0, 2).map((goal) => (
                    <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{goal.name}</h4>
                          <p className="text-sm text-gray-600">
                            Target: {formatCurrency(goal.targetAmount)}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {Math.round(goal.progress)}%
                        </span>
                      </div>
                      <Progress value={goal.progress} className="h-2 mb-2" />
                      <p className="text-xs text-gray-600">
                        {formatCurrency(goal.currentAmount)} saved
                        {goal.timeRemaining && ` • ${goal.timeRemaining}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/transactions'}>
              View All →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found</p>
              <p className="text-sm">Connect accounts to see transaction history</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Description</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Category</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Amount</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 8).map((transaction) => {
                    const amount = parseFloat(transaction.amount);
                    const isPositive = amount > 0;
                    
                    return (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-sm text-gray-900">
                          {format(new Date(transaction.date), "MMM dd")}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className={getCategoryColor(transaction.category)}>
                            {transaction.category || "Uncategorized"}
                            {!transaction.category && (
                              <span className="ml-1 text-yellow-600">⚠</span>
                            )}
                          </Badge>
                        </td>
                        <td className={`py-3 px-2 text-sm text-right font-medium ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}>
                          {isPositive ? "+" : ""}{formatCurrency(amount)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCategory(transaction)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        transaction={selectedTransaction}
      />
    </div>
  );
}
