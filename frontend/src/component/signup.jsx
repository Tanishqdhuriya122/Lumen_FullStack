import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: null,
    coverImage: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const data = new FormData();
      data.append('fullName', formData.name);
      data.append('userName', formData.username);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('avatar', formData.avatar);
      data.append('coverImage', formData.cover);

      
      const res = await fetch(`${API_BASE}/api/v1/users/register`, {
        method: 'POST',
        body: data,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Signup failed');
      }

      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err) {
      console.error('Signup error:', err);
      alert(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4 py-10">
      <div className="w-full max-w-xl bg-surface p-6 sm:p-8 rounded-2xl shadow-xl shadow-black/30 border border-border">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">Create an Account</h2>
          <p className="text-sm text-text-muted mt-1">Join and start sharing your videos</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" encType="multipart/form-data">
          {/* Left fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">Full Name</label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">Username</label>
              <input
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="johndoe123"
                className="w-full px-4 py-2.5 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">Email Address</label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-14 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-accent hover:text-primary-hover transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">Confirm Password</label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-14 bg-surface-light text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-accent hover:text-primary-hover transition-colors"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {/* Right side - File Uploads */}
          <div className="space-y-4 flex flex-col">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">Avatar Image</label>
              <input
                type="file"
                name="avatar"
                accept="image/*"
                onChange={handleChange}
                className="w-full text-sm text-text-secondary file:bg-primary file:text-on-primary file:border-0 file:px-4 file:py-2 file:rounded-full file:mr-4 file:font-medium file:cursor-pointer hover:file:bg-primary-hover bg-surface-light border border-border rounded-lg px-3 py-2 transition-colors"
              />
              <p className="text-xs text-text-muted mt-1.5">
                Supported formats: JPG, PNG.
              </p>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5 font-medium">Cover Image</label>
              <input
                type="file"
                name="cover"
                accept="image/*"
                onChange={handleChange}
                className="w-full text-sm text-text-secondary file:bg-primary file:text-on-primary file:border-0 file:px-4 file:py-2 file:rounded-full file:mr-4 file:font-medium file:cursor-pointer hover:file:bg-primary-hover bg-surface-light border border-border rounded-lg px-3 py-2 transition-colors"
              />
              <p className="text-xs text-text-muted mt-1.5">
                Recommended size: <strong>1280 × 360</strong> pixels. Supported formats: JPG, PNG.
              </p>
            </div>

            <div className="flex-1" />

            <button
              type="submit"
              className="w-full bg-primary text-on-primary font-semibold py-2.5 rounded-full hover:bg-primary-hover transition-colors"
            >
              Sign Up
            </button>

            <p className="text-sm text-text-secondary text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-accent hover:text-primary-hover font-medium transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}