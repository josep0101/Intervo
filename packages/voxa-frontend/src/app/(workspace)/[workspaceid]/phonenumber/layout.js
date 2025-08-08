import { PhoneNumberProvider } from "@/context/PhoneNumberContext";

export default function RootLayout({ children }) {
  return <PhoneNumberProvider>{children}</PhoneNumberProvider>;
}
