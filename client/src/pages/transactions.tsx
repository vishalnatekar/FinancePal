import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Edit, Clock } from "lucide-react";
import { CategoryModal } from "@/components/CategoryModal";
import { format } from "date-fns";
import type { Transaction } from "@shared/schema";

export default function TransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const handleEditCategory = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setCategoryModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and categorize your recent transactions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions?.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No transactions yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Connect your bank account to start seeing transactions here
                </p>
              </div>
            ) : (
              transactions?.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      parseFloat(transaction.amount) > 0 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      {parseFloat(transaction.amount) > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.description}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {transaction.category && (
                      <Badge 
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleEditCategory(transaction)}
                      >
                        {transaction.category}
                        <Edit className="h-3 w-3 ml-1" />
                      </Badge>
                    )}
                    <div className={`text-right font-semibold ${
                      parseFloat(transaction.amount) > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {parseFloat(transaction.amount) > 0 ? '+' : ''}£{Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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