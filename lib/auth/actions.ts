'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TRIAL_DAYS } from '@/lib/constants'

export async function signUp(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const country = formData.get('country') as string
  const businessName = formData.get('business_name') as string
  const businessType = formData.get('business_type') as string
  const website = formData.get('website') as string

  if (!email || !password || !fullName || !businessName) {
    return { error: 'Please fill in all required fields.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Signup failed. Please try again.' }
  }

  const serviceClient = createServiceRoleClient()
  const userId = authData.user.id

  const { error: profileError } = await serviceClient
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName,
      email,
      phone,
      country,
      role: 'user',
    })

  if (profileError) {
    return { error: 'Failed to create profile: ' + profileError.message }
  }

  const { data: workspace, error: wsError } = await serviceClient
    .from('workspaces')
    .insert({
      owner_id: userId,
      business_name: businessName,
      business_type: businessType,
      website,
      report_email: email,
    })
    .select()
    .single()

  if (wsError) {
    return { error: 'Failed to create workspace: ' + wsError.message }
  }

  await serviceClient.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'owner',
  })

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

  await serviceClient.from('trial_subscriptions').insert({
    workspace_id: workspace.id,
    status: 'active',
    trial_end: trialEnd.toISOString(),
  })

  redirect('/onboarding')
}

export async function signIn(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please enter email and password.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getUserWorkspace() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return null

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', member.workspace_id)
    .single()

  return workspace
}
