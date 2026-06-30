export const APP_NAME = 'Founder Weekly Growth Report'
export const APP_DESCRIPTION = 'Weekly business growth reports for ecommerce founders'
export const DEFAULT_CURRENCY = 'PKR'
export const TRIAL_DAYS = 7

export const BUSINESS_TYPES = [
  'Ecommerce',
  'Dropshipping',
  'Retail',
  'Wholesale',
  'Services',
  'SaaS',
  'Other',
] as const

export const COUNTRIES = [
  'Pakistan',
  'India',
  'UAE',
  'Saudi Arabia',
  'USA',
  'UK',
  'Canada',
  'Other',
] as const

export const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
] as const

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned',
] as const

export const COD_STATUSES = [
  'Pending',
  'Confirmed',
  'Rejected',
  'N/A',
] as const

export const PAYMENT_METHODS = [
  'COD',
  'Bank Transfer',
  'Credit Card',
  'JazzCash',
  'EasyPaisa',
  'Other',
] as const

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Converted',
  'Lost',
] as const

export const AD_PLATFORMS = [
  'Meta',
  'Google',
  'TikTok',
  'Other',
] as const

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const
