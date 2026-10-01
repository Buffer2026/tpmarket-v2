import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tpwecanId } = req.body;
  console.log('🔍 Searching for ID:', tpwecanId);

  if (!tpwecanId) {
    return res.status(400).json({ error: 'TPwecan ID is required' });
  }

  try {
    const supabase = createClient(
      process.env.TPWECAN_SUPABASE_URL,
      process.env.TPWECAN_SUPABASE_SERVICE_KEY
    );

    // First, let's see all columns in the profiles table
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('*')
      .limit(2);
    
    console.log('📊 Sample profiles:', allProfiles);
    console.log(' All profiles error:', allError);

    // Now search for the specific user
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('referral_code', tpwecanId)
      .single();

    console.log('✅ Found user:', user);
    console.log('❌ User error:', userError);

    if (userError || !user) {
      return res.status(404).json({ 
        error: 'Member ID not found. Please check your WCN ID.',
        debug: { searchedFor: tpwecanId, error: userError?.message }
      });
    }

    // Check payment
    const { data: levy, error: levyError } = await supabase
      .from('monthly_levies')
      .select('amount')
      .eq('user_id', user.id)
      .gte('amount', 1000)
      .limit(1);

    console.log('💰 Levy check:', levy);

    if (levyError || !levy || levy.length === 0) {
      return res.status(403).json({ 
        error: 'You must have paid at least ₦1,000 cooperative levy to register on TP Market.' 
      });
    }

    return res.status(200).json({
      success: true,
      userData: {
        fullName: user.full_name,
        phone: user.phone_number,
        email: user.email || 'Email not found'
      }
    });

  } catch (err) {
    console.error('💥 Fatal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}