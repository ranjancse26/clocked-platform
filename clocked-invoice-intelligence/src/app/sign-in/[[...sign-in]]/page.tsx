import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function Page() {
  return (
    <div className="auth-page">
      <Suspense>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#d4f275",
              colorPrimaryForeground: "#000000",
              borderRadius: "12px",
              fontFamily: "'DM Sans', sans-serif",
            },
            elements: {
              card: "auth-card",
              headerTitle: "auth-title",
              headerSubtitle: "auth-subtitle",
              socialButtonsBlockButton: "auth-btn auth-btn--ghost auth-btn--full",
              formButtonPrimary: "auth-btn auth-btn--primary auth-btn--full",
              footerActionLink: "auth-footer-link",
            },
          }}
        />
      </Suspense>
    </div>
  );
}