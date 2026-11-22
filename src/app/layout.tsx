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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e && e.message && (
                  e.message.indexOf('Loading chunk') !== -1 ||
                  e.message.indexOf('Failed to fetch dynamically imported module') !== -1 ||
                  e.message.indexOf('ChunkLoadError') !== -1
                )) {
                  var last = sessionStorage.getItem('chunk_err_reload');
                  var now = Date.now();
                  if (!last || now - parseInt(last, 10) > 15000) {
                    sessionStorage.setItem('chunk_err_reload', now);
                    window.location.reload();
                  }
                }
              });
            `,
          }}
        />
      </head>
      <body className="bg-[#F7F9FA] text-[#1A202C] antialiased selection:bg-[#258B7C] selection:text-white">
        {children}
      </body>
    </html>
  );
}
