import { useState } from "react";
import { login } from "../auth";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await login(email, password);
      }
      // Auth listener will automatically update the state and redirect
      // No need to manually redirect - the App.tsx will show the dashboard
    } catch (err: any) {
      // User-friendly error messages
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || (isSignUp ? 'Failed to create account' : 'Failed to log in'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={handleAuth}
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-8 space-y-4 w-full max-w-sm"
      >
        <h1 className="text-xl text-white text-center mb-2">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h1>

        {error && <p className="text-red-500 text-center text-sm">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="input w-full text-white placeholder-gray-400 bg-neutral-800"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (min 6 characters)"
          className="input w-full text-white placeholder-gray-400 bg-neutral-800"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button 
          className="btn-gold w-full" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Login')}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          className="w-full text-[#d6c26e] hover:text-[#e8d487] transition-colors text-sm"
        >
          {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
        </button>
      </form>
    </div>
  );
}
