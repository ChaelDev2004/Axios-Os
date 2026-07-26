"use client";

import { useState, ChangeEvent, FormEvent, ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ripple,
  AuthTabs,
  TechOrbitDisplay,
} from "@/components/blocks/modern-animated-sign-in";
import { registerAction } from "@/features/auth/actions/auth.actions";

type FormData = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

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

export default function RegisterPage() {
  const router = useRouter();
  const [errorField, setErrorField] = useState<string | undefined>();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    name: keyof FormData
  ) => {
    const value = event.target.value;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorField(undefined);

    const result = await registerAction({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    if (!result.success) {
      setErrorField(result.error);
      toast.error(result.error);
      return;
    }

    if (result.message) toast.success(result.message);
    router.push(result.data.redirectTo);
    router.refresh();
  };

  const formFields = {
    header: "Create account",
    subHeader: "Register to get started with secure authentication",
    fields: [
      {
        label: "Full Name",
        name: "fullName",
        required: true,
        type: "text" as const,
        placeholder: "Enter your full name",
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, "fullName"),
      },
      {
        label: "Email",
        name: "email",
        required: true,
        type: "email" as const,
        placeholder: "Enter your email address",
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, "email"),
      },
      {
        label: "Password",
        name: "password",
        required: true,
        type: "password" as const,
        placeholder: "Create a password",
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, "password"),
      },
      {
        label: "Confirm Password",
        name: "confirmPassword",
        required: true,
        type: "password" as const,
        placeholder: "Confirm your password",
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event, "confirmPassword"),
      },
    ],
    submitButton: "Create account",
    textVariantButton: "Already have an account? Sign in",
    errorField,
  };

  return (
    <section className="flex min-h-[100dvh] bg-zinc-950 text-zinc-100 max-lg:justify-center">
      <span className="relative flex w-1/2 flex-col justify-center max-lg:hidden">
        <Ripple mainCircleSize={100} />
        <TechOrbitDisplay iconsArray={iconsArray} text="Join Us" />
      </span>

      <span className="flex h-[100dvh] w-1/2 flex-col items-center justify-center overflow-y-auto max-lg:w-full max-lg:px-[10%]">
        <AuthTabs
          formFields={formFields}
          goTo={(event) => {
            event.preventDefault();
            router.push("/auth/login");
          }}
          handleSubmit={handleSubmit}
        />
      </span>
    </section>
  );
}
