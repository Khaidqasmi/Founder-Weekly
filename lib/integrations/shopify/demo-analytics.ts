import type { ShopifyAnalytics } from './analytics'

const today = new Date()
const daysAgo = (n: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export const demoAnalytics: ShopifyAnalytics = {
  sessions: 4850,
  visitors: 3920,
  pageViews: 15520,
  addedToCart: 388,
  reachedCheckout: 194,
  purchaseSessions: 102,
  conversionRate: 2.1,
  averageOrderValue: 2850,
  totalSales: 290700,
  returningCustomerRate: 28.5,
  sessionsByDay: Array.from({ length: 14 }, (_, i) => ({
    date: daysAgo(13 - i),
    sessions: 280 + Math.round(Math.random() * 180),
    visitors: 220 + Math.round(Math.random() * 150),
    pageViews: 900 + Math.round(Math.random() * 500),
  })),
  topPages: [
    { path: '/', title: 'Home', views: 4200, sessions: 3100 },
    { path: '/collections/all', title: 'All Products', views: 3100, sessions: 2400 },
    { path: '/products/premium-t-shirt', title: 'Premium T-Shirt', views: 1850, sessions: 1420 },
    { path: '/products/hoodie-classic', title: 'Hoodie Classic', views: 1200, sessions: 980 },
    { path: '/products/jogger-pants', title: 'Jogger Pants', views: 980, sessions: 750 },
    { path: '/collections/new-arrivals', title: 'New Arrivals', views: 720, sessions: 580 },
    { path: '/products/cap-minimal', title: 'Cap Minimal', views: 650, sessions: 510 },
    { path: '/pages/about', title: 'About Us', views: 420, sessions: 380 },
    { path: '/cart', title: 'Cart', views: 388, sessions: 388 },
    { path: '/checkout', title: 'Checkout', views: 194, sessions: 194 },
  ],
  topReferrers: [
    { source: 'Facebook / Instagram', sessions: 1650, orders: 38, revenue: 108300 },
    { source: 'Google Search', sessions: 1200, orders: 28, revenue: 79800 },
    { source: 'Direct', sessions: 850, orders: 18, revenue: 51300 },
    { source: 'Google Ads', sessions: 520, orders: 10, revenue: 28500 },
    { source: 'TikTok', sessions: 320, orders: 5, revenue: 14250 },
    { source: 'WhatsApp', sessions: 180, orders: 3, revenue: 8550 },
    { source: 'Other', sessions: 130, orders: 0, revenue: 0 },
  ],
  topProducts: [
    { title: 'Premium T-Shirt', views: 1850, addedToCart: 148, purchases: 45, revenue: 67500 },
    { title: 'Hoodie Classic', views: 1200, addedToCart: 96, purchases: 28, revenue: 98000 },
    { title: 'Jogger Pants', views: 980, addedToCart: 78, purchases: 18, revenue: 50400 },
    { title: 'Cap Minimal', views: 650, addedToCart: 42, purchases: 22, revenue: 17600 },
    { title: 'Polo Shirt', views: 480, addedToCart: 24, purchases: 8, revenue: 16000 },
  ],
  deviceBreakdown: [
    { device: 'Mobile', sessions: 3298, percentage: 68 },
    { device: 'Desktop', sessions: 1310, percentage: 27 },
    { device: 'Tablet', sessions: 242, percentage: 5 },
  ],
  countryBreakdown: [
    { country: 'Pakistan', sessions: 3880, orders: 82 },
    { country: 'UAE', sessions: 420, orders: 10 },
    { country: 'Saudi Arabia', sessions: 280, orders: 6 },
    { country: 'United Kingdom', sessions: 150, orders: 3 },
    { country: 'United States', sessions: 120, orders: 1 },
  ],
  conversionFunnel: [
    { step: 'Sessions', count: 4850, rate: 100 },
    { step: 'Product Views', count: 2183, rate: 45 },
    { step: 'Added to Cart', count: 388, rate: 8 },
    { step: 'Reached Checkout', count: 194, rate: 4 },
    { step: 'Purchased', count: 102, rate: 2.1 },
  ],
}
