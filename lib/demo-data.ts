import type { Order, Ad, Lead, InventoryItem, ActionItem } from '@/lib/types'

const today = new Date()
const daysAgo = (n: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export const demoOrders: Partial<Order>[] = [
  { order_date: daysAgo(0), order_id: 'ORD-1001', customer_name: 'Ali Khan', city: 'Karachi', product_name: 'Premium T-Shirt', sku: 'TS-001', quantity: 2, selling_price: 1500, revenue: 3000, payment_method: 'COD', order_status: 'Delivered', cod_status: 'Confirmed' },
  { order_date: daysAgo(0), order_id: 'ORD-1002', customer_name: 'Sara Ahmed', city: 'Lahore', product_name: 'Hoodie Classic', sku: 'HD-001', quantity: 1, selling_price: 3500, revenue: 3500, payment_method: 'Bank Transfer', order_status: 'Delivered', cod_status: 'N/A' },
  { order_date: daysAgo(1), order_id: 'ORD-1003', customer_name: 'Usman Raza', city: 'Islamabad', product_name: 'Premium T-Shirt', sku: 'TS-001', quantity: 3, selling_price: 1500, revenue: 4500, payment_method: 'COD', order_status: 'Shipped', cod_status: 'Confirmed' },
  { order_date: daysAgo(1), order_id: 'ORD-1004', customer_name: 'Fatima Noor', city: 'Rawalpindi', product_name: 'Jogger Pants', sku: 'JP-001', quantity: 1, selling_price: 2800, revenue: 2800, payment_method: 'COD', order_status: 'Delivered', cod_status: 'Confirmed' },
  { order_date: daysAgo(2), order_id: 'ORD-1005', customer_name: 'Hassan Ali', city: 'Faisalabad', product_name: 'Cap Minimal', sku: 'CP-001', quantity: 2, selling_price: 800, revenue: 1600, payment_method: 'COD', order_status: 'Cancelled', cod_status: 'Rejected' },
  { order_date: daysAgo(2), order_id: 'ORD-1006', customer_name: 'Ayesha Malik', city: 'Multan', product_name: 'Hoodie Classic', sku: 'HD-001', quantity: 1, selling_price: 3500, revenue: 3500, payment_method: 'EasyPaisa', order_status: 'Delivered', cod_status: 'N/A' },
  { order_date: daysAgo(3), order_id: 'ORD-1007', customer_name: 'Zain Ul Abideen', city: 'Karachi', product_name: 'Premium T-Shirt', sku: 'TS-001', quantity: 1, selling_price: 1500, revenue: 1500, payment_method: 'COD', order_status: 'Delivered', cod_status: 'Confirmed' },
  { order_date: daysAgo(3), order_id: 'ORD-1008', customer_name: 'Maryam Shah', city: 'Lahore', product_name: 'Jogger Pants', sku: 'JP-001', quantity: 2, selling_price: 2800, revenue: 5600, payment_method: 'COD', order_status: 'Delivered', cod_status: 'Pending' },
  { order_date: daysAgo(4), order_id: 'ORD-1009', customer_name: 'Bilal Hussain', city: 'Peshawar', product_name: 'Cap Minimal', sku: 'CP-001', quantity: 3, selling_price: 800, revenue: 2400, payment_method: 'JazzCash', order_status: 'Delivered', cod_status: 'N/A' },
  { order_date: daysAgo(4), order_id: 'ORD-1010', customer_name: 'Nadia Farooq', city: 'Sialkot', product_name: 'Premium T-Shirt', sku: 'TS-001', quantity: 1, selling_price: 1500, revenue: 1500, payment_method: 'COD', order_status: 'Returned', cod_status: 'Confirmed' },
  { order_date: daysAgo(5), order_id: 'ORD-1011', customer_name: 'Kamran Yousuf', city: 'Quetta', product_name: 'Hoodie Classic', sku: 'HD-001', quantity: 1, selling_price: 3500, revenue: 3500, payment_method: 'COD', order_status: 'Delivered', cod_status: 'Confirmed' },
  { order_date: daysAgo(5), order_id: 'ORD-1012', customer_name: 'Rana Waqas', city: 'Gujranwala', product_name: 'Jogger Pants', sku: 'JP-001', quantity: 1, selling_price: 2800, revenue: 2800, payment_method: 'COD', order_status: 'Cancelled', cod_status: 'Rejected' },
  { order_date: daysAgo(6), order_id: 'ORD-1013', customer_name: 'Sana Javed', city: 'Karachi', product_name: 'Premium T-Shirt', sku: 'TS-001', quantity: 2, selling_price: 1500, revenue: 3000, payment_method: 'Bank Transfer', order_status: 'Delivered', cod_status: 'N/A' },
  { order_date: daysAgo(6), order_id: 'ORD-1014', customer_name: 'Imran Aslam', city: 'Lahore', product_name: 'Cap Minimal', sku: 'CP-001', quantity: 4, selling_price: 800, revenue: 3200, payment_method: 'COD', order_status: 'Delivered', cod_status: 'Confirmed' },
]

export const demoAds: Partial<Ad>[] = [
  { date: daysAgo(0), platform: 'Meta', campaign_name: 'Summer Sale', ad_set_name: 'Karachi 18-35', ad_name: 'Video Ad 1', ad_spend: 5000, impressions: 25000, reach: 18000, clicks: 850, purchases: 4, purchase_revenue: 12000 },
  { date: daysAgo(1), platform: 'Meta', campaign_name: 'Summer Sale', ad_set_name: 'Karachi 18-35', ad_name: 'Video Ad 1', ad_spend: 4500, impressions: 22000, reach: 16000, clicks: 780, purchases: 3, purchase_revenue: 9000 },
  { date: daysAgo(2), platform: 'Meta', campaign_name: 'Summer Sale', ad_set_name: 'Lahore 18-35', ad_name: 'Image Ad 1', ad_spend: 3800, impressions: 19000, reach: 14000, clicks: 620, purchases: 2, purchase_revenue: 7000 },
  { date: daysAgo(3), platform: 'Meta', campaign_name: 'Retargeting', ad_set_name: 'Website Visitors', ad_name: 'Carousel Ad', ad_spend: 2500, impressions: 12000, reach: 8000, clicks: 450, purchases: 3, purchase_revenue: 10500 },
  { date: daysAgo(4), platform: 'Google', campaign_name: 'Brand Search', ad_set_name: 'Brand Keywords', ad_name: 'Text Ad 1', ad_spend: 1800, impressions: 8000, reach: 6000, clicks: 340, purchases: 2, purchase_revenue: 6500 },
  { date: daysAgo(5), platform: 'Meta', campaign_name: 'Summer Sale', ad_set_name: 'All Pakistan', ad_name: 'Video Ad 2', ad_spend: 6000, impressions: 30000, reach: 22000, clicks: 950, purchases: 5, purchase_revenue: 15000 },
  { date: daysAgo(6), platform: 'Meta', campaign_name: 'Retargeting', ad_set_name: 'Add to Cart', ad_name: 'Dynamic Ad', ad_spend: 3000, impressions: 15000, reach: 10000, clicks: 520, purchases: 4, purchase_revenue: 14000 },
]

export const demoLeads: Partial<Lead>[] = [
  { date: daysAgo(0), lead_source: 'Instagram', lead_name: 'Ahmed Raza', lead_phone: '03001234567', lead_email: 'ahmed@test.com', lead_status: 'New', lead_value: 5000, follow_up_status: 'Pending' },
  { date: daysAgo(1), lead_source: 'Facebook', lead_name: 'Hina Qadir', lead_phone: '03211234567', lead_email: 'hina@test.com', lead_status: 'Contacted', lead_value: 8000, follow_up_status: 'Done' },
  { date: daysAgo(2), lead_source: 'WhatsApp', lead_name: 'Tariq Mehmood', lead_phone: '03451234567', lead_email: 'tariq@test.com', lead_status: 'Qualified', lead_value: 12000, follow_up_status: 'Pending' },
  { date: daysAgo(3), lead_source: 'Website', lead_name: 'Zara Sheikh', lead_phone: '03001112233', lead_email: 'zara@test.com', lead_status: 'New', lead_value: 3500, follow_up_status: 'Pending' },
  { date: daysAgo(5), lead_source: 'Instagram', lead_name: 'Hamza Ali', lead_phone: '03331234567', lead_email: 'hamza@test.com', lead_status: 'Converted', lead_value: 15000, follow_up_status: 'Done' },
]

export const demoInventory: Partial<InventoryItem>[] = [
  { product_name: 'Premium T-Shirt', sku: 'TS-001', current_stock: 45, reorder_level: 20, selling_price: 1500, cost_price: 600 },
  { product_name: 'Hoodie Classic', sku: 'HD-001', current_stock: 12, reorder_level: 15, selling_price: 3500, cost_price: 1400 },
  { product_name: 'Jogger Pants', sku: 'JP-001', current_stock: 8, reorder_level: 10, selling_price: 2800, cost_price: 1100 },
  { product_name: 'Cap Minimal', sku: 'CP-001', current_stock: 60, reorder_level: 25, selling_price: 800, cost_price: 250 },
  { product_name: 'Polo Shirt', sku: 'PS-001', current_stock: 3, reorder_level: 10, selling_price: 2000, cost_price: 800 },
]

export const demoActions: Partial<ActionItem>[] = [
  { action: 'Restock Polo Shirt — only 3 left', category: 'Inventory', priority: 'High', reason: 'Stock below reorder level', expected_impact: 'Avoid stockout and lost sales', owner: 'Operations', deadline: daysAgo(-2), status: 'Pending' },
  { action: 'Follow up with 2 pending leads', category: 'Sales', priority: 'High', reason: '2 qualified leads waiting', expected_impact: 'Close Rs 15,500 in pipeline', owner: 'Sales', deadline: daysAgo(-1), status: 'Pending' },
  { action: 'Pause underperforming Lahore ad set', category: 'Marketing', priority: 'Medium', reason: 'ROAS below 1.5x', expected_impact: 'Save Rs 3,800/week', owner: 'Marketing', deadline: daysAgo(-3), status: 'Pending' },
  { action: 'Restock Jogger Pants — 8 left', category: 'Inventory', priority: 'Medium', reason: 'Approaching reorder level', expected_impact: 'Prevent stockout', owner: 'Operations', deadline: daysAgo(-5), status: 'In Progress' },
  { action: 'Review COD rejection reasons', category: 'Operations', priority: 'Low', reason: '2 COD rejections this week', expected_impact: 'Improve confirmation rate', owner: 'Operations', deadline: daysAgo(-7), status: 'Pending' },
]
