"use client";

import { useActionState } from "react";
import { signOut } from "@/actions/auth";
import { updateProfile, type ActionState } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTRUMENTS, ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

const initial: ActionState = {};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initial);

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            defaultValue={profile.display_name}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} disabled />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Input value={ROLE_LABELS[profile.role]} disabled />
        </div>
        <div className="space-y-2">
          <Label>Instruments</Label>
          <div className="flex flex-wrap gap-3">
            {INSTRUMENTS.map((inst) => (
              <label
                key={inst}
                className="flex items-center gap-2 text-sm capitalize"
              >
                <input
                  type="checkbox"
                  name="instruments"
                  value={inst}
                  defaultChecked={profile.instruments?.includes(inst)}
                  className="size-4 accent-primary"
                />
                {inst}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Controls which role-targeted files you see.
          </p>
        </div>
        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-primary" role="status">
            {state.success}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
