import { Logo } from "@/client/components/Logo";

export default function HomePage() {
  return (
    <div className="flex items-center justify-center size-full font-mono">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="relative">
          <Logo className="w-52" />
          <div className="absolute -bottom-2 right-0 text-xs text-muted-foreground">
            by Sentry
          </div>
        </div>
      </div>
    </div>
  );
}
