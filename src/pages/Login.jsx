import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import useAuthStore from '@/store/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const [error, setError] = useState('');

  const handleSuccess = (response) => {
    const decoded = jwtDecode(response.credential);
    const email = decoded.email;
    if (!email.endsWith('@reffie.me')) {
      clearUser();
      setError('Access restricted to Reffie team members only.');
      return;
    }
    setUser(
      { name: decoded.name, email: decoded.email, picture: decoded.picture },
      response.credential
    );
    navigate('/dashboard');
  };

  const handleError = () => {
    setError('Sign in failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div
        className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-md p-10
          w-full max-w-sm flex flex-col items-center gap-5"
      >
        <div className="text-center">
          <div className="text-[28px] font-extrabold tracking-[-0.5px] text-brand leading-none mb-2">
            REFFIE
          </div>
          <p className="text-sm text-muted">Customer success onboarding platform</p>
        </div>

        <GoogleLogin
          hostedDomain="reffie.me"
          onSuccess={handleSuccess}
          onError={handleError}
        />

        {error && (
          <p className="text-xs text-[#C0392B] text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
