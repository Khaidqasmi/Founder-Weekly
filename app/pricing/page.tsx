import { LinkButton } from '@/components/link-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: '7 days',
    features: [
      'Full dashboard access',
      'CSV upload',
      'Manual data entry',
      'Weekly email reports',
      'Action plans',
      'Report history',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Growth',
    price: 'Contact Us',
    period: '',
    features: [
      'Everything in Free Trial',
      'Shopify integration',
      'Meta Ads integration',
      'GA4 integration',
      'Priority support',
      'Custom reports',
    ],
    cta: 'Contact Us',
    href: 'https://wa.me/923000000000',
    highlight: true,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#221c4e]">
      
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-center text-white">Simple Pricing</h1>
        <p className="mt-4 text-center text-[#a79fd6]">Start free. Upgrade when you&apos;re ready.</p>
        <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.highlight ? 'border-blue-600 border-2' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-[#a79fd6] ml-2">{plan.period}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <LinkButton href={plan.href} className="w-full mt-6" variant={plan.highlight ? 'default' : 'outline'}>{plan.cta}</LinkButton>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
