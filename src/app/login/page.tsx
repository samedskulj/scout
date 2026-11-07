import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPage } from "@/marketing/LoginPage";

export const metadata: Metadata = { title: "Sign in" };

export default function Login() {
  // LoginPage reads ?mode and ?next, so it renders on the client inside a Suspense boundary.
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
