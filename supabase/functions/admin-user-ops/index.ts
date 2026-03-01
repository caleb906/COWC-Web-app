import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is an authenticated admin/coordinator
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build a service-role client for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller's token and check their role
    const callerToken = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerErr } = await serviceClient.auth.getUser(callerToken)
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check caller is admin or coordinator
    const { data: callerProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['admin', 'coordinator'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { action, userId, email, updates } = body

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!userId) throw new Error('userId required')

      // Remove profile first (cascade may handle it, but be explicit)
      await serviceClient.from('profiles').delete().eq('id', userId)

      // Delete from auth
      const { error } = await serviceClient.auth.admin.deleteUser(userId)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── DEACTIVATE ───────────────────────────────────────────────────────────
    if (action === 'deactivate') {
      if (!userId) throw new Error('userId required')

      // Ban in auth (87600h ≈ 10 years)
      const { error } = await serviceClient.auth.admin.updateUserById(userId, {
        ban_duration: '87600h',
      })
      if (error) throw error

      // Mark in profiles
      await serviceClient.from('profiles').update({ status: 'Inactive' }).eq('id', userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── REACTIVATE ───────────────────────────────────────────────────────────
    if (action === 'reactivate') {
      if (!userId) throw new Error('userId required')

      const { error } = await serviceClient.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      })
      if (error) throw error

      await serviceClient.from('profiles').update({ status: 'Active' }).eq('id', userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── SEND_RECOVERY ────────────────────────────────────────────────────────
    if (action === 'send_recovery') {
      if (!email) throw new Error('email required')

      const appUrl = Deno.env.get('APP_URL') || 'https://app.cowc.dev'
      const { data, error } = await serviceClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/reset-password` },
      })
      if (error) throw error

      return new Response(JSON.stringify({ success: true, recoveryLink: data.properties?.action_link }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── UPDATE_PROFILE ───────────────────────────────────────────────────────
    if (action === 'update_profile') {
      if (!userId || !updates) throw new Error('userId and updates required')

      const { error } = await serviceClient
        .from('profiles')
        .update(updates)
        .eq('id', userId)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('admin-user-ops error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
