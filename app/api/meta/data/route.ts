import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'

async function graphGet(url: string) {
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json
}

async function graphGetAll(url: string, maxPages = 8) {
  const firstPage = await graphGet(url)
  const data = [...(firstPage.data || [])]
  let next = firstPage.paging?.next
  let pages = 1

  while (next && pages < maxPages) {
    const page = await graphGet(next)
    data.push(...(page.data || []))
    next = page.paging?.next
    pages += 1
  }

  return { ...firstPage, data }
}

async function fetchAdsWithCreativeMeta(base: string, encodedToken: string) {
  const videoFields = 'id,name,status,adset_id,campaign_id,creative{id,name,thumbnail_url,image_url,image_hash,body,title,video_id,object_story_id,effective_object_story_id,object_story_spec,asset_feed_spec}'
  const richFields = 'id,name,status,adset_id,campaign_id,creative{id,name,thumbnail_url,image_url,image_hash,body,title,object_story_id,effective_object_story_id,object_story_spec,asset_feed_spec}'
  const basicFields = 'id,name,status,adset_id,campaign_id,creative{id,name,thumbnail_url,image_url,image_hash,body,title,object_story_spec}'

  try {
    return await graphGetAll(`${base}/ads?fields=${videoFields}&limit=500&access_token=${encodedToken}`)
  } catch {
    try {
      return await graphGetAll(`${base}/ads?fields=${richFields}&limit=500&access_token=${encodedToken}`)
    } catch {
      return graphGetAll(`${base}/ads?fields=${basicFields}&limit=500&access_token=${encodedToken}`)
    }
  }
}

function getActions(actions: any[] = [], type: string) {
  return actions.find((a: any) => a.action_type === type)?.value || 0
}

function getAnyAction(actions: any[] = [], types: string[]) {
  for (const type of types) {
    const value = Number(getActions(actions, type))
    if (value > 0) return value
  }
  return 0
}

