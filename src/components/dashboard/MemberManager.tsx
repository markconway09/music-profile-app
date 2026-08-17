"use client";

import { useState, useTransition } from "react";
import { addGroupMember, removeGroupMember, updateGroupMember } from "@/app/dashboard/actions";

type Member = { id: string; name: string; imageUrl: string | null };

export function MemberManager({ groupId, members }: { groupId: string; members: Member[] }) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-black/50 underline dark:text-white/50"
      >
        {expanded ? "Hide member list" : "Add / edit members manually"}
      </button>

      {expanded && (
        <div className={`mt-2 flex flex-col gap-2 ${isPending ? "opacity-60" : ""}`}>
          {members.map((m) =>
            editingId === m.id ? (
              <EditMemberRow
                key={m.id}
                member={m}
                onCancel={() => setEditingId(null)}
                onSave={(name, imageUrl) => {
                  setEditingId(null);
                  startTransition(async () => {
                    await updateGroupMember(m.id, name, imageUrl);
                  });
                }}
              />
            ) : (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{m.name}</span>
                <button
                  type="button"
                  onClick={() => setEditingId(m.id)}
                  className="text-black/40 underline dark:text-white/40"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await removeGroupMember(m.id);
                    })
                  }
                  className="text-black/40 hover:text-red-600 dark:text-white/40"
                >
                  Remove
                </button>
              </div>
            )
          )}

          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              const name = newName;
              const imageUrl = newImageUrl;
              setNewName("");
              setNewImageUrl("");
              startTransition(async () => {
                await addGroupMember(groupId, name, imageUrl || undefined);
              });
            }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Member name"
              className="min-w-0 flex-1 rounded-md border border-black/10 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
            />
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Photo URL (optional)"
              className="min-w-0 flex-1 rounded-md border border-black/10 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="rounded-md bg-foreground px-3 py-1 text-sm text-background disabled:opacity-50"
            >
              Add member
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function EditMemberRow({
  member,
  onSave,
  onCancel,
}: {
  member: Member;
  onSave: (name: string, imageUrl?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [imageUrl, setImageUrl] = useState(member.imageUrl ?? "");

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave(name, imageUrl || undefined);
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-black/10 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Photo URL"
        className="min-w-0 flex-1 rounded-md border border-black/10 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <button
        type="submit"
        className="rounded-md bg-foreground px-3 py-1 text-sm text-background"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-black/10 px-3 py-1 text-sm dark:border-white/20"
      >
        Cancel
      </button>
    </form>
  );
}
