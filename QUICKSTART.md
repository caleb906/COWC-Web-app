# 🚀 QUICK START GUIDE - Get Live in 10 Minutes!

## ⚡ Super Fast Setup

### Step 1: Install (2 minutes)

```bash
cd Desktop/cowc-web-app
npm install
```

### Step 2: Configure Supabase (3 minutes)

1. **Go to** [supabase.com](https://supabase.com)
2. **Create account** (free)
3. **New Project** → Name it "cowc"
4. **SQL Editor** → New query
5. **Copy** the schema from the mobile app: `Desktop/cowc-app/supabase/schema.sql`
6. **Paste** and click **Run**
7. **Settings** → **API** → Copy:
   - Project URL
   - anon public key

### Step 3: Set Environment (1 minute)

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=paste-your-url-here
VITE_SUPABASE_ANON_KEY=paste-your-key-here
```

### Step 4: Test Locally (30 seconds)

```bash
npm run dev
```

Opens at http://localhost:3000 ✨

### Step 5: Deploy to Vercel (3 minutes)

```bash
# Install Vercel
npm install -g vercel

# Login
vercel login

# Deploy!
vercel --prod
```

**Done! Your app is live!** 🎉

---

## 🎯 What You Get

✅ Beautiful login screen  
✅ Coordinator dashboard  
✅ Couple dashboard with countdown  
✅ Task management  
✅ Change tracking  
✅ Works on ALL devices  
✅ Looks AMAZING on mobile  

---

## 📱 Add to Phone Home Screen

**iPhone:**
1. Open in Safari
2. Tap share icon
3. "Add to Home Screen"

**Android:**
1. Open in Chrome
2. Menu → "Add to Home screen"

Now it opens like a native app! 🎊

---

## 🧪 Test It

**After seeding database** (use mobile app seed script):

- Coordinator: `sarah@coordinator.com`
- Couple: `jessica.mark@email.com`
- Password: Use magic link or `coordinator123` / `couple123`

---

## 🆘 Having Issues?

### "Module not found"
```bash
rm -rf node_modules
npm install
```

### "Supabase connection failed"
- Check `.env` has correct values
- No trailing slashes in URL
- Restart dev server

### "Vercel build failed"
- Add environment variables in Vercel dashboard
- Project Settings → Environment Variables

---

## 🎨 Want to Customize?

**Colors:** Edit `tailwind.config.js`  
**Fonts:** Edit `index.html` Google Fonts link  
**Logo:** Edit `LoginScreen.jsx` line 85  

---

**That's it! You now have a production-ready wedding coordination app!** 💍✨
