# FootpathFix 🏙️

> **Clear Footpaths. Safer Streets.**
>
> A citizen-driven footpath obstruction reporting and monitoring platform built to improve pedestrian accessibility and urban service efficiency.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [Step 1: Create a Supabase Project](#step-1-create-a-supabase-project)
   - [Step 2: Run the Database Schema](#step-2-run-the-database-schema)
   - [Step 3: Create the Storage Bucket](#step-3-create-the-storage-bucket)
   - [Step 4: Configure the Frontend](#step-4-configure-the-frontend)
   - [Step 5: Create Your First Administrator](#step-5-create-your-first-administrator)
   - [Step 6: (Optional) Add Sample Data](#step-6-optional-add-sample-data)
5. [Running Locally](#running-locally)
6. [Technology Stack](#technology-stack)
7. [Security Architecture](#security-architecture)
8. [Troubleshooting](#troubleshooting)

---

## Overview

FootpathFix allows citizens to:
- **Report** footpath obstructions (illegal parking, street vendors, construction debris, damaged paths, etc.)
- **Track** the status of their complaints in real time
- **Browse** all public reports with search and filter capabilities

Municipal administrators can:
- **Log in** securely via Supabase Auth
- **Review** all complaints in a management dashboard
- **Update** complaint status (Pending → In Progress → Resolved)
- **Add** internal resolution notes

---

## Features

| Feature | Description |
|---------|-------------|
| Citizen reporting | Multi-section form with validation and optional photo upload |
| Real-time stats | Live counts of total, pending, in-progress and resolved reports |
| Public report browser | Search, filter by category/status, grid and list views |
| Report detail modal | Full report details including image and resolution note |
| Admin authentication | Supabase Auth — email/password login |
| Admin role verification | Checked via `admin_users` table, never trusts client claims |
| Status management | Admins update status and add notes; changes reflect publicly immediately |
| Row Level Security | Full RLS on all Supabase tables — public cannot update or delete |
| Image storage | Photos uploaded to Supabase Storage; paths stored in DB |
| Responsive design | Mobile-first, works on all screen sizes |

---

## Project Structure

```
FootpathFix/
├── index.html              # Home page
├── report.html             # Report an issue form
├── reports.html            # Public report browser
├── admin-login.html        # Admin authentication page
├── admin-dashboard.html    # Admin management dashboard
├── .env.example            # Environment variables template
├── README.md
├── css/
│   ├── global.css          # Design system (tokens, resets, shared components)
│   ├── home.css            # Home page styles
│   ├── report.css          # Report form styles
│   ├── reports.css         # Reports browser styles
│   └── admin.css           # Admin auth and dashboard styles
├── js/
│   ├── config.js           # ← EDIT THIS: Supabase URL and anon key
│   ├── supabase-client.js  # Supabase client + shared utilities
│   ├── auth.js             # Login form + admin role check
│   ├── home.js             # Home page stats and recent reports
│   ├── report.js           # Report submission + image upload
│   ├── reports.js          # Report browser with filter/search/modal
│   └── admin.js            # Dashboard stats, table, status updates
└── supabase/
    ├── schema.sql           # Tables + RLS policies + storage policies
    └── seed.sql             # Sample data (clearly labeled as SAMPLE)
```

---

## Step-by-Step Setup Guide

### Step 1: Create a Supabase Project

1. Go to **[https://supabase.com](https://supabase.com)** and sign in (or create a free account).
2. Click **New Project**.
3. Choose your **organisation**, enter a **Project Name** (e.g., `footpathfix`), set a strong **database password** and choose a **region** closest to your users.
4. Click **Create new project** and wait ~2 minutes for provisioning.

### Step 2: Run the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar).
2. Click **+ New query**.
3. Open the file `supabase/schema.sql` from this project.
4. Copy the entire contents and paste them into the SQL Editor.
5. Click **Run** (or press `Ctrl+Enter`).
6. You should see `Success. No rows returned` — this means all tables, indexes, triggers and RLS policies were created.

> ⚠️ If you see an error about `storage.objects`, it means you need to create the storage bucket first (Step 3) and then re-run just the storage policy section of the SQL.

### Step 3: Create the Storage Bucket

1. In your Supabase dashboard, go to **Storage** (left sidebar).
2. Click **New bucket**.
3. Enter bucket name: **`report-images`** (must match exactly).
4. Toggle **Public bucket** to **ON** — this allows images to be viewed without authentication.
   > **Trade-off**: With a public bucket, anyone who knows the file path can view the image. For a civic tool where transparency is desired, this is acceptable. If you need privacy, turn off Public, and update `getImageUrl()` in `supabase-client.js` to use `createSignedUrl()` instead.
5. Click **Create bucket**.
6. Now go back to **SQL Editor** and run the storage policy statements from `supabase/schema.sql` (the lines under `-- STORAGE: report-images bucket`).

### Step 4: Configure the Frontend

1. In your Supabase dashboard, go to **Settings** → **API**.
2. Copy the **Project URL** (looks like `https://xyzabcdef.supabase.co`).
3. Copy the **anon public** key (long string — this is safe to use in browsers).
4. Open `js/config.js` in this project.
5. Replace the placeholder values:

```javascript
const SUPABASE_URL      = 'https://your-project.supabase.co';  // ← your URL
const SUPABASE_ANON_KEY = 'eyJhbGc...your-anon-key...';       // ← your anon key
```

6. Save the file.

> 🔒 **Never** use the `service_role` key in `config.js` or any file served to browsers. The service role key bypasses all RLS policies.

### Step 5: Create Your First Administrator

Admin accounts must be created securely — not via the public signup form.

**Method A: Supabase Dashboard (Recommended for setup)**

1. Go to **Authentication** → **Users** in your Supabase dashboard.
2. Click **Invite user** (or **Add user** → **Create new user**).
3. Enter the admin's email and a temporary password. Click **Create user**.
4. Note the **User UID** (UUID shown in the users list).
5. Go to **SQL Editor** and run:

```sql
insert into public.admin_users (user_id)
values ('paste-the-user-uid-here');
```

6. The administrator can now log in at `admin-login.html` with the credentials you set.

**Method B: Self-Registration + Manual Promotion**

1. Create a Supabase Auth account using the standard signup (or via dashboard).
2. Find the user's UID in Authentication → Users.
3. Run the INSERT above to grant admin access.

> ⚠️ Only existing database administrators (or someone with Supabase service-role access) can grant admin privileges. This is enforced by RLS — regular users cannot insert into `admin_users`.

### Step 6: (Optional) Add Sample Data

To populate the app with representative demo records for a presentation:

1. Open **SQL Editor** in Supabase.
2. Paste the contents of `supabase/seed.sql`.
3. Click **Run**.

All sample records are clearly prefixed with `[SAMPLE]` so they're easy to identify and delete later.

To delete all sample records:
```sql
delete from public.reports where title like '[SAMPLE]%';
```

---

## Running Locally

FootpathFix is a pure static website — no build step required.

**Option A: VS Code Live Server (Easiest)**
1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. The app opens at `http://127.0.0.1:5500`.

**Option B: Python HTTP server**
```bash
# Navigate to the FootpathFix folder
cd "d:\Vineet\Idea Lab 5\FootpathFix"

# Python 3
python -m http.server 8080

# Then open: http://localhost:8080
```

**Option C: Node.js serve**
```bash
npx serve .
# Then follow the URL shown in terminal
```

> **Note**: Opening `index.html` directly with `file://` in the browser may cause CORS errors with the Supabase SDK. Always use a local HTTP server.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS3 (custom design system) |
| Logic | Vanilla JavaScript (ES2020+) |
| Backend | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage |
| Fonts | Google Fonts (Inter + Plus Jakarta Sans) |
| Icons | Inline SVG (Lucide-style) |

---

## Security Architecture

| Concern | Implementation |
|---------|----------------|
| Admin role | Stored in `admin_users` table, never in JWT claims or localStorage |
| RLS enforcement | All tables have RLS enabled; policies enforced server-side |
| Anonymous inserts | Allowed only for `status='Pending'` and `resolution_note=null` |
| Admin updates | Only authenticated users whose UID exists in `admin_users` |
| Key security | Only the `anon` key is used in frontend code |
| Image paths | Stored as server-generated paths; arbitrary URLs rejected |
| XSS prevention | All user data escaped before rendering via `escapeHtml()` |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Supabase not configured" banner | Edit `js/config.js` with your URL and anon key |
| Reports not loading | Check browser console; verify RLS policies allow SELECT |
| Image upload fails | Ensure `report-images` bucket exists and is set to Public |
| Admin login says "not an admin" | Run the INSERT into `admin_users` for that user's UID |
| CORS error on file:// | Use a local HTTP server (VS Code Live Server / Python) |
| `row-level security` error on insert | Re-run the `schema.sql` to ensure the insert policy exists |
| Storage policy error | Create bucket first, then run the storage SQL policies |

---

*FootpathFix — An Idea Lab Project · Built for safer pedestrian spaces · 2026*
