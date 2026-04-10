import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TodayAsset',
  description: 'AI 기반 투자 분석 서비스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
