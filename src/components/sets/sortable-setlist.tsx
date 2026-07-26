"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  removeSetlistItem,
  reorderSetlistItems,
  updateSetlistItem,
} from "@/actions/setlists";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Arrangement, SetlistItemWithSong } from "@/lib/types/database";

function SortableRow({
  item,
  setlistId,
  editable,
  arrangements = [],
}: {
  item: SetlistItemWithSong;
  setlistId: string;
  editable: boolean;
  arrangements?: Arrangement[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !editable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const title =
    item.item_type === "song"
      ? item.song?.title ?? "Unknown song"
      : item.label || item.item_type;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border/70 bg-card/40 p-3"
    >
      <div className="flex items-start gap-2">
        {editable && (
          <button
            type="button"
            className="mt-1 touch-none text-muted-foreground"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{title}</p>
            {item.item_type !== "song" && (
              <Badge variant="outline" className="capitalize">
                {item.item_type.replace("_", " ")}
              </Badge>
            )}
            {(item.arrangement?.default_key || item.song?.default_key) && (
              <Badge variant="secondary">
                {item.override_key ??
                  item.arrangement?.default_key ??
                  item.song?.default_key}
                {item.override_key ? " *" : ""}
              </Badge>
            )}
            {item.arrangement?.name ? (
              <Badge variant="outline">{item.arrangement.name}</Badge>
            ) : null}
          </div>
          {item.item_note && (
            <p className="text-sm text-muted-foreground">{item.item_note}</p>
          )}

          {editable && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Edit overrides
              </summary>
              <form action={updateSetlistItem} className="mt-2 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="item_id" value={item.id} />
                <input type="hidden" name="setlist_id" value={setlistId} />
                {item.item_type !== "song" && (
                  <Input
                    name="label"
                    placeholder="Label"
                    defaultValue={item.label ?? ""}
                  />
                )}
                {item.item_type === "song" && arrangements.length > 0 ? (
                  <select
                    name="arrangement_id"
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:col-span-2"
                    defaultValue={
                      item.arrangement_id ??
                      item.song?.default_arrangement_id ??
                      arrangements[0]?.id ??
                      ""
                    }
                  >
                    {arrangements.map((arr) => (
                      <option key={arr.id} value={arr.id}>
                        {arr.name}
                        {arr.default_key ? ` · ${arr.default_key}` : ""}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Input
                  name="override_key"
                  placeholder="Key override"
                  defaultValue={item.override_key ?? ""}
                />
                <Input
                  name="override_tempo"
                  type="number"
                  placeholder="Tempo override"
                  defaultValue={item.override_tempo ?? ""}
                />
                <Input
                  name="override_capo"
                  type="number"
                  placeholder="Capo override"
                  defaultValue={item.override_capo ?? ""}
                />
                <Input
                  name="item_note"
                  placeholder="Note"
                  className="sm:col-span-2"
                  defaultValue={item.item_note ?? ""}
                />
                <Button type="submit" size="sm" className="sm:col-span-2">
                  Save item
                </Button>
              </form>
            </details>
          )}
        </div>
        {editable && (
          <form action={removeSetlistItem}>
            <input type="hidden" name="item_id" value={item.id} />
            <input type="hidden" name="setlist_id" value={setlistId} />
            <Button type="submit" size="sm" variant="ghost">
              Remove
            </Button>
          </form>
        )}
      </div>
    </li>
  );
}

export function SortableSetlist({
  setlistId,
  items: initialItems,
  editable,
  arrangementsBySong = {},
}: {
  setlistId: string;
  items: SetlistItemWithSong[];
  editable: boolean;
  arrangementsBySong?: Record<string, Arrangement[]>;
}) {
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(async () => {
      await reorderSetlistItems(
        setlistId,
        next.map((i) => i.id)
      );
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No songs in this set yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              setlistId={setlistId}
              editable={editable}
              arrangements={
                item.song_id ? arrangementsBySong[item.song_id] ?? [] : []
              }
            />
          ))}
        </ul>
      </SortableContext>
      {pending && (
        <p className="mt-2 text-xs text-muted-foreground">Saving order…</p>
      )}
    </DndContext>
  );
}
