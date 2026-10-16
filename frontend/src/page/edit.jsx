import React from 'react';
import { Link } from 'react-router-dom';

export default function EditProfile() {
  return (
    <div className="min-h-screen 	bg-background text-text-primary px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <h2 className="text-3xl font-bold text-center mb-6">Edit Profile</h2>

        {/* Account Details Section */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
          <h3 className="text-xl font-semibold mb-4">Account Details</h3>
          <p className="text-text-secondary mb-2">Update your full name and email address.</p>
          <Link
            to="/edit/account"
            className="inline-block mt-2 bg-purple-600 hover:bg-purple-500 transition px-4 py-2 rounded text-text-primary font-medium"
          >
            Change
          </Link>
        </div>

        {/* Photo Upload Section */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
          <h3 className="text-xl font-semibold mb-4">Upload Photo</h3>
          <p className="text-text-secondary mb-2">Change your avatar and cover image.</p>
          <Link
            to="/edit/photo"
            className="inline-block mt-2 bg-purple-600 hover:bg-purple-500 transition px-4 py-2 rounded text-text-primary font-medium"
          >
            Change
          </Link>
        </div>

        {/* Password Section */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
          <h3 className="text-xl font-semibold mb-4">Password</h3>
          <p className="text-text-secondary mb-2">Update your account password securely.</p>
          <Link
            to="/edit/password"
            className="inline-block mt-2 bg-purple-600 hover:bg-purple-500 transition px-4 py-2 rounded text-text-primary font-medium"
          >
            Change
          </Link>
        </div>
      </div>
    </div>
  );
}