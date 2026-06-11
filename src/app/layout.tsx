import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxOS Indonesia — AI Operating System untuk UMKM",
  description: "AI-Powered Operating System perpajakan dan pembukuan untuk UMKM Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased dark">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        {children}
      </body>
    </html>
  );
}
