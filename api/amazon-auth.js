import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.redirect('/dashboard?error=missing_user');
  }

  // If we don't have Supabase credentials locally, we just mock success
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('[amazon-auth mock] Missing Supabase keys. Redirecting with success.');
    return res.redirect('/dashboard?amazon_linked=1');
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase
      .from('profiles')
      .update({ amazon_connected: true })
      .eq('id', userId);

    if (error) {
      console.error('Supabase update error:', error);
      return res.redirect('/dashboard?error=amazon_link_failed');
    }

    return res.redirect('/dashboard?amazon_linked=1');
  } catch (err) {
    console.error('Amazon Auth error:', err);
    return res.redirect('/dashboard?error=amazon_link_failed');
  }
}
