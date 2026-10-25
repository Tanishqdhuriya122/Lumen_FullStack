import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = location.state?.email || '';

  const [email] = useState(emailFromState);
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(null);

  const inputRefs = useRef([]);
  const cooldownIntervalRef = useRef(null);

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (email) sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

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

  const sendOtp = async () => {
    setSending(true);
    setMessage(null);
    try {
      await axios.post(`${API_BASE}/api/v1/users/send-otp`, {
        email,
        purpose: 'signup',
      });
      setMessage({ text: 'A verification code has been sent to your email.', type: 'success' });
      startCooldown();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setMessage({ text: errMsg, type: 'error' });
      const match = errMsg.match(/wait (\d+)s/);
      if (match) setCooldown(parseInt(match[1], 10));
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
      await axios.post(`${API_BASE}/api/v1/users/verify-email-otp`, { email, otp });
      setMessage({ text: 'Email verified! Redirecting to login...', type: 'success' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Invalid or expired code.', type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-4">
      <form onSubmit={handleVerify} className="bg-surface p-8 rounded-xl shadow-xl space-y-6 max-w-md w-full border border-border">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Verify your email</h2>
          <p className="text-sm text-text-secondary mt-2">
            We sent a 6-digit code to <span className="font-medium">{email}</span>
          </p>
        </div>

        {message && (
          <p className={`text-sm text-center ${message.type === 'error' ? 'text-danger' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}

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
          {verifying ? 'Verifying...' : 'Verify Email'}
        </button>

        <div className="text-center text-sm text-text-secondary">
          Didn't get the code?{' '}
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
    </div>
  );
}