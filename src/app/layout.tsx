import "./globals.css";
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionWrapper from "@/components/SessionWrapper";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-side: read the session (serializable) and pass it into a client boundary
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <SessionWrapper session={session}>{children}</SessionWrapper>
      </body>
    </html>
  );
}
