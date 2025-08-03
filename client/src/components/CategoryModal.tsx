import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

const CATEGORIES = [
  "Groceries",
  "Entertainment", 
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Healthcare",
  "Dining",
  "Income",
  "Banking",
  "Other",
];

export function CategoryModal({ open, onOpenChange, transaction }: CategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categorizeTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, category }: { transactionId: string; category: string }) => {
      const response = await apiRequest("POST", `/api/transactions/${transactionId}/categorize`, {
        category,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({
        title: "Category Updated",
        description: "Transaction has been successfully categorized",
      });
      onOpenChange(false);
      setSelectedCategory("");
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update transaction category",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!transaction || !selectedCategory) return;
    
    categorizeTransactionMutation.mutate({
      transactionId: transaction.id,
      category: selectedCategory,
    });
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(Math.abs(num));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction Category</DialogTitle>
        </DialogHeader>
        
        {transaction && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600">Transaction:</Label>
              <p className="font-medium text-gray-900">
                {transaction.description} - {formatAmount(transaction.amount)}
              </p>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={handleSave}
                disabled={!selectedCategory || categorizeTransactionMutation.isPending}
                className="flex-1"
              >
                {categorizeTransactionMutation.isPending ? "Saving..." : "Save Category"}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
