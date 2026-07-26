import HomePage from "@/components/HomePage";
import { QueryProvider } from "@/components/providers/query-provider";
import { SiteBrandingApplier } from "@/features/cms/components/SiteBrandingApplier";

export default function Page() {
  return (
    <QueryProvider>
      <SiteBrandingApplier />
      <HomePage />
    </QueryProvider>
  );
}
