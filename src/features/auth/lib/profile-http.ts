import { requireApiUser } from "@/features/auth/lib/api-auth";
import {
  apiCreateProfileSchema,
  apiDeleteProfileSchema,
  apiPatchProfileSchema,
} from "@/features/auth/schemas/auth.schemas";
import {
  createProfileRecord,
  deleteProfileAccount,
  getProfileRecord,
  replaceProfileRecord,
  toProfileDto,
  updateProfileRecord,
} from "@/features/auth/services/profile.service";
import {
  jsonError,
  jsonOk,
  methodNotAllowed,
  parseJsonSchema,
  readJsonBody,
} from "@/lib/api-http";

function profileError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  if (message === "Profile already exists.") {
    return jsonError(message, 409, "conflict");
  }
  if (message === "Invalid password.") {
    return jsonError(message, 401, "unauthenticated");
  }
  if (message === "Account deletion is not configured.") {
    return jsonError(message, 503, "not_configured");
  }
  if (message === "Profile not found.") {
    return jsonError(message, 404, "not_found");
  }
  return jsonError(message, 400, "profile_error");
}

export function handleProfileMethods() {
  return methodNotAllowed("GET, POST, PUT, PATCH, DELETE");
}

export async function handleGetProfile(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  try {
    const profile = await getProfileRecord(auth.auth.supabase, auth.auth.user.id);
    if (!profile) return jsonError("Profile not found.", 404, "not_found");
    return jsonOk(toProfileDto(profile));
  } catch (err) {
    return profileError(err, "Failed to load profile.");
  }
}

export async function handleCreateProfile(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(apiCreateProfileSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const profile = await createProfileRecord(
      auth.auth.supabase,
      auth.auth.user,
      parsed.data
    );
    return jsonOk(toProfileDto(profile), 201, "Profile created.");
  } catch (err) {
    return profileError(err, "Failed to create profile.");
  }
}

export async function handlePatchProfile(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(apiPatchProfileSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const profile = await updateProfileRecord(
      auth.auth.supabase,
      auth.auth.user.id,
      parsed.data
    );
    if (!profile) return jsonError("Profile not found.", 404, "not_found");
    return jsonOk(toProfileDto(profile), 200, "Profile updated.");
  } catch (err) {
    return profileError(err, "Failed to update profile.");
  }
}

export async function handlePutProfile(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(apiCreateProfileSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    const profile = await replaceProfileRecord(
      auth.auth.supabase,
      auth.auth.user,
      parsed.data
    );
    return jsonOk(toProfileDto(profile), 200, "Profile saved.");
  } catch (err) {
    return profileError(err, "Failed to save profile.");
  }
}

export async function handleDeleteProfile(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = parseJsonSchema(apiDeleteProfileSchema, json.body);
  if (!parsed.ok) return parsed.response;

  try {
    await deleteProfileAccount(
      auth.auth.supabase,
      auth.auth.user,
      parsed.data.password
    );
    return jsonOk({ deleted: true }, 200, "Profile deleted.");
  } catch (err) {
    return profileError(err, "Failed to delete profile.");
  }
}
