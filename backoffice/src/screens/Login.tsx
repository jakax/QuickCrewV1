import React, { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function Login() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav("/", { replace: true });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="centerPage">
      <form onSubmit={submit} className="card" style={{ width: 380 }}>
        <div className="cardBody">
          <h1 className="h1">QuickCrew Back Office</h1>
          <div className="muted mt6">Staff login</div>

          <label className="inputLabel">Email</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label className="inputLabel">Password</label>
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          {error ? <div className="error mt12">{error}</div> : null}

          <button type="submit" className="btn btnPrimary mt14" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}