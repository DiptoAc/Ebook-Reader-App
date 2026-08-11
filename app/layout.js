import './globals.css';

export const metadata = {
  title: 'আমার পাঠশালা',
  description: 'একটি আরামদায়ক ডিজিটাল পাঠাগার'
};

export default function RootLayout({ children }) {
  return <html lang="bn"><body>{children}</body></html>;
}
