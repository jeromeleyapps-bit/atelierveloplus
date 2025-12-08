import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scanner - Atelier Vélo',
  description: 'Scanner de code-barres pour catalogue',
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <meta httpEquiv="Permissions-Policy" content="camera=*, microphone=*, geolocation=*" />
      {children}
    </>
  );
}
