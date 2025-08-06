import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, PiggyBank } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Budget } from "@shared/schema";

type BudgetWithStats = Budget & { spent: number; remaining: number; percentageUsed: number };

export default function BudgetPage() {
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: budgets, isLoading } = useQuery<BudgetWithStats[]>({
    queryKey: ["/api/budgets"],
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/budgets/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget Deleted",
        description: "Budget has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
    },
  });

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
                    <Skeleton className="h-2 w-full" />
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Budgets</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your spending across different categories
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {budgets?.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <PiggyBank className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
                No budgets created yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Create your first budget to start tracking your spending and staying on top of your finances
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Budget
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {budgets?.map((budget) => (
            <Card key={budget.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{budget.category}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {budget.period} budget
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteBudgetMutation.mutate(budget.id)}
                      disabled={deleteBudgetMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Spent: £{budget.spent.toFixed(2)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Budget: £{parseFloat(budget.amount).toFixed(2)}
                    </span>
                  </div>
                  
                  <Progress 
                    value={Math.min(budget.percentageUsed, 100)} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className={`font-medium ${
                        budget.remaining >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {budget.remaining >= 0 ? '£' + budget.remaining.toFixed(2) + ' remaining' : '£' + Math.abs(budget.remaining).toFixed(2) + ' over budget'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {budget.percentageUsed.toFixed(0)}% used
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}