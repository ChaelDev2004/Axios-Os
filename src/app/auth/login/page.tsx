"use client";

import { useState, useEffect, FormEvent, ReactNode, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Ripple,
  TechOrbitDisplay,
} from "@/components/blocks/modern-animated-sign-in";
import { loginAction } from "@/features/auth/actions/auth.actions";
import { PinLoginForm } from "@/features/auth/components/PinLoginForm";
import {
  getRememberedLoginEmail,
  hasPinLoginPreference,
  rememberLoginEmail,
  rememberPinLoginPreference,
} from "@/features/auth/lib/pin-preference";

interface OrbitIcon {
  component: () => ReactNode;
  className: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
}

const iconsArray: OrbitIcon[] = [
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg"
        alt="HTML5"
      />
    ),
    className: "size-[30px] border-none bg-transparent",
    duration: 20,
    delay: 20,
    radius: 100,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg"
        alt="CSS3"
      />
    ),
    className: "size-[30px] border-none bg-transparent",
    duration: 20,
    delay: 10,
    radius: 100,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg"
        alt="TypeScript"
      />
    ),
    className: "size-[50px] border-none bg-transparent",
    radius: 210,
    duration: 20,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg"
        alt="JavaScript"
      />
    ),
    className: "size-[50px] border-none bg-transparent",
    radius: 210,
    duration: 20,
    delay: 20,
    path: false,
    reverse: false,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg"
        alt="TailwindCSS"
      />
    ),
    className: "size-[30px] border-none bg-transparent",
    duration: 20,
    delay: 20,
    radius: 150,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg"
        alt="Nextjs"
      />
    ),
    className: "size-[30px] border-none bg-transparent",
    duration: 20,
    delay: 10,
    radius: 150,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg"
        alt="React"
      />
    ),
    className: "size-[50px] border-none bg-transparent",
    radius: 270,
    duration: 20,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg"
        alt="Figma"
      />
    ),
    className: "size-[50px] border-none bg-transparent",
    radius: 270,
    duration: 20,
    delay: 60,
    path: false,
    reverse: true,
  },
  {
    component: () => (
      <Image
        width={100}
        height={100}
        src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg"
        alt="Git"
      />
    ),
    className: "size-[50px] border-none bg-transparent",
    radius: 320,
    duration: 20,
    delay: 20,
    path: false,
    reverse: false,
  },
];

const inputClassName =
  "h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50";

const inputStyle: CSSProperties = {
  paddingLeft: "1.15rem",
  paddingRight: "1rem",
};

const logoWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  marginBottom: "1.1rem",
};

const logoStyle: CSSProperties = {
  display: "block",
  width: "128px",
  height: "128px",
  margin: "0 auto",
  borderRadius: "1.5rem",
  objectFit: "contain",
  boxShadow: "0 12px 32px rgba(37, 99, 235, 0.28)",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "pin" | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const preferPin = hasPinLoginPreference();
    setMode(preferPin ? "pin" : "email");
    const remembered = getRememberedLoginEmail();
    if (remembered) {
      setEmail(remembered);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    setError(undefined);
    setIsSubmitting(true);

    try {
      const result = await loginAction({ email, password });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      rememberLoginEmail(email);
      if (result.data.redirectTo === "/dashboard") {
        rememberPinLoginPreference(email);
      }

      toast.success("Welcome back!");
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === null) {
    return (
      <section className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-zinc-400">
        Loading…
      </section>
    );
  }

  return (
    <section className="flex min-h-[100dvh] bg-zinc-950 text-zinc-100 max-lg:justify-center max-lg:bg-[radial-gradient(ellipse_at_top,_rgb(39_39_42)_0%,_rgb(9_9_11)_55%)]">
      <div className="relative flex w-1/2 flex-col justify-center max-lg:hidden">
        <Ripple mainCircleSize={100} />
        <TechOrbitDisplay iconsArray={iconsArray} text="SecureAuth" />
      </div>

      <div className="flex min-h-[100dvh] w-1/2 flex-col items-center justify-center px-6 py-12 max-lg:w-full max-lg:px-0 max-lg:py-0 max-lg:pt-[max(1rem,env(safe-area-inset-top))] max-lg:pb-[max(1rem,env(safe-area-inset-bottom))]">
        {mode === "email" ? (
          <div className="auth-login-card w-full max-w-sm space-y-6 max-lg:m-5 max-lg:w-[calc(100%-2.5rem)] max-lg:space-y-8 max-lg:rounded-2xl max-lg:border max-lg:border-zinc-800/80 max-lg:bg-zinc-900/70 max-lg:p-10 max-lg:shadow-2xl max-lg:shadow-black/40 max-lg:backdrop-blur-xl">
            <div className="space-y-2 text-center">
              <div style={logoWrapStyle}>
                <img
                  src="/assets/appLogo/axiosLogo.png"
                  alt="AXIOS OS"
                  style={logoStyle}
                />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                AXIOS OS
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
                Welcome back
              </h1>
              <p className="text-sm text-zinc-400">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-lg:gap-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-email"
                  className="text-sm font-medium text-zinc-200"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                  style={inputStyle}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-zinc-200"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    placeholder="Enter your password"
                    value={password}
                    disabled={isSubmitting}
                    onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClassName} pr-11`}
                      style={{ ...inputStyle, paddingRight: "2.75rem" }}
                    />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 transition hover:text-zinc-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="flex flex-col items-center gap-3 text-sm text-zinc-400">
              <button
                type="button"
                className="font-medium text-blue-500 transition-colors hover:text-blue-400 hover:underline"
                onClick={() => router.push("/auth/register")}
              >
                Create an account
              </button>
              <button
                type="button"
                className="font-medium text-blue-500 transition-colors hover:text-blue-400 hover:underline"
                onClick={() => setMode("pin")}
              >
                Sign in with PIN
              </button>
              <Link
                href="/auth/forgot-pin"
                className="transition-colors hover:text-zinc-200 hover:underline"
              >
                Forgot PIN?
              </Link>
            </div>
          </div>
        ) : (
          <div className="auth-login-card w-full max-w-sm space-y-6 max-lg:m-5 max-lg:w-[calc(100%-2.5rem)] max-lg:space-y-8 max-lg:rounded-2xl max-lg:border max-lg:border-zinc-800/80 max-lg:bg-zinc-900/70 max-lg:p-10 max-lg:shadow-2xl max-lg:shadow-black/40 max-lg:backdrop-blur-xl">
            <div className="space-y-2 text-center">
              <div style={logoWrapStyle}>
                <img
                  src="/assets/appLogo/axiosLogo.png"
                  alt="AXIOS OS"
                  style={logoStyle}
                />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                AXIOS OS
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
                PIN Login
              </h2>
              <p className="text-sm text-zinc-400">
                Enter your 6-digit PIN to continue.
              </p>
            </div>
            <PinLoginForm />
            <button
              type="button"
              className="w-full text-sm font-medium text-blue-500 transition-colors hover:text-blue-400 hover:underline"
              onClick={() => setMode("email")}
            >
              Back to email login
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
