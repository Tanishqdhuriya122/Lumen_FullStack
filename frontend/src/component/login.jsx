import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../component/authcontext';

export default function Login() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
  
      const contentType = res.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const result = isJson ? await res.json() : {};
  
      if (!res.ok) {
        throw new Error();
      }
  
      localStorage.setItem('token', result.data.accessToken);
      localStorage.setItem('refreshToken', result.data.refreshToken);
      login(result.data.user);
      navigate('/');
    } catch {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md bg-surface p-6 sm:p-8 rounded-2xl shadow-xl shadow-black/30 border border-border">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">Welcome back</h2>
          <p className="text-sm text-text-muted mt-1">Log in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              required
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5 font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                required
                onChange={handleChange}
                className="w-full px-4 py-2.5 pr-14 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-accent hover:text-primary-hover transition-colors"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-semibold py-2.5 rounded-full hover:bg-primary-hover transition-colors"
          >
            Log In
          </button>
        </form>

        {/* NEW: link to OTP-based login */}
        <p className="text-sm text-center mt-4">
          <Link to="/login-otp" className="text-accent hover:text-primary-hover font-medium transition-colors">
            Log in with email code instead
          </Link>
        </p>

        <p className="text-sm text-text-secondary mt-5 text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent hover:text-primary-hover font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}