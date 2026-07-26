"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, Settings } from "lucide-react";

import { NotificationsDropdown } from "@/components/axion/notifications-dropdown";
import { SidebarAvatar } from "@/components/axion/sidebar-profile-editor";
import { confirmAndLogout } from "@/features/auth/lib/confirm-logout";

type TopBarMenusProps = {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  onOpenSettings: () => void;
  onViewAllNotifications: () => void;
};

/** Client-only menus — avoids Radix useId SSR/client hydration mismatches. */
export function TopBarMenus({
  name,
  email,
  role,
  avatarUrl,
  onOpenSettings,
  onViewAllNotifications,
}: TopBarMenusProps) {
  return (
    <>
      <NotificationsDropdown onViewAll={onViewAllNotifications} />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="User menu"
            className="group axion-user-trigger flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 sm:h-10 sm:w-auto sm:gap-2 sm:border sm:pl-1.5 sm:pr-2.5"
          >
            <span className="pointer-events-none flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <SidebarAvatar
                name={name}
                avatarUrl={avatarUrl}
                size="sm"
                className="!h-8 !w-8"
              />
            </span>
            <span className="hidden max-w-30 truncate font-medium text-foreground md:inline">
              {name}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground transition group-data-[state=open]:rotate-180 md:inline" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="axion-dropdown axion-user-menu z-50 w-[17.5rem] overflow-hidden rounded-2xl p-0"
        >
          <div className="axion-user-menu-header">
            <div className="flex items-start gap-3">
              <SidebarAvatar
                name={name}
                avatarUrl={avatarUrl}
                className="h-11 w-11"
              />
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="axion-user-menu-name truncate text-sm font-semibold">
                  {name}
                </p>
                {email ? (
                  <p className="axion-user-menu-email mt-0.5 truncate text-xs">
                    {email}
                  </p>
                ) : null}
                <span className="axion-user-menu-role mt-2 inline-flex">
                  {role}
                </span>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <DropdownMenu.Item
              className="axion-user-menu-item"
              onSelect={onOpenSettings}
            >
              <span className="axion-user-menu-icon">
                <Settings className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">Settings</span>
                <span className="axion-user-menu-hint block text-[11px]">
                  Account & preferences
                </span>
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="axion-user-menu-sep" />

            <DropdownMenu.Item
              className="axion-user-menu-item axion-user-menu-item--danger"
              onSelect={(e) => {
                e.preventDefault();
                void confirmAndLogout();
              }}
            >
              <span className="axion-user-menu-icon axion-user-menu-icon--danger">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">Sign out</span>
                <span className="block text-[11px] opacity-70">
                  End this session
                </span>
              </span>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </>
  );
}
