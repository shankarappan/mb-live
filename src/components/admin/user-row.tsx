"use client";

import { useActionState } from "react";
import { removeUser, updateUserRole, type ActionState } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { INSTRUMENTS, ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";

const initial: ActionState = {};

export function UserRow({ user }: { user: Profile }) {
  const [state, formAction, pending] = useActionState(updateUserRole, initial);
  const [removeState, removeAction, removing] = useActionState(removeUser, initial);

  return (
    <li className="space-y-3 rounded-lg border border-border/60 p-3">
      <div>
        <p className="font-medium">{user.display_name || "Unnamed"}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground">
          {ROLE_LABELS[user.role]}
        </p>
      </div>
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="user_id" value={user.id} />
        <select
          name="role"
          defaultValue={user.role}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="member">Member</option>
          <option value="leader">Band Leader</option>
          <option value="admin">Admin</option>
        </select>
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.map((inst) => (
            <label key={inst} className="flex items-center gap-1 text-xs capitalize">
              <input
                type="checkbox"
                name="instruments"
                value={inst}
                defaultChecked={user.instruments?.includes(inst)}
                className="size-3.5 accent-primary"
              />
              {inst}
            </label>
          ))}
        </div>
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        {state.success && <p className="text-xs text-primary">{state.success}</p>}
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Update
        </Button>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="user_id" value={user.id} />
        {removeState.error && (
          <p className="mb-1 text-xs text-destructive">{removeState.error}</p>
        )}
        <Button type="submit" size="sm" variant="ghost" disabled={removing}>
          Remove
        </Button>
      </form>
    </li>
  );
}
