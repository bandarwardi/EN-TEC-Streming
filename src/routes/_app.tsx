import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0 lg:pl-[68px]">
      <SideNav />
      <Outlet />
      <BottomNav />
    </div>
  );
}
