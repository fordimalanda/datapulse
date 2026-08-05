import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DataPulse Dashboard',
  description: 'Real-time analytics dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}