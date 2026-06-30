import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function graphGet(url: string) {
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json
}

function getActions(actions: any[] = [], type: string) {
  return actions.find((a: any) => a.action_type === type)?.value || 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const datePreset = searchParams.get('preset') || 'last_30_days'
  const since = searchParams.get('since') || ''
  const until = searchParams.get('until') || ''

  // Get token — try Supabase first, fall back to header
  let token = req.headers.get('x-meta-token') || ''
  let adAccountId = req.headers.get('x-meta-account') || ''

  if (!token) {
    try {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: member } = await supabase
          .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
        if (member) {
          const { data: conn } = await supabase
            .from('integration_connections')
            .select('access_token_encrypted, ad_account_id')
            .eq('workspace_id', member.workspace_id)
            .eq('provider', 'meta')
            .eq('status', 'connected')
            .single()
          if (conn) { token = conn.access_token_encrypted; adAccountId = conn.ad_account_id || '' }
        }
      }
    } catch {}
  }

  if (!token) return NextResponse.json({ error: 'Meta not connected', demo: true }, { status: 400 })

  const dateParam = since && until
    ? `time_range={"since":"${since}","until":"${until}"}`
    : `date_preset=${datePreset}`

  try {
    // 1. Fetch ad accounts if not already known
    if (!adAccountId) {
      const accounts = await graphGet(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${token}`)
      adAccountId = accounts.data?.[0]?.id || ''
    }
    if (!adAccountId) throw new Error('No ad account found')

    const base = `https://graph.facebook.com/v19.0/${adAccountId}`
    const insightFields = 'spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values,cost_per_action_type'

    // 2. Account-level insights
    const accountInsights = await graphGet(
      `${base}/insights?fields=${insightFields}&${dateParam}&access_token=${token}`
    )
    const ai = accountInsights.data?.[0] || {}

    // 3. Campaigns with insights
    const campaigns = await graphGet(
      `${base}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time&` +
      `insights.fields(${insightFields})&${dateParam}&access_token=${token}&limit=50`
    )

    // 4. Ad sets
    const adsets = await graphGet(
      `${base}/adsets?fields=id,name,status,campaign_id,daily_budget,targeting,optimization_goal,billing_event&` +
      `insights.fields(${insightFields})&${dateParam}&access_token=${token}&limit=100`
    )

    // 5. Ads with creative thumbnails
    const ads = await graphGet(
      `${base}/ads?fields=id,name,status,adset_id,campaign_id,` +
      `creative{id,name,thumbnail_url,image_url,body,title,object_story_spec}&` +
      `insights.fields(${insightFields})&${dateParam}&access_token=${token}&limit=100`
    )

    // Normalise helper
    function normalizeInsights(raw: any) {
      const ins = raw?.insights?.data?.[0] || {}
      const actions = ins.actions || []
      const actionValues = ins.action_values || []
      return {
        spend: Number(ins.spend || 0),
        impressions: Number(ins.impressions || 0),
        clicks: Number(ins.clicks || 0),
        ctr: Number(ins.ctr || 0),
        cpc: Number(ins.cpc || 0),
        cpm: Number(ins.cpm || 0),
        reach: Number(ins.reach || 0),
        frequency: Number(ins.frequency || 0),
        purchases: Number(getActions(actions, 'purchase') || getActions(actions, 'offsite_conversion.fb_pixel_purchase')),
        revenue: Number(getActions(actionValues, 'purchase') || getActions(actionValues, 'offsite_conversion.fb_pixel_purchase')),
        addToCart: Number(getActions(actions, 'add_to_cart') || getActions(actions, 'offsite_conversion.fb_pixel_add_to_cart')),
        leads: Number(getActions(actions, 'lead')),
      }
    }

    const totalInsights = (() => {
      const actions = ai.actions || []
      const actionValues = ai.action_values || []
      return {
        spend: Number(ai.spend || 0),
        impressions: Number(ai.impressions || 0),
        clicks: Number(ai.clicks || 0),
        ctr: Number(ai.ctr || 0),
        cpc: Number(ai.cpc || 0),
        cpm: Number(ai.cpm || 0),
        reach: Number(ai.reach || 0),
        purchases: Number(getActions(actions, 'purchase') || getActions(actions, 'offsite_conversion.fb_pixel_purchase')),
        revenue: Number(getActions(actionValues, 'purchase') || getActions(actionValues, 'offsite_conversion.fb_pixel_purchase')),
        addToCart: Number(getActions(actions, 'add_to_cart')),
        leads: Number(getActions(actions, 'lead')),
      }
    })()

    return NextResponse.json({
      adAccountId,
      totalInsights,
      campaigns: (campaigns.data || []).map((c: any) => ({
        id: c.id, name: c.name, status: c.status, objective: c.objective,
        dailyBudget: Number(c.daily_budget || 0) / 100,
        lifetimeBudget: Number(c.lifetime_budget || 0) / 100,
        insights: normalizeInsights(c),
      })),
      adsets: (adsets.data || []).map((a: any) => ({
        id: a.id, name: a.name, status: a.status, campaignId: a.campaign_id,
        dailyBudget: Number(a.daily_budget || 0) / 100,
        optimizationGoal: a.optimization_goal,
        insights: normalizeInsights(a),
      })),
      ads: (ads.data || []).map((a: any) => ({
        id: a.id, name: a.name, status: a.status, adsetId: a.adset_id, campaignId: a.campaign_id,
        creative: {
          thumbnailUrl: a.creative?.thumbnail_url || '',
          imageUrl: a.creative?.image_url || '',
          title: a.creative?.title || a.creative?.object_story_spec?.link_data?.name || '',
          body: a.creative?.body || a.creative?.object_story_spec?.link_data?.message || '',
        },
        insights: normalizeInsights(a),
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
