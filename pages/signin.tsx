import { useState, useRef, useEffect, FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import PageShell from '../components/PageShell';
import LandingNavbar from '../components/LandingNavbar';
import { createSession } from '../lib/auth';

type Step = 'identify' | 'otp' | 'success';

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

function maskIdentifier(value: string) {
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    if (!domain) return value;
    const visible = user.slice(0, 3);
    return `${visible}***@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('234')) local = local.slice(3);
  else if (local.startsWith('0')) local = local.slice(1);
  const prefix = local.slice(0, 3);
  return prefix ? `+234 ${prefix} *** ****` : value;
}

export default function SignIn() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== 'otp') return;
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [step, resendIn]);

  function resetAll() {
    setStep('identify');
    setIdentifier('');
    setIdentifierError('');
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError(false);
    setResendIn(RESEND_SECONDS);
  }

  function handleIdentifySubmit(e: FormEvent) {
    e.preventDefault();
    const value = identifier.trim();
    if (value === '') {
      setIdentifierError('Enter your registered phone number or email to continue.');
      return;
    }
    setIdentifierError('');
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError(false);
    setResendIn(RESEND_SECONDS);
    setStep('otp');
  }

  function handleResend() {
    if (resendIn > 0) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError(false);
    setResendIn(RESEND_SECONDS);
    inputRefs.current[0]?.focus();
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError(false);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => (next[i] = char));
    setOtp(next);
    setOtpError(false);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  function handleVerify(e: FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setOtpError(true);
      return;
    }
    // Demo token: 123456
    if (code === '123456') {
      setOtpError(false);
      createSession(identifier);
      setStep('success');
      setTimeout(() => router.push('/marketplace'), 1500);
    } else {
      setOtpError(true);
    }
  }

  return (
    <PageShell>
      <Head>
        <title>Sign In — TPMarket</title>
      </Head>
      <LandingNavbar />

      <div className="flex flex-col items-center justify-center px-6 py-16 relative">
        <div className="w-full max-w-md bg-darkcard rounded-3xl p-8 border border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
          {step === 'identify' && (
            <form onSubmit={handleIdentifySubmit} className="space-y-5" noValidate>
              <h1 className="text-2xl font-black text-white text-center">Sign In to tpmarket</h1>
              <div>
                <label className="text-xs font-semibold text-slate mb-1.5 block">
                  Enter your registered Phone Number or Email
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setIdentifierError('');
                  }}
                  placeholder="Phone number or email"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-slate/60 focus:outline-none focus:border-lemon/50"
                />
                {identifierError && <p className="text-red-400 text-xs font-semibold mt-2">{identifierError}</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-lemon text-[#0F172A] font-black text-base py-4 rounded-xl hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(204,255,0,0.5)] transition-all"
              >
                Send 6-Digit Token
              </button>
              <p className="text-slate/60 text-[11px] text-center">
                Login required if logged out or after 24 hours.
              </p>
              <p className="text-slate text-xs text-center">
                New here?{' '}
                <Link href="/auth" className="text-lemon font-bold hover:underline">
                  Create an Account
                </Link>
              </p>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerify} className="space-y-5" noValidate>
              <button
                type="button"
                onClick={() => setStep('identify')}
                className="flex items-center gap-1.5 text-slate text-xs font-semibold hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div className="text-center">
                <h1 className="text-xl font-black text-white mb-1">Enter Your 6-Digit Token</h1>
                <p className="text-slate text-xs sm:text-sm">Sent to {maskIdentifier(identifier)}</p>
              </div>

              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-black text-white bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-lemon/50"
                  />
                ))}
              </div>
              <p className="text-slate/50 text-[10px] text-center">Demo token: 123456</p>

              {otpError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-red-300 text-sm font-semibold">That token didn&apos;t match. Try again.</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-lemon text-[#0F172A] font-black py-3.5 rounded-xl hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(204,255,0,0.5)] transition-all"
              >
                Verify &amp; Sign In
              </button>

              <p className="text-center text-xs">
                {resendIn > 0 ? (
                  <span className="text-slate/60 font-semibold">Resend Token in 0:{resendIn.toString().padStart(2, '0')}</span>
                ) : (
                  <button type="button" onClick={handleResend} className="text-lemon font-bold hover:underline">
                    Resend Token
                  </button>
                )}
              </p>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-lemon/20 text-lemon flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={26} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">You&apos;re in! ✅</h2>
              <p className="text-slate text-sm">Redirecting you to your dashboard…</p>
            </div>
          )}
        </div>

        {step === 'otp' && (
          <button
            type="button"
            onClick={resetAll}
            className="mt-6 text-[#334155] text-xs font-semibold hover:text-[#0F172A] transition-colors"
          >
            Start over
          </button>
        )}
      </div>
    </PageShell>
  );
}
