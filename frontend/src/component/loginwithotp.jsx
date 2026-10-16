import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../component/authcontext';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function LoginWithOtp() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(null);

  const inputRefs = useRef([]);
  const cooldownIntervalRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(cooldownIntervalRef.current);
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (!email.trim()) {
      setMessage({ text: 'Please enter your email.', type: 'error' });
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      await axios.post(`${API_BASE}/api/v1/users/send-otp`, {
        email,
        purpose: 'login',
      });
      setMessage({ text: 'Code sent! Check your email.', type: 'success' });
      setStep('otp');
      startCooldown();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setMessage({ text: errMsg, type: 'error' });
      const match = errMsg.match(/wait (\d+)s/);
      if (match) {
        setStep('otp');
        setCooldown(parseInt(match[1], 10));
      }
    } finally {
      setSending(false);
    }
  };

  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pasted)) return;
    e.preventDefault();
    const digits = pasted.slice(0, OTP_LENGTH).split('');
    const next = Array(OTP_LENGTH).fill('');
    digits.forEach((d, i) => (next[i] = d));
    setOtpDigits(next);
    inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== OTP_LENGTH) {
      setMessage({ text: 'Please enter the full 6-digit code.', type: 'error' });
      return;
    }

    setVerifying(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API_BASE}/api/v1/users/login-with-otp`, { email, otp });

      localStorage.setItem('token', res.data.data.accessToken);
      localStorage.setItem('refreshToken', res.data.data.refreshToken);
      login(res.data.data.user);

      setMessage({ text: 'Logged in! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Invalid or expired code.', type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  const changeEmail = () => {
    setStep('email');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setMessage(null);
    clearInterval(cooldownIntervalRef.current);
    setCooldown(0);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-4">
      <div className="bg-surface p-8 rounded-xl shadow-xl space-y-6 max-w-md w-full border border-border">
        <h2 className="text-2xl font-bold text-center">
          {step === 'email' ? 'Log in with Email OTP' : 'Enter your code'}
        </h2>

        {message && (
          <p className={`text-sm text-center ${message.type === 'error' ? 'text-danger' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}

        {step === 'email' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2 bg-surface-light text-text-primary border border-border rounded"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className={`w-full py-2 rounded font-semibold transition ${
                sending ? 'bg-surface-light text-text-primary cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-on-primary'
              }`}
            >
              {sending ? 'Sending...' : 'Send Code'}
            </button>
            <p className="text-center text-sm text-text-secondary">
              Prefer a password? <Link to="/login" className="text-accent hover:opacity-80 transition">Log in normally</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-text-secondary text-center">
              Code sent to <span className="font-medium">{email}</span>
            </p>

            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-semibold bg-surface-light border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={verifying}
              className={`w-full py-2 rounded font-semibold transition ${
                verifying ? 'bg-surface-light text-text-primary cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-on-primary'
              }`}
            >
              {verifying ? 'Verifying...' : 'Log In'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={changeEmail} className="text-text-secondary hover:text-text-primary">
                ← Change email
              </button>
              <button
                type="button"
                onClick={sendOtp}
                disabled={sending || cooldown > 0}
                className={`font-medium ${
                  sending || cooldown > 0 ? 'text-text-muted cursor-not-allowed' : 'text-accent hover:opacity-80 transition'
                }`}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}