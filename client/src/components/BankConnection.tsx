import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, RefreshCw, Unlink, CheckCircle, AlertCircle, Clock, Plus, Trash2 } from "lucide-react";

interface BankingStatus {
  connected: boolean;
  connections: Array<{
    id: string;
    lastSynced: string | null;
    createdAt: string;
  }>;
  institutions: string[];
  lastSynced: string | null;
  accountsCount: number;
}

export function BankConnection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Query banking status
  const { data: status, isLoading: statusLoading } = useQuery<BankingStatus>({
    queryKey: ["/api/banking/status"],
  });

  // Connect to bank mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/banking/connect");
      return response.json();
    },
    onSuccess: (data: { authUrl: string }) => {
      setIsConnecting(true);
      // Redirect to TrueLayer authorization
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      console.error("Connect error:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to TrueLayer. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  // Sync banking data mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/banking/sync");
      return response.json();
    },
    onSuccess: (data: { success: boolean; accountsSynced: number; transactionsSynced: number }) => {
      toast({
        title: "Sync Successful",
        description: `Synced ${data.accountsSynced} accounts and ${data.transactionsSynced} transactions.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/banking/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/networth"] });
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync banking data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Disconnect all banking connections mutation
  const disconnectAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/banking/disconnect");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Successfully disconnected all bank connections.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/banking/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error) => {
      console.error("Disconnect error:", error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Disconnect specific banking connection mutation
  const disconnectSpecificMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest("DELETE", `/api/banking/disconnect/${connectionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection Removed",
        description: "Successfully removed bank connection.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/banking/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error) => {
      console.error("Disconnect specific error:", error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to remove connection. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          UK Bank Connection
        </CardTitle>
        <CardDescription>
          Connect your UK bank accounts through TrueLayer's secure Open Banking platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <div className="space-y-4">
            {/* Connected Banks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Connected Banks ({status?.institutions?.length || 0})</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  Active
                </Badge>
              </div>

              {/* Bank List */}
              <div className="space-y-2">
                {status?.institutions?.map((institution, index) => (
                  <div key={institution} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium">{institution}</span>
                    </div>
                    {(status?.connections?.length || 0) > 1 && (
                      <Button
                        onClick={() => disconnectSpecificMutation.mutate(status?.connections?.[index]?.id || '')}
                        disabled={disconnectSpecificMutation.isPending}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Bank Button */}
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending || isConnecting}
                variant="outline"
                className="w-full border-dashed"
              >
                {connectMutation.isPending || isConnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Another Bank
                  </>
                )}
              </Button>
            </div>

            {/* Account Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {status.accountsCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total Accounts
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Synced
                </div>
                <div className="text-sm font-medium mt-1">
                  {status.lastSynced 
                    ? new Date(status.lastSynced).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Never'
                  }
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex-1"
              >
                {syncMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync All Banks
                  </>
                )}
              </Button>
              <Button
                onClick={() => disconnectAllMutation.mutate()}
                disabled={disconnectAllMutation.isPending}
                variant="outline"
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect All
              </Button>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                What happens when you sync:
              </div>
              <ul className="space-y-1">
                <li>• Updates account balances from all your banks</li>
                <li>• Imports new transactions from the last 30 days</li>
                <li>• Automatically categorizes spending</li>
                <li>• Recalculates your net worth</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected State */}
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Bank Connected
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Connect your UK bank accounts to automatically import transactions and track your financial progress
              </p>
            </div>

            {/* Connect Button */}
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || isConnecting}
              className="w-full"
            >
              {connectMutation.isPending || isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Connect UK Bank
                </>
              )}
            </Button>

            {/* Benefits */}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Connect multiple UK banks:
              </div>
              <ul className="space-y-1">
                <li>• Monzo, HSBC, Lloyds, Barclays, NatWest</li>
                <li>• Santander, Halifax, Nationwide</li>
                <li>• Starling Bank, Revolut, and more</li>
                <li>• Complete financial overview in one place</li>
              </ul>
            </div>

            {/* Security Notice */}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="font-medium text-green-700 dark:text-green-300 mb-1">
                🔒 Bank-level security powered by TrueLayer
              </div>
              <p>
                Your data is protected by UK Open Banking standards. We never store your banking credentials.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}