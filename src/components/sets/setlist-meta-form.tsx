"use client";

import { useActionState } from "react";
import { updateSetlist, type ActionState } from "@/actions/setlists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Setlist } from "@/lib/types/database";

const initial: ActionState = {};

export function SetlistMetaForm({ setlist }: { setlist: Setlist }) {
  const [state, formAction, pending] = useActionState(updateSetlist, initial);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border/70 bg-card/30 p-4">
      <input type="hidden" name="id" value={setlist.id} />
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={setlist.name} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event_date">Date</Label>
          <Input
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={setlist.event_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_type">Type</Label>
          <select
            id="event_type"
            name="event_type"
            defaultValue={setlist.event_type}
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
        <Input id="venue" name="venue" defaultValue={setlist.venue ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={setlist.notes ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={setlist.status}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="final">Final</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p className="text-sm text-primary">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save set details"}
      </Button>
    </form>
  );
}
