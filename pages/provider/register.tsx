import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ProviderRegister() {
  const router = useRouter();
  const [step, setStep] = useState(1); 
  const [tpwecanId, setTpwecanId] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [contactInfo, setContactInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // --- THIS LISTENS FOR THE MAGIC LINK CLICK ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // When they click the link in their email, Supabase logs them in.
        // This detects that login and sends them to the next page!
        router.push('/provider/category-selection');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // --- STEP 1: VERIFY TPWECAN ID ---
  const handleVerifyId = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/verify-tpwecan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tpwecanId }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(data.userData);
        setContactInfo(data.userData.email || ''); 
        setStep(2); 
      } else {
        setError(data.error || 'Verification failed.');
      }
    } catch (err) {
      setError('Network error.');
    } finally { setLoading(false); }
  };

  // --- STEP 2: SEND MAGIC LINK ---
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({ email: contactInfo });
    
    if (error) {
      setError(error.message);
    } else {
      setLinkSent(true); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#0a192f] mb-2">Provider Registration</h1>
          <div className="text-4xl mb-2">🔒</div>
          <p className="text-gray-600">Verified tpwecan members only.</p>
        </div>

        <div className="bg-[#0a192f] p-8 rounded-2xl shadow-2xl text-white">
          
          {/* --- STEP 1 UI --- */}
          {step === 1 && (
            <form onSubmit={handleVerifyId}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Enter tpwecan Registration Code</label>
              <input type="text" value={tpwecanId} onChange={(e) => setTpwecanId(e.target.value)} placeholder="e.g. WCN-EB185FDB" className="w-full bg-[#162a4d] text-white p-3 rounded-lg border border-gray-700 focus:outline-none focus:border-[#ccff00]" required />
              {error && <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-4 text-sm border border-red-700">{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-[#84cc16] text-[#0a192f] font-bold py-3 rounded-lg hover:bg-[#65a30d] disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify ID'}
              </button>
            </form>
          )}

          {/* --- STEP 2 UI: SEND LINK --- */}
          {step === 2 && !linkSent && (
            <form onSubmit={handleSendLink}>
              <div className="bg-green-900/30 border border-green-500 p-3 rounded-lg mb-6 flex items-center">
                <p className="text-green-400 text-sm font-bold">Verified: {userData.fullName}</p>
              </div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Enter your Email Address</label>
              <input type="email" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="w-full bg-[#162a4d] text-white p-3 rounded-lg border border-gray-700 mb-4 focus:outline-none focus:border-[#ccff00]" required />
              {error && <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-4 text-sm border border-red-700">{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-[#84cc16] text-[#0a192f] font-bold py-3 rounded-lg hover:bg-[#65a30d] disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Secure Login Link'}
              </button>
            </form>
          )}

          {/* --- STEP 3 UI: CHECK EMAIL --- */}
          {step === 2 && linkSent && (
            <div className="text-center">
              <div className="text-5xl mb-4">📩</div>
              <h3 className="text-xl font-bold text-[#ccff00] mb-2">Check your email!</h3>
              <p className="text-gray-300 mb-6">
                We sent a secure login link to <br/>
                <span className="text-white font-bold">{contactInfo}</span>
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Click the link in the email to verify your account and continue to Category Selection.
              </p>
              <button onClick={() => setLinkSent(false)} className="text-gray-400 text-sm hover:text-white underline">
                Didn't get it? Try again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}