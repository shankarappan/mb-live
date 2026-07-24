"use client";

import { useActionState } from "react";
import { signInWithMagicLink, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function LoginForm({
  redirectTo = "/",
  errorMessage,
}: {
  redirectTo?: string;
  errorMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(
    signInWithMagicLink,
    initial
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@band.example"
        />
      </div>

      {(state.error || errorMessage) && (
        <p className="text-sm text-destructive" role="alert">
          {state.error || errorMessage}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-primary" role="status">
          {state.success}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a magic link"}
      </Button>
    </form>
  );
}
