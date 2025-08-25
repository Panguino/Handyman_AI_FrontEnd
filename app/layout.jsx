import './globals.scss';
import { applyThemeFromStorage } from '@/lib/ui/theme';

export const metadata = {
  title: 'Troutman Handyman AI',
  description: 'AI-assisted handyman intake and scheduling',
};

export default function RootLayout({ children }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(${applyThemeFromStorage.toString()})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
