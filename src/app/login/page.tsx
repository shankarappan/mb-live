import { BrandLogo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { Panel } from "@/components/layout/panel";

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
    <div className="relative flex min-h-dvh w-full min-w-0 items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% 0%, color-mix(in srgb, var(--violet) 35%, transparent), transparent 60%)",
        }}
      />
      <div className="mx-auto w-full max-w-md min-w-0 space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <BrandLogo size="lg" priority />
          <p className="max-w-sm text-muted-foreground">
            Invite-only band library, set lists, and stage reading mode.
          </p>
        </div>
        <Panel elevated className="p-6">
          <LoginForm
            redirectTo={params.redirect || "/"}
            errorMessage={errorMessage}
          />
        </Panel>
      </div>
    </div>
  );
}
