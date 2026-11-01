import { supabase } from '@/utils/supabase'

// Route is hit by the Vercel Cron Job (see vercel.json) to keep the Supabase
// free-tier project from auto-pausing after 7 days of inactivity.
// No auth required: it must be callable by Vercel's cron runner.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (error) {
      return Response.json({ ok: false }, { status: 503 })
    }

    return Response.json({ ok: true, ts: Date.now() })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
