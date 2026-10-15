import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain a special character (e.g. !@#$%)"
  );

export const pinSchema = z
  .string()
  .regex(/^\d{6}$/, "PIN must be 6 digits");

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const apiRegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const pinLoginSchema = z.object({
  email: emailSchema,
  pin: pinSchema,
});

export const setupPinSchema = z
  .object({
    pin: pinSchema,
    confirmPin: z.string().min(6, "Confirm your PIN"),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export const forgotPinSchema = z.object({
  email: emailSchema,
});

export const avatarUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      !value ||
      value.startsWith("/") ||
      value.startsWith("http://") ||
      value.startsWith("https://"),
    "Enter a valid image URL"
  );

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  avatarUrl: avatarUrlSchema,
});

const fullNameField = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters")
  .max(80, "Full name must be at most 80 characters");

export const apiCreateProfileSchema = z
  .object({
    fullName: fullNameField.optional(),
    full_name: fullNameField.optional(),
    avatarUrl: avatarUrlSchema,
    avatar_url: avatarUrlSchema,
  })
  .transform((data) => ({
    fullName: data.fullName ?? data.full_name ?? "",
    avatarUrl: data.avatarUrl ?? data.avatar_url ?? "",
  }))
  .refine((data) => data.fullName.length >= 2, {
    message: "Full name must be at least 2 characters",
    path: ["fullName"],
  });

export const apiPatchProfileSchema = z
  .object({
    fullName: fullNameField.optional(),
    full_name: fullNameField.optional(),
    avatarUrl: avatarUrlSchema,
    avatar_url: avatarUrlSchema,
  })
  .transform((data) => ({
    fullName: data.fullName ?? data.full_name,
    avatarUrl: data.avatarUrl ?? data.avatar_url,
  }))
  .refine(
    (data) => data.fullName !== undefined || data.avatarUrl !== undefined,
    { message: "Provide fullName or avatarUrl to update" }
  );

export const apiDeleteProfileSchema = z.object({
  password: z.string().min(1, "Password is required to delete your profile"),
});

export const changePinSchema = z
  .object({
    currentPin: pinSchema,
    newPin: pinSchema,
    confirmNewPin: z.string().min(6, "Confirm your new PIN"),
  })
  .refine((data) => data.newPin === data.confirmNewPin, {
    message: "PINs do not match",
    path: ["confirmNewPin"],
  })
  .refine((data) => data.currentPin !== data.newPin, {
    message: "New PIN must be different from current PIN",
    path: ["newPin"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type ApiRegisterInput = z.infer<typeof apiRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PinLoginInput = z.infer<typeof pinLoginSchema>;
export type SetupPinInput = z.infer<typeof setupPinSchema>;
export type ForgotPinInput = z.infer<typeof forgotPinSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ApiCreateProfileInput = z.output<typeof apiCreateProfileSchema>;
export type ApiPatchProfileInput = z.output<typeof apiPatchProfileSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
