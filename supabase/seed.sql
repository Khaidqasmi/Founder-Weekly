-- Seed script for Founder Weekly Growth Report
-- Run this AFTER creating a test user via the signup form
-- Then update their profile to admin role

-- To make a user admin, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';

-- Demo data is seeded automatically when a user chooses "Use demo data" during onboarding.
-- This script provides additional test data if needed.

-- Insert demo workspace for testing (replace USER_ID with actual user UUID)
-- INSERT INTO workspaces (owner_id, business_name, business_type, website, currency, main_goal, report_email)
-- VALUES ('USER_ID', 'Demo Store', 'Ecommerce', 'https://demostore.pk', 'PKR', 'Grow to 1M/month', 'test@example.com');

-- To seed demo data for an existing workspace, use the onboarding flow
-- or call POST /api/seed-demo with { "workspace_id": "YOUR_WORKSPACE_ID" }
