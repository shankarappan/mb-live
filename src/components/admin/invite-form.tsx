"use client";

import { useActionState } from "react";
import { inviteUser, type ActionState } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTRUMENTS } from "@/lib/constants";

const initial: ActionState = {};

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteUser, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border/70 bg-card/30 p-4">
      <h3 className="font-medium">Invite member</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input id="display_name" name="display_name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="member">Member</option>
            <option value="leader">Band Leader</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {INSTRUMENTS.map((inst) => (
          <label key={inst} className="flex items-center gap-2 text-sm capitalize">
            <input
              type="checkbox"
              name="instruments"
              value={inst}
              className="size-4 accent-primary"
            />
            {inst}
          </label>
        ))}
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p className="text-sm text-primary">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
