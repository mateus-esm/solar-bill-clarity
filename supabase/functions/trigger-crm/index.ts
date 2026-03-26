import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { leadId } = await req.json()

    if (!leadId) {
      throw new Error('A leadId is required')
    }

    // 1. Get the CRM Webhook URL from environment variables
    const webhookUrl = Deno.env.get('CRM_WEBHOOK_URL')
    
    // We don't want the function to fail just because there's no webhook URL set up yet,
    // so we log a warning and return success for the frontend logic to proceed
    if (!webhookUrl) {
      console.warn('⚠️ CRM_WEBHOOK_URL is not set up. Skipping webhook trigger.')
      return new Response(
        JSON.stringify({ success: true, message: "Webhook URL not configured, but request succeeded." }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 2. Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Fetch the Lead Data
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError)
      throw new Error('Failed to fetch lead data')
    }

    // 4. Update the lead as having requested a proposal
    await supabaseClient
      .from('leads')
      .update({ requested_proposal: true })
      .eq('id', leadId)

    // 5. Structure the payload for the CRM
    const payload = {
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        whatsapp: lead.whatsapp,
        has_solar: lead.has_solar,
      },
      analysis: lead.analysis_summary || {},
      metadata: {
        source: lead.source,
        utm_source: lead.utm_source,
        utm_medium: lead.utm_medium,
        utm_campaign: lead.utm_campaign,
        requested_at: new Date().toISOString()
      }
    }

    // 6. Send the data to the CRM Webhook
    console.log(`Sending lead ${lead.id} to CRM...`)
    const crmResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!crmResponse.ok) {
      const errorText = await crmResponse.text()
      console.error(`CRM Webhook returned ${crmResponse.status}: ${errorText}`)
      throw new Error('Failed to send lead to CRM')
    }

    console.log(`✅ Successfully sent lead ${lead.id} to CRM webhook.`)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Error in trigger-crm:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
