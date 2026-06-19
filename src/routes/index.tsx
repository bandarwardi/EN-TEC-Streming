import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/home" }), 1400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-40" style={{
        background: "radial-gradient(circle at 30% 30%, oklch(0.78 0.16 70 / 0.25), transparent 50%), radial-gradient(circle at 70% 70%, oklch(0.6 0.22 264 / 0.2), transparent 50%)",
      }} />
      <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
        <div className="scale-150">
          <Logo size={64} />
        </div>
        <p className="text-sm text-muted-foreground tracking-widest uppercase">Premium 4K/8K Streaming</p>
        <div className="mt-4 flex gap-1">
          {[0, 150, 300].map((d) => (
            <span key={d} className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-live" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
