import React, { useState } from "react";
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

  if (user) {
    nav("/");
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
      <form onSubmit={submit} style={{ width: 360, border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>QuickCrew Back Office</h2>
        <p style={{ marginTop: 6, color: "#6b7280" }}>Staff login</p>

        <label style={{ display: "block", marginTop: 12, fontWeight: 700 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ width: "100%", padding: 10, marginTop: 6, borderRadius: 10, border: "1px solid #d1d5db" }}
        />

        <label style={{ display: "block", marginTop: 12, fontWeight: 700 }}>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={{ width: "100%", padding: 10, marginTop: 6, borderRadius: 10, border: "1px solid #d1d5db" }}
        />

        {error ? <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 700 }}>{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}