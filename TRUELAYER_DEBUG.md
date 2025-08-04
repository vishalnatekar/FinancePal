# TrueLayer Connection Issue Debug

## Problem
- Error: "login.truelayer.com refused to connect"
- This indicates TrueLayer auth URL is malformed or environment mismatch

## Current Configuration Status
- Environment: Development (NODE_ENV=development)
- Expected sandbox URL: `https://auth.truelayer-sandbox.com`
- Issue: Getting redirected to `login.truelayer.com` instead

## Possible Causes
1. TrueLayer application configured for production instead of sandbox
2. Client ID belongs to production environment
3. Redirect URI not whitelisted in TrueLayer console
4. TrueLayer changed their sandbox URLs

## Required Actions
1. **Verify TrueLayer Environment**: Check if your TRUELAYER_CLIENT_ID is for sandbox or production
2. **Sandbox Setup**: If using production credentials, switch to TrueLayer sandbox mode
3. **Redirect URI**: Add `https://your-replit-url.replit.dev/api/banking/callback` to allowed redirects
4. **Alternative**: Consider switching to Finexer (14-day free trial) or Yapily (free sandbox)

## Next Steps
1. Test with TrueLayer sandbox credentials
2. If still failing, switch to alternative provider from BANKING_SETUP.md