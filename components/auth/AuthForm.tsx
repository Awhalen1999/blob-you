'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleGithubSignIn = async () => {
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 border">
        <h1 className="text-3xl font-bold mb-2">{isSignUp ? 'Sign Up' : 'Login'}</h1>
        <p className="text-gray-600 text-sm mb-8">
          {isSignUp ? 'Create your account' : 'Hi, Welcome back 👋'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <button 
          onClick={handleGoogleSignIn} 
          className="w-full mb-3 border"
        >
          <span className="mr-2">🔵</span> Login with Google
        </button>
        
        <button 
          onClick={handleGithubSignIn} 
          className="w-full mb-6 border"
        >
          <span className="mr-2">⚫</span> Login with GitHub
        </button>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-400 text-xs">or {isSignUp ? 'Sign up' : 'Login'} with Email</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              placeholder="E.g. johndoe@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full border"
              required
            />
          </div>
          
          <div className="text-left">
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full border pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          
          {isSignUp && (
            <div className="text-left">
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field w-full border"
                required
              />
            </div>
          )}
          
          {!isSignUp && (
            <div className="text-sm text-right"> 
              <a href="#" className="text-blue-600">Forgot Password?</a>
            </div>
          )}

          <button type="submit" className="w-full border">
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <p className="text-sm mt-6">
          {isSignUp ? 'Already have an account? ' : 'Not registered yet? '}
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setPassword('');
              setConfirmPassword('');
            }} 
            className="text-blue-600 font-medium"
          >
            {isSignUp ? 'Login →' : 'Create an account →'}
          </button>
        </p>

    </div>
  );
}
