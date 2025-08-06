import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { University, CreditCard, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Account } from "@shared/schema";

export default function AccountsPage() {
  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit_card':
      case 'credit':
        return CreditCard;
      case 'savings':
        return Building2;
      default:
        return University;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit_card':
      case 'credit':
        return 'Credit Card';
      case 'savings':
        return 'Savings';
      case 'checking':
      case 'current':
        return 'Current Account';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Overview of all your connected bank accounts
        </p>
      </div>

      {accounts?.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <University className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
                No accounts connected
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Connect your UK bank accounts to see them here and start tracking your finances
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {accounts?.map((account) => {
            const IconComponent = getAccountIcon(account.type);
            const balance = parseFloat(account.balance);
            
            return (
              <Card key={account.id}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {account.institutionName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        balance >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        £{Math.abs(balance).toFixed(2)}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {getAccountTypeLabel(account.type)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Account Number:</span>
                      <div className="font-mono text-gray-900 dark:text-gray-100">
                        {account.accountNumber || '••••••••'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Currency:</span>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {account.currency}
                      </div>
                    </div>
                  </div>
                  
                  {account.lastSynced && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        Last synced: {format(new Date(account.lastSynced), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  )}
                  
                  {!account.isActive && (
                    <div className="mt-4">
                      <Badge variant="destructive">Inactive</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}