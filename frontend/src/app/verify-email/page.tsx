"use client";
import dynamic from "next/dynamic";

// Dynamically import the client component with SSR disabled to avoid useSearchParams bailout
const VerifyEmailClient = dynamic(
  () => import("@/components/verify/VerifyEmailClient"),
  { ssr: false }
);

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
