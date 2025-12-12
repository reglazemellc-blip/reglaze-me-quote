import { useState } from "react";
import { login } from "../auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleLogin} className="card p-8 space-y-4 w-full max-w-sm">
        <h1 className="text-xl text-center mb-2">Sign In</h1>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="input w-full"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="input w-full"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button className="btn-gold w-full" type="submit">
          Login
        </button>
      </form>
    </div>
  );
}
