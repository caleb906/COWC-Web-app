# 🚀 COWC App - Replit Deployment Guide

## Quick Start (5 minutes)

### 1. Create Replit Account
- Go to https://replit.com
- Sign up / Log in

### 2. Import Project
Option A - Upload Files:
1. Click "Create Repl"
2. Choose "Import from Github" OR "Upload"  
3. If uploading: Extract the tar.gz first, then upload the cowc-web-app folder

Option B - GitHub (Recommended):
1. Push your cowc-web-app folder to GitHub
2. In Replit: "Import from GitHub"
3. Paste your repo URL

### 3. Configure Replit
Once imported, Replit should auto-detect it's a Vite React app.

If not, add this to `.replit` file:
```
run = "npm run dev -- --host 0.0.0.0"
entrypoint = "index.html"

[nix]
channel = "stable-22_11"

[deployment]
run = ["npm", "run", "build"]
deploymentTarget = "cloudrun"
```

### 4. Install Dependencies
Replit will auto-run `npm install` on first load.

If not:
- Open Shell (bottom)
- Run: `npm install`

### 5. Add Environment Variables
Click "Secrets" (lock icon in sidebar):
```
VITE_SUPABASE_URL = your_supabase_url_here
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key_here
```

### 6. Run Development Server
- Click green "Run" button
- App will open in Replit's webview
- Share the URL with anyone!

---

## 📱 Mobile App Deployment (NEW!)

Replit just launched mobile apps! Here's how:

### iOS & Android
1. In your Repl, click "Deploy"
2. Choose "Mobile App"
3. Follow Replit's guided setup:
   - App name: "COWC Wedding Planning"
   - Icon: Upload COWC logo
   - Primary color: #d4a574 (COWC gold)
   
4. Replit handles:
   - Native app wrapper
   - App store submission
   - Push notifications
   - Offline support

Deploy URL: Your app will be available at:
- iOS: TestFlight first, then App Store
- Android: Google Play (or direct APK)

---

## 🔥 Connect Real Database

### Supabase Setup (Free tier works!)

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Wait 2 mins for setup

2. **Run Database Schema**
   - Go to SQL Editor in Supabase
   - Copy schema from `database-schema.sql` (I'll create this next)
   - Run the SQL

3. **Get API Keys**
   - Project Settings → API
   - Copy:
     - Project URL
     - `anon` public key
   
4. **Add to Replit Secrets**
   - Paste URL and key into Replit Secrets
   - Restart app

5. **Switch from Mock to Real Data**
   - In `src/services/api.js`
   - Change `const USE_MOCK_DATA = false`
   - Done!

---

## 🎨 Customization

### Add Your Logo
Replace `public/logo.png` with your actual logo

### Update Colors
In `tailwind.config.js`:
```js
colors: {
  'cowc-gold': '#YOUR_COLOR',
  'cowc-dark': '#YOUR_DARK_COLOR',
}
```

### Upload Real Inspiration Photos
Instead of Unsplash URLs, upload to:
- Supabase Storage (built-in, free)
- Cloudinary (free tier)
- Your own server

---

## 📊 Migration Checklist

- [ ] Replit account created
- [ ] Project imported
- [ ] npm install completed
- [ ] App runs in dev mode
- [ ] Supabase project created
- [ ] Database schema loaded
- [ ] Environment variables set
- [ ] Mock data switched off
- [ ] Logo uploaded
- [ ] Test Amanda login works
- [ ] Test coordinator login works
- [ ] Test couple login works
- [ ] Mobile app deployed
- [ ] Share with Amanda for testing!

---

## 🆘 Troubleshooting

**"npm install fails"**
- Check Node version (Replit uses v18)
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**"Blank white screen"**
- Check browser console for errors
- Verify `.env` variables are set
- Make sure `npm run build` works

**"Can't connect to Supabase"**
- Check environment variables in Secrets
- Verify Supabase project is active
- Check API keys are correct

**Mobile app issues**
- Replit's mobile deployment is brand new
- Check Replit docs: https://docs.replit.com
- Join Replit Discord for support

---

## Next Steps

1. Deploy to Replit NOW (5 mins)
2. Set up Supabase (10 mins)
3. Test with real data
4. Share TestFlight link with Amanda
5. Iterate based on feedback!

You're ready to go live! 🎉
