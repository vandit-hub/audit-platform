import "./globals.css";
import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import SessionWrapper from "@/components/SessionWrapper";
import { ToastProvider } from "@/contexts/ToastContext";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-side: read the session (serializable) and pass it into a client boundary
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionWrapper session={session}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
