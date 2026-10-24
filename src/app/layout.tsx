
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NestOS Services | Car Care at Your Society",
    template: "%s | NestOS Services",
  },
  description:
    "Convenient car washing at your residential society. Choose your service, book a slot, and let us take care of your car.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {children}
      </body>
    </html>
  );
}
