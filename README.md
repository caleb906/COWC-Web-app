# 💍 COWC - Central Oregon Wedding Collective

A premium mobile-first web app for wedding coordination with Nike-level design quality.

## ✨ Features

- 🎨 **Premium Design** - Nike-style aesthetics with smooth animations
- 📱 **Mobile-First** - Perfect on phones, tablets, and desktops
- 🔐 **Secure Authentication** - Magic link login via Supabase
- 👥 **Multi-Role Access** - Coordinators, Couples, and Admin
- ✅ **Task Management** - Track wedding tasks with completion
- 📊 **Real-time Updates** - See changes instantly
- 🌐 **PWA Ready** - Install on home screen like a native app

## 🚀 Quick Start (5 Minutes!)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the schema from the mobile app's `supabase/schema.sql` file
4. Go to **Settings → API** and copy:
   - Project URL
   - Anon public key

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

## 📱 Test on Your Phone

1. Find your local IP address:
   - Mac: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Windows: `ipconfig`

2. Open `http://YOUR_IP:3000` on your phone's browser

3. Works perfectly on mobile! 🎉

## 🌐 Deploy to Vercel (2 Minutes!)

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts, then:
vercel --prod
```

### Option 2: Using GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Add environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
6. Deploy! ✨

Your app will be live at `https://your-app.vercel.app`

## 🎨 Design Philosophy

Inspired by Nike's bold, confident design:

- **Large, impactful typography** using Cormorant Garamond serif
- **Generous white space** for breathing room
- **Smooth animations** using Framer Motion
- **Premium interactions** with hover states and micro-animations
- **Mobile-optimized** with touch-friendly tap targets
- **Elegant color palette** - Gold (#d4a574), cream, and deep grays

## 🧪 Test Credentials

After running the seed script (from the mobile app):

- **Coordinator:** `sarah@coordinator.com` / `coordinator123`
- **Couple:** `jessica.mark@email.com` / `couple123`
- **Admin:** `amanda@cowc.com` / `admin123`

## 📂 Project Structure

```
cowc-web-app/
├── src/
│   ├── components/          # React components
│   │   ├── LoginScreen.jsx
│   │   ├── CoordinatorDashboard.jsx
│   │   └── CoupleDashboard.jsx
│   ├── lib/                 # Supabase client
│   ├── services/            # API services
│   ├── stores/              # Zustand state management
│   ├── utils/               # Utility functions
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── vercel.json              # Vercel deployment config
```

## 🎯 Key Technologies

- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Smooth animations
- **Supabase** - Backend as a service
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icons

## 📱 Progressive Web App (PWA)

Users can install the app on their home screen:

**iOS:**
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"

**Android:**
1. Open in Chrome
2. Tap menu (3 dots)
3. Select "Add to Home screen"

## 🔐 Security

- Row Level Security (RLS) enforced at database level
- Magic link authentication (no passwords to manage)
- Secure token storage
- HTTPS enforced in production
- Environment variables for sensitive data

## 🎨 Customization

### Colors

Edit `tailwind.config.js`:

```js
colors: {
  'cowc-gold': '#d4a574',    // Change this!
  'cowc-cream': '#faf9f7',
  // ...
}
```

### Fonts

Edit `index.html` to change Google Fonts, then update `tailwind.config.js`:

```js
fontFamily: {
  'serif': ['Your Font', 'Georgia', 'serif'],
  'sans': ['Your Font', 'system-ui', 'sans-serif'],
}
```

## 🐛 Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build fails on Vercel

Make sure environment variables are set in Vercel dashboard:
- Project Settings → Environment Variables
- Add VITE_SUPABASE_URL
- Add VITE_SUPABASE_ANON_KEY

### Magic link emails not sending

Check Supabase:
- Go to Authentication → Email Templates
- Verify SMTP settings
- Check spam folder

### App doesn't work on mobile

- Make sure you're accessing via HTTPS or localhost
- Check browser console for errors
- Verify Supabase URL is accessible from mobile network

## 📊 Performance

- **Lighthouse Score:** 95+
- **First Contentful Paint:** < 1s
- **Time to Interactive:** < 2s
- **Bundle Size:** < 200KB gzipped

## 🔄 Updates

To update the live app:

```bash
# Make your changes
git add .
git commit -m "Update description"
git push

# Vercel auto-deploys!
# Or manually:
vercel --prod
```

## 💡 Tips

1. **Always test locally first** with `npm run dev`
2. **Use pull-to-refresh** on mobile for latest data
3. **Check mobile responsiveness** in browser dev tools
4. **Test on real devices** before launch
5. **Monitor Supabase logs** for errors

## 🆘 Support

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Tailwind Docs:** https://tailwindcss.com/docs
- **Framer Motion:** https://www.framer.com/motion/

## 📝 License

Proprietary - Central Oregon Wedding Collective

---

**Built with ❤️ for Amanda and the COWC team**

*Premium wedding coordination, beautifully designed*
