import {
  handleCreateProfile,
  handleDeleteProfile,
  handleGetProfile,
  handlePatchProfile,
  handleProfileMethods,
  handlePutProfile,
} from "@/features/auth/lib/profile-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleGetProfile(request);
}

export async function POST(request: Request) {
  return handleCreateProfile(request);
}

export async function PUT(request: Request) {
  return handlePutProfile(request);
}

export async function PATCH(request: Request) {
  return handlePatchProfile(request);
}

export async function DELETE(request: Request) {
  return handleDeleteProfile(request);
}
