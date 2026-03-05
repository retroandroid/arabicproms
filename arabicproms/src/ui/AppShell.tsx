import React from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar" style={styles.page}>
      <div style={styles.card}>{children}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    background: "#0b1220",
    color: "#e8eefc",
  },
  card: {
    width: "min(1000px, 100%)",
    background: "#0f1b33",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
  },
};