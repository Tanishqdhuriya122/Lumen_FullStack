import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './authcontext';

const BackgroundContext = createContext();

// Used when the user hasn't picked anything. The first layer is
// public/bg-default.jpg (add your own image there); if that file doesn't
// exist the browser skips it and the gradient underneath shows instead.
export const DEFAULT_BACKGROUND_CSS =
  "url('/bg-default.jpg'), linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #f472b6 100%)";

// A stored value is either an image URL or a raw CSS gradient string.
const toCss = (value) => {
  if (!value) return DEFAULT_BACKGROUND_CSS;
  if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return `url("${value}")`;
  return value;
};

export const BackgroundProvider = ({ children }) => {
  const { user } = useAuth();
  // One saved background per account on this browser
  const storageKey = `lumen_bg_${user?._id || 'guest'}`;
  const [background, setBackgroundState] = useState(() => localStorage.getItem(storageKey));

  useEffect(() => {
    setBackgroundState(localStorage.getItem(storageKey));
  }, [storageKey]);

  useEffect(() => {
    document.documentElement.setAttribute('data-has-bg', 'true');
    return () => document.documentElement.removeAttribute('data-has-bg');
  }, []);

  const setBackground = (value) => {
    localStorage.setItem(storageKey, value);
    setBackgroundState(value);
  };

  const resetBackground = () => {
    localStorage.removeItem(storageKey);
    setBackgroundState(null);
  };

  const css = toCss(background);

  return (
    <BackgroundContext.Provider value={{ background, css, setBackground, resetBackground }}>
      {/* Image layer */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: css,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Theme-aware tint so text stays readable on any image */}
      <div aria-hidden="true" className="fixed inset-0 -z-10" style={{ background: 'var(--bg-scrim)' }} />
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => useContext(BackgroundContext);