"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">CI</span>
          <span className="auth-wordmark">Clocked <span className="auth-wordmark--bold">Invoice</span></span>
        </div>
        <h1 className="auth-title">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-subtitle">
          {mode === "signin"
            ? "Sign in to process and review invoices."
            : "Sign up to start processing invoices."}
        </p>

        <div className="auth-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <button
            type="button"
            className={`auth-btn auth-btn--small ${mode === "signin" ? "auth-btn--primary" : "auth-btn--ghost"}`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-btn auth-btn--small ${mode === "signup" ? "auth-btn--primary" : "auth-btn--ghost"}`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        {mode === "signin" ? (
          <SignIn
            routing="hash"
            fallbackRedirectUrl="/"
            appearance={{
              variables: {
                colorPrimary: "#1689d8",
                colorPrimaryForeground: "#ffffff",
                borderRadius: "12px",
                fontFamily: "'DM Sans', sans-serif",
              },
              elements: {
                rootBox: "auth-clerk-root",
                card: "auth-clerk-card",
                headerTitle: "auth-title",
                headerSubtitle: "auth-subtitle",
                socialButtonsBlockButton: "auth-btn auth-btn--ghost auth-btn--full",
                formButtonPrimary: "auth-btn auth-btn--primary auth-btn--full",
                footerActionLink: "auth-footer-link",
              },
            }}
          />
        ) : (
          <SignUp
            routing="hash"
            fallbackRedirectUrl="/"
            appearance={{
              variables: {
                colorPrimary: "#1689d8",
                colorPrimaryForeground: "#ffffff",
                borderRadius: "12px",
                fontFamily: "'DM Sans', sans-serif",
              },
              elements: {
                rootBox: "auth-clerk-root",
                card: "auth-clerk-card",
                headerTitle: "auth-title",
                headerSubtitle: "auth-subtitle",
                socialButtonsBlockButton: "auth-btn auth-btn--ghost auth-btn--full",
                formButtonPrimary: "auth-btn auth-btn--primary auth-btn--full",
                footerActionLink: "auth-footer-link",
              },
            }}
          />
        )}
      </div>
    </div>
  );
}