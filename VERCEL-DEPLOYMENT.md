# 🚀 VERCEL DEPLOYMENT - CRITICAL STEPS

## ⚠️ IMPORTANT: Environment Variables

Vercel needs your Airtable credentials to work! Here's how to add them:

### Option 1: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project: `cowc-web-app`
3. Click "Settings" tab
4. Click "Environment Variables" in sidebar
5. Add these THREE variables:

```
Name: VITE_DATA_SOURCE
Value: airtable

Name: VITE_AIRTABLE_API_KEY  
Value: your-airtable-api-key-here

Name: VITE_AIRTABLE_BASE_ID
Value: appkmFeZD5BKJCols
```

6. Click "Save"
7. Go to "Deployments" tab
8. Click "..." on latest deployment → "Redeploy"

### Option 2: Via Command Line

```bash
cd ~/Desktop/cowc-web-app

# Set environment variables
vercel env add VITE_DATA_SOURCE production
# Enter: airtable

vercel env add VITE_AIRTABLE_API_KEY production  
# Paste your Airtable API key

vercel env add VITE_AIRTABLE_BASE_ID production
# Enter: appkmFeZD5BKJCols

# Redeploy
npx vercel --prod
```

---

## 🔍 Verify It's Working:

After deployment:
1. Open your Vercel URL
2. Press F12 (open console)
3. Look for: "🔌 Active Data Source: airtable"
4. Should see your 3 weddings!

---

## 🐛 If Still Not Working:

Check console for errors:
- "401 Unauthorized" = Token issue
- "404 Not Found" = Base ID wrong
- "Undefined" = Env vars not set

**Most common issue:** Environment variables not set in Vercel dashboard!
