import './globals.scss';

export const metadata = {
  title: 'Troutman Handyman AI',
  description: 'AI-assisted handyman intake and scheduling',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

