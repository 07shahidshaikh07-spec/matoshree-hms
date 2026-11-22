import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matoshree Clinic — EMR System | Latur, Maharashtra",
  description: "Electronic Medical Records & Practice Management System for Matoshree Clinic, Latur (Dr. Vinod Korale & Dr. Vaishali Korale)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F7F9FA] text-[#1A202C] antialiased selection:bg-[#258B7C] selection:text-white">
        {children}
      </body>
    </html>
  );
}
