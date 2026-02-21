# AIRTABLE BASE SETUP GUIDE

## Step 1: Create New Base

1. Go to https://airtable.com
2. Create account (free tier is perfect)
3. Click "Add a base" → "Start from scratch"
4. Name it: **COWC Wedding Planning**

---

## Step 2: Create Tables & Fields

### TABLE 1: Weddings

**Fields:**
- `Couple Name` (Single line text) - PRIMARY
- `Couple User ID` (Single line text)
- `Wedding Date` (Date)
- `Ceremony Time` (Single line text)
- `Venue Name` (Single line text)
- `Venue Address` (Long text)
- `Guest Count` (Number)
- `Budget` (Currency)
- `Status` (Single select: Planning, Active, Completed, Cancelled)
- `Notes` (Long text)
- `Theme Primary Color` (Single line text) - e.g. #d4a574
- `Theme Secondary Color` (Single line text)
- `Theme Accent Color` (Single line text)
- `Theme Vibe` (Single select: Romantic Garden, Modern Bohemian, Classic Elegant, Rustic Charm, Mountain Elegant, Beach Chic, Urban Modern, Vintage Glam, Desert Luxe, Autumn Romance)
- `Inspiration Photos` (Attachment) - Upload multiple
- `Created At` (Created time)
- `Updated At` (Last modified time)

### TABLE 2: Users

**Fields:**
- `Full Name` (Single line text) - PRIMARY
- `Email` (Email)
- `Phone` (Phone number)
- `Role` (Single select: admin, coordinator, couple)
- `Password Hash` (Single line text) - Leave empty for now
- `Status` (Single select: Active, Pending, Inactive)
- `Created At` (Created time)

### TABLE 3: Tasks

**Fields:**
- `Title` (Single line text) - PRIMARY
- `Description` (Long text)
- `Wedding` (Link to Weddings table)
- `Due Date` (Date)
- `Completed` (Checkbox)
- `Completed At` (Date)
- `Assigned To` (Single select: couple, coordinator)
- `Created At` (Created time)

### TABLE 4: Vendors

**Fields:**
- `Name` (Single line text) - PRIMARY
- `Category` (Single select: photographer, videographer, florist, caterer, band, dj, baker, hair_makeup, planner, venue, transportation, rentals, other)
- `Wedding` (Link to Weddings table)
- `Contact Email` (Email)
- `Phone` (Phone number)
- `Website` (URL)
- `Notes` (Long text)
- `Created At` (Created time)

### TABLE 5: Timeline Items

**Fields:**
- `Title` (Single line text) - PRIMARY
- `Wedding` (Link to Weddings table)
- `Time` (Single line text) - e.g. "14:00"
- `Description` (Long text)
- `Order` (Number) - For sorting
- `Created At` (Created time)

### TABLE 6: Coordinator Assignments

**Fields:**
- `Wedding` (Link to Weddings table)
- `Coordinator` (Link to Users table)
- `Is Lead` (Checkbox)
- `Assigned At` (Created time)

### TABLE 7: Internal Notes

**Fields:**
- `Title` (Single line text) - PRIMARY
- `Content` (Long text)
- `Wedding` (Link to Weddings table) - Optional
- `Created By` (Link to Users table)
- `Tags` (Multiple select: urgent, follow-up, budget, venue, vendor, couple-request, other)
- `Shared With Amanda` (Checkbox)
- `Created At` (Created time)

### TABLE 8: Change Logs

**Fields:**
- `Description` (Single line text) - PRIMARY
- `Wedding` (Link to Weddings table)
- `Changed By` (Link to Users table)
- `Change Type` (Single select: task_completed, vendor_added, timeline_updated, wedding_created, assignment_changed)
- `Entity Type` (Single select: task, vendor, timeline, wedding, assignment)
- `Entity ID` (Single line text)
- `Created At` (Created time)

---

## Step 3: Add Sample Data

### Add these sample weddings to test:

**Wedding 1:**
- Couple Name: Jessica & Mark
- Wedding Date: 2026-06-15
- Venue Name: Sunriver Resort
- Theme Primary: #d4a574
- Theme Secondary: #8b9a8f
- Theme Vibe: Romantic Garden
- Status: Active

**Wedding 2:**
- Couple Name: Rachel & Tom
- Wedding Date: 2026-08-22
- Venue Name: Tumalo Falls Lodge
- Theme Primary: #b4917f
- Theme Secondary: #4a5759
- Theme Vibe: Modern Bohemian
- Status: Active

**Wedding 3:**
- Couple Name: Sophia & Chris
- Wedding Date: 2026-09-10
- Venue Name: Mt. Bachelor Village
- Theme Primary: #8b9a8f
- Theme Secondary: #5d6d69
- Theme Vibe: Mountain Elegant
- Status: Planning

### Add these users:

**User 1:**
- Full Name: Amanda Smith
- Email: amanda@cowc.com
- Role: admin
- Status: Active

**User 2:**
- Full Name: Sarah Johnson
- Email: sarah@cowc.com
- Role: coordinator
- Status: Active

**User 3:**
- Full Name: Jessica Miller
- Email: jessica.mark@email.com
- Role: couple
- Status: Active

---

## Step 4: Get API Credentials

1. Click your profile (top right)
2. Go to "Developer hub"
3. Click "Personal access tokens"
4. Create token with these scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
5. Copy the token (SAVE IT - you can't see it again!)

6. Get your Base ID:
   - Go to https://airtable.com/api
   - Click your base
   - In the URL, copy the part that looks like: `appXXXXXXXXXXXXXX`
   - That's your Base ID!

---

## Step 5: Share Credentials

Send me:
- ✅ Personal Access Token
- ✅ Base ID

And I'll connect the app!

---

## 💡 Pro Tips:

- **Create Views**: Make custom views like "Upcoming Weddings" or "Overdue Tasks"
- **Use Filters**: Filter by status, date, coordinator
- **Add Automations**: Get email when tasks are completed
- **Upload Photos**: Drag inspiration photos right into the Inspiration Photos field
- **Export Anytime**: Download as Excel/CSV whenever you want

Your base is now your wedding planning command center! 🎉
