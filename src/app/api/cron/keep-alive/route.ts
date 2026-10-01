import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Ensure this route is evaluated dynamically, not cached
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Optional: Secure the cron job (Vercel automatically sets CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 });
    }

    // Perform a lightweight query to keep the database active
    // We just select 1 record from categories as a ping
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Keep-alive ping failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase database pinged successfully to prevent pausing.',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
