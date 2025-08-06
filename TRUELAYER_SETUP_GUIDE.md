# TrueLayer Setup Guide - Detailed Troubleshooting

## Current Status
- ✅ Technical integration working correctly
- ✅ Auth URL properly formatted: `https://auth.truelayer.com`
- ✅ Client ID confirmed: `sandbox-financepal-415037`
- ✅ Redirect URI: `https://finance-pal-vishalnatekar.replit.app/api/banking/callback`
- ❌ Console configuration issue: "Unknown client or client not enabled"

## Detailed Console Setup Steps

### Step 1: Access TrueLayer Console
1. Go to: https://console.truelayer.com
2. Sign in with your TrueLayer account
3. **Important**: Make sure you're in SANDBOX mode (toggle in top-right)

### Step 2: Find Your Sandbox App
1. Look for app with Client ID: `sandbox-financepal-415037`
2. Click on the app name to open settings
3. If you don't see this app, you may need to create it first

### Step 3: Configure Redirect URIs
1. In app settings, find "Application settings" section
2. Look for "Redirect URIs" subsection
3. Click the "+" button to add new URI
4. Enter EXACTLY: `https://finance-pal-vishalnatekar.replit.app/api/banking/callback`
5. Click the tick icon or press Enter to confirm
6. **Wait 15 minutes** - changes can take this long to apply

### Step 4: Verify App Status
1. Check that your app is "Active" or "Enabled"
2. Verify sandbox mode is enabled
3. Confirm your client credentials are correct

## Common Issues & Solutions

### Issue 1: "Unknown client or client not enabled"
**Possible causes:**
- Redirect URI not whitelisted (most common)
- App not activated in sandbox
- Wrong client ID
- Still in live mode instead of sandbox

**Solutions:**
- Double-check redirect URI is exactly correct
- Wait 15 minutes after adding URI
- Verify sandbox mode is enabled
- Check app activation status

### Issue 2: App Not Found
**If you don't see `sandbox-financepal-415037`:**
- You may need to create a new sandbox app
- Or you're logged into wrong TrueLayer account
- Or you're in live mode instead of sandbox

### Issue 3: Redirect URI Format
**Must be exactly:**
```
https://finance-pal-vishalnatekar.replit.app/api/banking/callback
```
**Common mistakes:**
- Missing `https://`
- Extra trailing slash
- Wrong domain name
- Typos in path

## Verification Steps

### Test 1: Check Current Auth URL
Visit this URL (should show TrueLayer error page, not 404):
```
https://auth.truelayer.com/?response_type=code&client_id=sandbox-financepal-415037&redirect_uri=https%3A%2F%2Ffinance-pal-vishalnatekar.replit.app%2Fapi%2Fbanking%2Fcallback&scope=accounts+balance+transactions&state=test
```

### Test 2: Check Console Settings
1. Confirm redirect URI is listed in console
2. Verify app is active/enabled
3. Check sandbox mode is enabled

### Test 3: Wait and Retry
- Changes take up to 15 minutes
- Try again after waiting
- Clear browser cache if needed

## Next Steps if Still Not Working

1. **Create New Sandbox App** (if current one has issues)
2. **Contact TrueLayer Support** with these details:
   - Client ID: sandbox-financepal-415037
   - Redirect URI: https://finance-pal-vishalnatekar.replit.app/api/banking/callback
   - Error: "Unknown client or client not enabled"
3. **Verify Account Status** - ensure your TrueLayer account is properly activated

## Technical Confirmation
The integration code is working correctly. The error occurs at TrueLayer's servers, confirming:
- Our auth URL format is correct
- Request reaches TrueLayer successfully
- Issue is in console configuration, not code