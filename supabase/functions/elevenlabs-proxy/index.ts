import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-voice-id',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const voiceId = req.headers.get('x-voice-id') || '21m00Tcm4TlvDq8ikWAM'
  const body = await req.json()
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const blob = await res.blob()
  return new Response(blob, {
    status: res.status,
    headers: { ...CORS, 'Content-Type': 'audio/mpeg' },
  })
})
