import "./globals.css";
import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import SessionWrapper from "@/components/SessionWrapper";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-side: read the session (serializable) and pass it into a client boundary
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <SessionWrapper session={session}>{children}</SessionWrapper>
      </body>
    </html>
  );
}
