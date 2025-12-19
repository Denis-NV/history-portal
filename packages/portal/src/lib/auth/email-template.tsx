import * as React from "react";

interface EmailTemplateProps {
  heading: string;
  content: React.ReactNode;
  action: string;
  url: string;
  siteName?: string;
}

/**
 * Simple email template for auth emails.
 * Used for verification and password reset emails.
 */
export function EmailTemplate({
  heading,
  content,
  action,
  url,
  siteName = "History Portal",
}: EmailTemplateProps) {
  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "40px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#1a1a1a",
            marginBottom: "24px",
            textAlign: "center" as const,
          }}
        >
          {heading}
        </h1>

        <div
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "32px",
          }}
        >
          {content}
        </div>

        <div style={{ textAlign: "center" as const }}>
          <a
            href={url}
            style={{
              display: "inline-block",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              padding: "12px 32px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            {action}
          </a>
        </div>

        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginTop: "32px",
            textAlign: "center" as const,
          }}
        >
          If you didn&apos;t request this, you can safely ignore this email.
        </p>
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "#9ca3af",
          textAlign: "center" as const,
          marginTop: "24px",
        }}
      >
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </p>
    </div>
  );
}
