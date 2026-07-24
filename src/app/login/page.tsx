import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const errorMessage =
    params.error === "missing_code"
      ? "Magic link was incomplete. Try again."
      : params.message
        ? decodeURIComponent(params.message)
        : undefined;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--stage-glow),_transparent_55%)]" />
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <p className="font-display text-5xl tracking-tight sm:text-6xl">
            MB Live
          </p>
          <p className="text-muted-foreground">
            Invite-only band library, set lists, and stage reading mode.
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 p-6 shadow-sm backdrop-blur">
          <LoginForm
            redirectTo={params.redirect || "/"}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </div>
  );
}
