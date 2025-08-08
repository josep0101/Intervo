import "@/app/globals.css"; // Assuming your global styles are here

export const metadata = {
  title: {
    default: "Voxa.ai | Conversational Voice AI Agent", // Your global default title
    template: "Voxa.ai - %s", // Global title template
  },
  description:
    "Voxa offers a powerful, open-source voice assistant solution that reduces the complexity of creating multimodal, AI-driven applications, giving you the freedom to focus on innovation.", // Your global description
  icons: {
    icon: "https://res.cloudinary.com/dmuecdqxy/q_auto/v1736911486/CA3xT9cd/interv-iconpng_1736911485_36618.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* 
          Providers that need to be at the very root and are server-compatible 
          can go here. Client-side only providers will typically go in a 
          client component wrapper inside this, or in your more specific layouts.
        */}
        {children}
      </body>
    </html>
  );
}
