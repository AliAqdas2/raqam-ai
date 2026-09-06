import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ConvexGuardWrapper } from "@/components/ConvexGuardWrapper";
import { LanguageProvider } from "@/components/LanguageProvider";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { Sidebar, MobileBottomNav } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/shared/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <ConvexGuardWrapper>
        <LanguageProvider>
          <ToastProvider>
            <OnboardingGuard>
              <div className="flex min-h-screen flex-row bg-[#F7F4EC] text-[#14231B]">
                <Sidebar />
                <main className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
                  {children}
                </main>
                <MobileBottomNav />
              </div>
            </OnboardingGuard>
          </ToastProvider>
        </LanguageProvider>
      </ConvexGuardWrapper>
    </ConvexClientProvider>
  );
}
