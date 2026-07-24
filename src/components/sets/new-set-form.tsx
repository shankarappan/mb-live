"use client";

import { useActionState } from "react";
import { createSetlist, type ActionState } from "@/actions/setlists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = {};

export function NewSetForm() {
  const [state, formAction, pending] = useActionState(createSetlist, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Sat Gig — Riverside" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event_date">Date</Label>
          <Input id="event_date" name="event_date" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_type">Type</Label>
          <select
            id="event_type"
            name="event_type"
            defaultValue="rehearsal"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="rehearsal">Rehearsal</option>
            <option value="gig">Gig</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="venue">Venue</Label>
        <Input id="venue" name="venue" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue="draft"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create set"}
      </Button>
    </form>
  );
}
