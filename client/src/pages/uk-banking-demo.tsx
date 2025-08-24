import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { University, ArrowRight, Shield, CheckCircle, Clock } from "lucide-react";
import { FirebaseStatusBanner } from "@/components/FirebaseStatusBanner";
import { auth } from "@/firebase";

const UK_BANKS = [
  { id: "lloyds_bank_gb", name: "Lloyds Bank", logo: "🏦", popular: true },
  { id: "barclays_gb", name: "Barclays", logo: "🔵", popular: true },
  { id: "hsbc_gb", name: "HSBC UK", logo: "🔴", popular: true },
  { id: "natwest_gb", name: "NatWest", logo: "💜", popular: true },
  { id: "santander_gb", name: "Santander UK", logo: "🔺", popular: true },
  { id: "halifax_gb", name: "Halifax", logo: "🏠", popular: false },
  { id: "nationwide_gb", name: "Nationwide Building Society", logo: "🏘️", popular: false },
  { id: "monzo_gb", name: "Monzo", logo: "🟠", popular: true },
  { id: "starling_gb", name: "Starling Bank", logo: "⭐", popular: true },
  { id: "revolut_gb", name: "Revolut", logo: "🚀", popular: true },
  { id: "first_direct_gb", name: "First Direct", logo: "🎯", popular: false },
  { id: "metro_bank_gb", name: "Metro Bank", logo: "Ⓜ️", popular: false },
];

export default function UKBankingDemo() {
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [connectionStep, setConnectionStep] = useState<"select" | "connecting" | "connected">("select");

  const handleConnect = () => {
    if (!selectedBank) return;
    
    setConnectionStep("connecting");
    
    // Redirect to TrueLayer authorization with state parameter containing user ID
    const user = auth?.currentUser;
    if (!user) {
      alert('Please sign in first');
      return;
    }
    
    // Store user ID in localStorage for callback retrieval (temporary solution)
    localStorage.setItem('banking_user_id', user.uid);
    localStorage.setItem('banking_selected_bank', selectedBank);
    
    console.log('🔐 Stored user ID for callback:', user.uid);
    console.log('🏦 Selected bank:', selectedBank);
    
    // Use current domain for callback URL
    const currentDomain = window.location.host;
    const callbackUrl = `https://${currentDomain}/api/banking/callback`;
    
    // Let TrueLayer generate their own state parameter
    const authUrl = `https://auth.truelayer.com/?response_type=code&client_id=financepal-415037&scope=accounts%20balance%20transactions&redirect_uri=${encodeURIComponent(callbackUrl)}&provider_id=${selectedBank}`;
    console.log('🌐 Callback URL:', callbackUrl);
    console.log('🌐 Auth URL:', authUrl);
    window.location.href = authUrl;
  };

  const popularBanks = UK_BANKS.filter(bank => bank.popular);
  const otherBanks = UK_BANKS.filter(bank => !bank.popular);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FirebaseStatusBanner />
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Connect Your UK Bank Account
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Securely link your UK bank account using Open Banking
        </p>
        <p className="text-sm text-gray-500">
          Regulated by the FCA • 256-bit encryption • Read-only access
        </p>
      </div>

      {connectionStep === "select" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <University className="h-5 w-5 mr-2" />
              Choose Your Bank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Popular UK Banks</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {popularBanks.map((bank) => (
                    <Button
                      key={bank.id}
                      variant={selectedBank === bank.id ? "default" : "outline"}
                      className="h-16 flex-col space-y-1"
                      onClick={() => setSelectedBank(bank.id)}
                    >
                      <span className="text-2xl">{bank.logo}</span>
                      <span className="text-xs">{bank.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Other UK Banks</h3>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select another bank..." />
                  </SelectTrigger>
                  <SelectContent>
                    {otherBanks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center">
                          <span className="mr-2">{bank.logo}</span>
                          {bank.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-1" />
                      Bank-grade security
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      FCA regulated
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnect}
                    disabled={!selectedBank}
                    className="flex items-center"
                  >
                    Connect Securely
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStep === "connecting" && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Connecting to {UK_BANKS.find(b => b.id === selectedBank)?.name}</h3>
            <p className="text-gray-600 mb-4">
              You'll be redirected to your bank's secure login page
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              This usually takes 10-30 seconds
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStep === "connected" && (
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">Successfully Connected!</h3>
            <p className="text-green-800 mb-4">
              Your {UK_BANKS.find(b => b.id === selectedBank)?.name} account has been linked securely
            </p>
            <div className="space-y-2 mb-6">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Account balances synced
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Recent transactions imported
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Ready for budgeting
              </Badge>
            </div>
            <Button onClick={() => window.location.href = "/"}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Bank-Level Security</h3>
            <p className="text-sm text-gray-600">
              Your data is protected with the same encryption standards used by UK banks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">FCA Regulated</h3>
            <p className="text-sm text-gray-600">
              All connections comply with UK Open Banking regulations and PSD2 standards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <University className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Read-Only Access</h3>
            <p className="text-sm text-gray-600">
              We can only view your data - we never have permission to move money
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}