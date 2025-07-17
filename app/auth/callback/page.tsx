// app/auth/callback/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey =
          process.env.NEXT_PUBLIC_SUPABASE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          console.error("Missing Supabase configuration");
          setError("Server configuration error");
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Обработка обратного вызова аутентификации
        const { searchParams } = new URL(window.location.href);
        const code = searchParams.get("code");
        const messageId = searchParams.get("id");

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        // Проверяем сессию
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const userEmail = session.user.email;
          if (userEmail === "semoo.smm@gmail.com") {
            router.push("/admin");
          } else {
            // Сохраняем email зрителя (не админа)
            try {
              await fetch("/api/subscribers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail }),
              });
            } catch (e) {
              console.error("Failed to save viewer email", e);
            }
            if (messageId) {
              router.push(`/view/${messageId}`);
            } else {
              router.push("/");
            }
          }
        } else {
          setError("Authentication failed");
          setTimeout(() => router.push("/signin"), 2000);
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Authentication error");
        setTimeout(() => router.push("/signin"), 2000);
      }
    };

    handleCallback();
  }, [router]);

  // Простой UI для страницы обратного вызова
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-purple-500">
      <div className="text-center">
        {error ? (
          <p className="text-red-500 text-xl">{error}</p>
        ) : (
          <p className="text-xl">Completing authentication...</p>
        )}
      </div>
    </div>
  );
}
