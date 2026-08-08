"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  createVaultCredential,
  createVaultFolder,
  deleteVaultCredential,
  deleteVaultFolder,
  fetchVaultCredentials,
  fetchVaultFolders,
  renameVaultFolder,
  toggleVaultFavorite,
  updateVaultCredential,
} from "@/features/vault/services/vault.service";
import type {
  DecryptedVaultCredential,
  VaultCredentialInput,
  VaultFolder,
} from "@/features/vault/types";
import { useVaultLockStore } from "@/features/vault/stores/vault-lock.store";

export const vaultKeys = {
  all: ["vault"] as const,
  credentials: () => [...vaultKeys.all, "credentials"] as const,
  folders: () => [...vaultKeys.all, "folders"] as const,
};

type MutationCallbacks<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
};

export function useVaultCredentials(
  options?: Omit<
    UseQueryOptions<DecryptedVaultCredential[], Error>,
    "queryKey" | "queryFn"
  >
) {
  const unlocked = useVaultLockStore((s) => s.unlocked);
  return useQuery({
    queryKey: vaultKeys.credentials(),
    queryFn: fetchVaultCredentials,
    enabled: unlocked && (options?.enabled ?? true),
    ...options,
  });
}

export function useVaultFolders(
  options?: Omit<UseQueryOptions<VaultFolder[], Error>, "queryKey" | "queryFn">
) {
  const unlocked = useVaultLockStore((s) => s.unlocked);
  return useQuery({
    queryKey: vaultKeys.folders(),
    queryFn: fetchVaultFolders,
    enabled: unlocked && (options?.enabled ?? true),
    ...options,
  });
}

export function useCreateVaultCredential(
  callbacks?: MutationCallbacks<DecryptedVaultCredential, VaultCredentialInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVaultCredential,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.credentials() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useUpdateVaultCredential(
  callbacks?: MutationCallbacks<
    DecryptedVaultCredential,
    { id: string; input: VaultCredentialInput }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VaultCredentialInput }) =>
      updateVaultCredential(id, input),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.credentials() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useDeleteVaultCredential(
  callbacks?: MutationCallbacks<void, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVaultCredential,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.credentials() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useToggleVaultFavorite(
  callbacks?: MutationCallbacks<void, { id: string; favorite: boolean }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      toggleVaultFavorite(id, favorite),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.credentials() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useCreateVaultFolder(
  callbacks?: MutationCallbacks<VaultFolder, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVaultFolder,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.folders() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useRenameVaultFolder(
  callbacks?: MutationCallbacks<VaultFolder, { id: string; name: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameVaultFolder(id, name),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.folders() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}

export function useDeleteVaultFolder(callbacks?: MutationCallbacks<void, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVaultFolder,
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: vaultKeys.folders() });
      void queryClient.invalidateQueries({ queryKey: vaultKeys.credentials() });
      callbacks?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      callbacks?.onError?.(error, variables);
    },
  });
}
