'use client';

import { useState } from 'react';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { getFirebaseErrorMessage } from '@/lib/errors';
import { FormAlert } from '@/components/ui/FormAlert';
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

// types
type AuthMode = 'login' | 'signup';

// validation
function validateForm(
  mode: AuthMode,
  email: string,
  password: string,
  confirmPassword: string
): string | null {
  if (!email.trim() || !password) {
    return 'Please fill out all fields';
  }
  if (mode === 'signup' && !confirmPassword) {
    return 'Please confirm your password';
  }
  if (mode === 'signup' && password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
}

// component
export default function AuthForm() {
  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // ui state
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isSignUp = mode === 'signup';

  // auth handlers
  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setError('');
    setIsLoading(true);

    try {
      const authProvider = provider === 'google' 
        ? new GoogleAuthProvider() 
        : new GithubAuthProvider();
      await signInWithPopup(auth, authProvider);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // validate before submitting
    const validationError = validateForm(mode, email, password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(isSignUp ? 'login' : 'signup');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  // render
  return (
    <div className="transparent-bg w-full max-w-md mx-auto p-lg rounded-sm border border-white/20">
      {/* header */}
      <header className="mb-md">
        <h1 className="text-2xl font-bold">{isSignUp ? 'Sign Up' : 'Login'}</h1>
        <p className="text-sm opacity-80">
          {isSignUp ? 'Create your account' : 'Hi, Welcome back 👋'}
        </p>
      </header>

      {/* error alert */}
      {error && (
        <div className="mb-sm">
          <FormAlert message={error} type="error" />
        </div>
      )}

      {/* oauth buttons */}
      <div className="flex flex-col gap-sm mb-md">
        <button
          type="button"
          onClick={() => handleOAuthSignIn('google')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-sm p-sm bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <Image src="/google.svg" alt="" width={16} height={16} />
          Sign in with Google
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignIn('github')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-sm p-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <Image src="/github.svg" alt="" width={16} height={16} className="brightness-0 invert" />
          Sign in with GitHub
        </button>
      </div>

      {/* divider */}
      <div className="flex items-center gap-sm mb-md">
        <div className="flex-1 border-t border-white/20" />
        <span className="text-xs opacity-60">or continue with email</span>
        <div className="flex-1 border-t border-white/20" />
      </div>

      {/* email form */}
      <form onSubmit={handleEmailAuth} className="flex flex-col gap-sm">
        {/* email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-xs">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full p-sm border border-gray-300 rounded-md text-sm disabled:opacity-50"
          />
        </div>

        {/* password field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-xs">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full p-sm pr-14 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-1"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* confirm password (sign up only) */}
        {isSignUp && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-xs">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full p-sm border border-gray-300 rounded-md text-sm disabled:opacity-50"
            />
          </div>
        )}

        {/* forgot password (login only) */}
        {!isSignUp && (
          <div className="text-right">
            <a href="#" className="text-xs text-blue-400 hover:text-blue-300">
              Forgot Password?
            </a>
          </div>
        )}

        {/* submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
        </button>
      </form>

      {/* toggle mode */}
      <p className="text-sm mt-lg">
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <button
          type="button"
          onClick={toggleMode}
          disabled={isLoading}
          className="text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50"
        >
          {isSignUp ? 'Login' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
}
