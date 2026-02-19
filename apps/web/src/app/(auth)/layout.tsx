import { Globe } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-2 motion-safe:animate-in motion-safe:fade-in duration-300">
        <Globe className="size-5" />
        <span className="text-lg font-semibold tracking-tight">lingo-dev</span>
      </div>
      <div className="w-full max-w-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300">
        {children}
      </div>
    </div>
  );
}