function normalizeInsightsRow(ins: any = {}) {
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
    purchases: getAnyAction(actions, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase']),
    revenue: getAnyAction(actionValues, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.purchase']),
    addToCart: getAnyAction(actions, ['add_to_cart', 'omni_add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart', 'onsite_conversion.add_to_cart']),
    leads: getAnyAction(actions, ['lead', 'omni_lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped']),
  }
}

function hasDelivery(insights: ReturnType<typeof normalizeInsightsRow>) {
  return (
    insights.spend > 0 ||
    insights.impressions > 0 ||
    insights.clicks > 0 ||
    insights.reach > 0 ||
    insights.purchases > 0 ||
    insights.revenue > 0 ||
    insights.addToCart > 0 ||
    insights.leads > 0
  )
}

function extractCreativeMedia(creative: any = {}) {
  const storySpec = creative.object_story_spec || {}
  const videoData = storySpec.video_data || {}
  const linkData = storySpec.link_data || {}
  const photoData = storySpec.photo_data || {}
  const assetVideo = creative.asset_feed_spec?.videos?.[0] || {}
  const assetImage = creative.asset_feed_spec?.images?.[0] || {}
  const videoId = creative.video_id || videoData.video_id || linkData.video_id || assetVideo.video_id || assetVideo.id || ''
  const imageHash = creative.image_hash || linkData.image_hash || photoData.image_hash || assetImage.hash || ''
  const storyId = creative.effective_object_story_id || creative.object_story_id || ''
  const imageUrl =
    creative.image_url ||
    linkData.picture ||
    photoData.url ||
    assetImage.url ||
    creative.thumbnail_url ||
    videoData.image_url ||
    ''

  return {
    mediaType: videoId ? 'video' : 'image',
    thumbnailUrl: creative.thumbnail_url || videoData.image_url || imageUrl,
    imageUrl,
    imageHash,
    imageSourceUrl: '',
    storyId,
    videoId,
    videoSourceUrl: '',
    videoEmbedUrl: '',
    previewUrl: '',
    permalinkUrl: '',
    title: creative.title || videoData.title || linkData.name || '',
    body: creative.body || videoData.message || linkData.message || '',
  }
}

function decodeHtmlUrl(url: string) {
  return url
    .replace(/&amp;/g, '&')
    .replace(/\\\//g, '/')
}

function iframeSrcFromHtml(html = '') {
  const match = html.match(/src=(?:"([^"]+)"|'([^']+)')/)
  return decodeHtmlUrl(match?.[1] || match?.[2] || '')
}

function videoIdFromAttachments(attachments: any) {
  const rows = attachments?.data || []
  for (const row of rows) {
    const mediaType = String(row.media_type || row.type || '').toLowerCase()
    const targetId = row.target?.id || row.media?.target?.id || ''
    if (targetId && mediaType.includes('video')) return targetId

    const subRows = row.subattachments?.data || []
    for (const sub of subRows) {
      const subType = String(sub.media_type || sub.type || '').toLowerCase()
      const subTargetId = sub.target?.id || sub.media?.target?.id || ''
      if (subTargetId && subType.includes('video')) return subTargetId
    }
  }
  return ''
}

async function fetchAdPreviewEmbed(adId: string, token: string) {
  if (!adId) return ''
  try {
    const preview = await graphGet(
      `https://graph.facebook.com/v19.0/${adId}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${encodeURIComponent(token)}`
    )
    return iframeSrcFromHtml(preview.data?.[0]?.body || '')
  } catch {
    return ''
  }
}

async function enrichCreativeMedia(media: ReturnType<typeof extractCreativeMedia>, base: string, token: string, adId: string) {
  let resolvedMedia = media

  if (!resolvedMedia.videoId && resolvedMedia.storyId) {
    try {
      const story = await graphGet(
        `https://graph.facebook.com/v19.0/${resolvedMedia.storyId}?fields=attachments{media_type,type,target,media,subattachments}&access_token=${encodeURIComponent(token)}`
      )
      const storyVideoId = videoIdFromAttachments(story.attachments)
      if (storyVideoId) {
        resolvedMedia = { ...resolvedMedia, mediaType: 'video', videoId: storyVideoId }
      }
    } catch {}
  }

  if (!resolvedMedia.videoId && resolvedMedia.imageHash) {
    try {
      const image = await graphGet(
        `${base}/adimages?hashes=${encodeURIComponent(JSON.stringify([resolvedMedia.imageHash]))}&fields=url,url_128,width,height&access_token=${encodeURIComponent(token)}`
      )
      const highRes = image.data?.[0]?.url || image.data?.[0]?.url_128 || ''

      return {
        ...resolvedMedia,
        imageSourceUrl: highRes || resolvedMedia.imageUrl,
        imageUrl: highRes || resolvedMedia.imageUrl,
      }
    } catch {
      return resolvedMedia
    }
  }

  if (!resolvedMedia.videoId) return resolvedMedia

  try {
    const video = await graphGet(
      `https://graph.facebook.com/v19.0/${resolvedMedia.videoId}?fields=source,picture,permalink_url,embed_html&access_token=${encodeURIComponent(token)}`
    )
    const embedUrl = iframeSrcFromHtml(video.embed_html || '') || await fetchAdPreviewEmbed(adId, token)

    return {
      ...resolvedMedia,
      videoSourceUrl: video.source || '',
      videoEmbedUrl: embedUrl,
      thumbnailUrl: resolvedMedia.thumbnailUrl || video.picture || '',
      previewUrl: video.permalink_url || '',
      permalinkUrl: video.permalink_url || '',
    }
  } catch {
    try {
      const fallback = await graphGet(
        `https://graph.facebook.com/v19.0/${resolvedMedia.videoId}?fields=source,picture,permalink_url&access_token=${encodeURIComponent(token)}`
      )

      return {
        ...resolvedMedia,
        videoSourceUrl: fallback.source || '',
        videoEmbedUrl: await fetchAdPreviewEmbed(adId, token),
        thumbnailUrl: resolvedMedia.thumbnailUrl || fallback.picture || '',
        previewUrl: fallback.permalink_url || '',
        permalinkUrl: fallback.permalink_url || '',
      }
    } catch {
      return {
        ...resolvedMedia,
        videoEmbedUrl: await fetchAdPreviewEmbed(adId, token),
      }
    }
  }
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return dateKey(date)
}

function metaDateParam(rawPreset: string, since: string, until: string) {
  if (since && until) {
    return `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
  }

  const preset = (rawPreset || 'last_30d').trim()
  const today = dateKey(new Date())
  const explicitRanges: Record<string, { since: string; until: string }> = {
    last_7_days: { since: daysAgo(6), until: today },
    last_7d: { since: daysAgo(6), until: today },
    last_30_days: { since: daysAgo(29), until: today },
    last_30d: { since: daysAgo(29), until: today },
    last_90_days: { since: daysAgo(89), until: today },
    last_90d: { since: daysAgo(89), until: today },
  }

  const range = explicitRanges[preset]
  if (range) {
    return `time_range=${encodeURIComponent(JSON.stringify(range))}`
  }

  const legacyPresetMap: Record<string, string> = {
    maximum: 'maximum',
    today: 'today',
    yesterday: 'yesterday',
    this_month: 'this_month',
    last_month: 'last_month',
  }

  return `date_preset=${encodeURIComponent(legacyPresetMap[preset] || preset)}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const datePreset = searchParams.get('preset') || 'last_30d'
  const since = searchParams.get('since') || ''
  const until = searchParams.get('until') || ''

  // Require a signed-in user — this route must not act as an open proxy to the Meta API
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get token — try Supabase first, fall back to header (authenticated users only)
  let token = req.headers.get('x-meta-token') || ''
  let adAccountId = req.headers.get('x-meta-account') || ''

  if (!token) {
    try {
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
        if (conn) { token = decryptToken(conn.access_token_encrypted); adAccountId = conn.ad_account_id || '' }
      }
    } catch {}
  }

  if (!token) return NextResponse.json({ error: 'Meta not connected', demo: true }, { status: 400 })

  const dateParam = metaDateParam(datePreset, since, until)

  try {
    // 1. Fetch ad accounts if not already known
    if (!adAccountId) {
      const accounts = await graphGet(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${encodeURIComponent(token)}`)
      adAccountId = accounts.data?.[0]?.id || ''
    }
    if (!adAccountId) throw new Error('No ad account found')

    const base = `https://graph.facebook.com/v19.0/${adAccountId}`
    const insightFields = 'spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values,cost_per_action_type'
    const encodedToken = encodeURIComponent(token)

    // 2. Account-level insights
    const accountInsights = await graphGet(
      `${base}/insights?fields=${insightFields}&${dateParam}&access_token=${encodedToken}`
    )
    const ai = accountInsights.data?.[0] || {}

    // Fetch object metadata separately, but only render objects that have
    // insights rows in the selected date range. This keeps paused/old ads with
    // historical stats visible while hiding creatives that did not run.
    const [campaignMeta, adsetMeta, adMeta, campaignInsights, adsetInsights, adInsights] = await Promise.all([
      graphGetAll(`${base}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=200&access_token=${encodedToken}`),
      graphGetAll(`${base}/adsets?fields=id,name,status,campaign_id,daily_budget,optimization_goal&limit=300&access_token=${encodedToken}`),
      fetchAdsWithCreativeMeta(base, encodedToken),
      graphGetAll(`${base}/insights?fields=campaign_id,campaign_name,${insightFields}&${dateParam}&level=campaign&limit=500&access_token=${encodedToken}`),
      graphGetAll(`${base}/insights?fields=adset_id,adset_name,campaign_id,${insightFields}&${dateParam}&level=adset&limit=500&access_token=${encodedToken}`),
      graphGetAll(`${base}/insights?fields=ad_id,ad_name,adset_id,campaign_id,${insightFields}&${dateParam}&level=ad&limit=500&access_token=${encodedToken}`),
    ])

    const campaignById = new Map((campaignMeta.data || []).map((c: any) => [c.id, c]))
    const adsetById = new Map((adsetMeta.data || []).map((a: any) => [a.id, a]))
    const adById = new Map((adMeta.data || []).map((a: any) => [a.id, a]))

    const campaigns = (campaignInsights.data || [])
      .map((row: any) => {
        const insights = normalizeInsightsRow(row)
        const meta: any = campaignById.get(row.campaign_id) || {}
        return {
          id: row.campaign_id,
          name: meta.name || row.campaign_name || 'Campaign',
          status: meta.status || 'UNKNOWN',
          objective: meta.objective || '',
          dailyBudget: Number(meta.daily_budget || 0) / 100,
          lifetimeBudget: Number(meta.lifetime_budget || 0) / 100,
          insights,
        }
      })
      .filter((campaign: any) => campaign.id && hasDelivery(campaign.insights))
      .sort((a: any, b: any) => b.insights.spend - a.insights.spend)

    const adsets = (adsetInsights.data || [])
      .map((row: any) => {
        const insights = normalizeInsightsRow(row)
        const meta: any = adsetById.get(row.adset_id) || {}
        return {
          id: row.adset_id,
          name: meta.name || row.adset_name || 'Ad set',
          status: meta.status || 'UNKNOWN',
          campaignId: meta.campaign_id || row.campaign_id,
          dailyBudget: Number(meta.daily_budget || 0) / 100,
          optimizationGoal: meta.optimization_goal || '',
          insights,
        }
      })
      .filter((adset: any) => adset.id && hasDelivery(adset.insights))
      .sort((a: any, b: any) => b.insights.spend - a.insights.spend)

    const adsBase = (adInsights.data || [])
      .map((row: any) => {
        const insights = normalizeInsightsRow(row)
        const meta: any = adById.get(row.ad_id) || {}
        const media = extractCreativeMedia(meta.creative)
        return {
          id: row.ad_id,
          name: meta.name || row.ad_name || 'Ad creative',
          status: meta.status || 'UNKNOWN',
          adsetId: meta.adset_id || row.adset_id,
          campaignId: meta.campaign_id || row.campaign_id,
          creative: media,
          insights,
        }
      })
      .filter((ad: any) => ad.id && hasDelivery(ad.insights))
      .sort((a: any, b: any) => b.insights.spend - a.insights.spend)

    const ads = await Promise.all(
      adsBase.map(async (ad: any) => ({
        ...ad,
        creative: await enrichCreativeMedia(ad.creative, base, token, ad.id),
      }))
    )

    const totalInsights = (() => {
      return normalizeInsightsRow(ai)
    })()

    return NextResponse.json({
      adAccountId,
      totalInsights,
      campaigns,
      adsets,
      ads,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
