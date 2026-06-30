# Founder Weekly Growth Report

Weekly business growth reports for ecommerce founders. Track revenue, orders, ads, COD confirmations, top products, low stock items, and next actions in one clean dashboard.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase Postgres
- **Auth**: Supabase Auth with Row Level Security
- **Email**: Resend (transactional)
- **Charts**: Recharts
- **CSV**: PapaParse
- **Deployment**: Vercel + Vercel Cron

## Features (Version 1)

- Public demo dashboard (no login required)
- User signup with 7-day free trial
- Workspace creation and onboarding
- Manual data entry (orders, ads, leads, inventory, actions)
- CSV upload with preview and validation
- Real-time dashboard with KPIs, charts, and tables
- Weekly report generation
- Email reports via Resend
- Automated weekly cron job (Monday 9 AM)
- Action plan management
- Admin CRM with lead scoring
- Settings and billing pages
- Integration placeholders (Shopify, Meta, GA4, WhatsApp, Stripe)

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- Supabase account (free tier works)
- Resend account (for emails)

### 1. Install Dependencies

```bash
cd founder-weekly
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration files in order:
   - `supabase/migrations/001_create_tables.sql` — Creates all 16 tables
   - `supabase/migrations/002_rls_policies.sql` — Enables Row Level Security
3. Go to Project Settings > API to get your keys

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=re_your_resend_key
EMAIL_FROM=reports@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=generate_a_random_string_here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create Test User

1. Go to `/signup` and create an account
2. Complete onboarding — choose "Use demo data" to seed sample data
3. Your dashboard will populate with demo orders, ads, leads, inventory, and actions

### 6. Set Up Admin User

Run this SQL in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

Then visit `/admin` to see the Admin CRM.

## CSV Upload

### Sample Files

Download sample CSVs from the app at `/data/upload` or from `public/sample-csv/`:

- `orders-sample.csv` — Required columns: `order_date`, `product_name`, `quantity`, `selling_price`
- `ads-sample.csv` — Required columns: `date`, `campaign_name`, `ad_spend`
- `leads-sample.csv` — Required columns: `date`, `lead_name`
- `inventory-sample.csv` — Required columns: `product_name`, `current_stock`, `reorder_level`

### Upload Process

1. Go to Dashboard > CSV Upload
2. Select upload type (Orders, Ads, Leads, or Inventory)
3. Choose your CSV file
4. Review the preview and check for errors
5. Click "Upload All Rows"
6. Dashboard updates automatically

## Report Generation

### Manual Report

1. Go to Dashboard > Reports
2. Select week start and end dates
3. Click "Generate Report"
4. View report details
5. Click "Send Email" to email the report

### Automated Weekly Report

The cron job runs every Monday at 9 AM UTC via Vercel Cron.

To test the cron endpoint locally:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/weekly-report
```

## Email Setup

1. Create a [Resend](https://resend.com) account
2. Add and verify your domain
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env.local`
4. Test by generating a report and clicking "Send Email"

If email is not configured, reports will still generate and save — email sending will log a failure with a clear error message.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. Deploy on Vercel

1. Import your repo at [vercel.com](https://vercel.com)
2. Set all environment variables from `.env.example`
3. Deploy

### 3. Cron Job

The `vercel.json` file configures the weekly cron:

```json
{
  "crons": [{
    "path": "/api/cron/weekly-report",
    "schedule": "0 9 * * 1"
  }]
}
```

This runs every Monday at 9 AM UTC. Vercel Cron requires a Pro plan.

### 4. Connect Supabase

Make sure your Supabase project allows connections from Vercel's IP ranges, or use the default settings which allow all connections.

## Admin CRM

Access at `/admin` (requires admin role).

### Lead Scoring

- **High**: User uploaded CSV AND generated a report
- **Medium**: User signed up and has a workspace
- **Low**: User only signed up

### Admin Actions

- View all users and their workspaces
- See trial status (Active, Expired, Upgraded)
- Check if user uploaded data, generated reports, or received emails
- Add notes to any workspace
- Track contact status

## Future API Integrations (Version 2)

Integration stubs are ready in `lib/integrations/`:

| Integration | Status | Required Env Vars |
|------------|--------|-------------------|
| Shopify | Blocked — needs credentials | `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` |
| Meta Ads | Blocked — needs credentials | `META_APP_ID`, `META_APP_SECRET` |
| GA4 | Blocked — needs credentials | `GA4_CLIENT_ID`, `GA4_CLIENT_SECRET` |
| WhatsApp | Blocked — needs credentials | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| Stripe | Blocked — needs credentials | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

## Troubleshooting

### "Your project's URL and API key are required"
Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`.

### RLS Policy Errors
If you get "new row violates row-level security policy", make sure:
1. The user is authenticated
2. The user is a member of the workspace they're trying to access
3. The migration `002_rls_policies.sql` was run successfully

### Email Not Sending
1. Check `RESEND_API_KEY` and `EMAIL_FROM` are set
2. Make sure your domain is verified in Resend
3. Check `report_email_logs` table for error messages

### Cron Not Running
1. Verify `CRON_SECRET` matches between env vars and the request header
2. Test manually: `curl -H "Authorization: Bearer YOUR_SECRET" YOUR_URL/api/cron/weekly-report`
3. Vercel Cron requires Pro plan

## Database Schema

16 tables: `profiles`, `workspaces`, `workspace_members`, `trial_subscriptions`, `orders`, `ads`, `leads`, `inventory`, `action_items`, `reports`, `report_email_logs`, `csv_uploads`, `admin_notes`, `integration_connections`, `integration_sync_logs`

See `supabase/migrations/001_create_tables.sql` for full schema.

## Known Limitations

- No payment processing in V1 (upgrade via WhatsApp contact)
- No Supabase Realtime subscriptions (uses 30-second polling fallback)
- API integrations are placeholder stubs until credentials are provided
- Single workspace per user in V1
- No password reset flow (use Supabase dashboard)
