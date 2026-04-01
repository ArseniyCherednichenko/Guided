import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-needle-path',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const path = req.headers.get('x-needle-path') || ''
  const body = req.method !== 'GET' ? await req.json() : undefined
  const res = await fetch(`https://needle-ai.com/api/v1${path}`, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'x-needle-api-key': Deno.env.get('NEEDLE_API_KEY')!,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
