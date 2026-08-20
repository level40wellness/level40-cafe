"use client";

import Image from "next/image";
import { useState } from "react";
import { Pencil, Plus, Trash2, UserCircle } from "lucide-react";

import { TEAM_DESIGNATIONS } from "@/lib/team";
import {
  createTeamMemberAction,
  deleteTeamMemberAction,
  updateTeamMemberAction,
} from "@/server/actions/admin/team";
import type { AdminTeamMember } from "@/server/queries/team";
import { AdminSelect } from "./admin-select";
import { Field, FieldError, FormError, useAdminAction } from "./admin-form";
import { ImageUploader, type DraftImage } from "./image-uploader";
import { Modal } from "./modal";
import { EmptyRow, PanelHead, StatCards } from "./ui";

const DESIGNATION_OPTIONS = TEAM_DESIGNATIONS.map((designation) => ({
  value: designation,
  label: designation,
}));

/** `null` means "new"; a row means "edit"; `undefined` means the modal is shut. */
type Editing = AdminTeamMember | null | undefined;

export function TeamManager({ items }: { items: AdminTeamMember[] }) {
  const [editing, setEditing] = useState<Editing>(undefined);
  const remove = useAdminAction(deleteTeamMemberAction);

  function handleDelete(item: AdminTeamMember) {
    if (!window.confirm(`Remove "${item.name}" from the team? This cannot be undone.`)) {
      return;
    }
    const formData = new FormData();
    formData.set("id", item.id);
    void remove.submit(formData);
  }

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Team members",
            value: String(items.length),
            meta: "Shown under Meet the team",
            accent: true,
          },
          {
            label: "Live",
            value: String(items.filter((m) => m.active).length),
            meta: "Visible on the homepage",
          },
          {
            label: "Hidden",
            value: String(items.filter((m) => !m.active).length),
            meta: "Not published",
          },
        ]}
      />

      <PanelHead
        title="Meet the team"
        subtitle="People shown on the homepage. With no live members the section falls back to its standard text."
      >
        <button
          type="button"
          className="a-btn primary"
          onClick={() => setEditing(null)}
        >
          <Plus size={15} aria-hidden="true" /> Add team member
        </button>
      </PanelHead>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Designation</th>
              <th>Bio</th>
              <th className="right">Sort</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyRow colSpan={6}>
                No team members yet — the homepage shows its standard section.
              </EmptyRow>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="a-who" style={{ gap: ".6rem" }}>
                      {item.imagePath ? (
                        <Image
                          src={item.imagePath}
                          alt=""
                          width={36}
                          height={36}
                          className="a-img-thumb"
                          style={{ borderRadius: "50%", objectFit: "cover" }}
                          unoptimized
                        />
                      ) : (
                        <UserCircle
                          size={32}
                          aria-hidden="true"
                          style={{ opacity: 0.4, flexShrink: 0 }}
                        />
                      )}
                      <span className="primary-cell">{item.name}</span>
                    </div>
                  </td>
                  <td>{item.designation}</td>
                  <td>
                    <span className="muted">
                      {item.bio
                        ? item.bio.length > 70
                          ? `${item.bio.slice(0, 70)}…`
                          : item.bio
                        : "—"}
                    </span>
                  </td>
                  <td className="right num">{item.sortOrder}</td>
                  <td>
                    <span
                      className={`a-badge ${item.active ? "active" : "cancelled"}`}
                      style={{ marginLeft: 0 }}
                    >
                      {item.active ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="right">
                    <button
                      type="button"
                      className="a-icon-btn"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setEditing(item)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="a-icon-btn"
                      aria-label={`Delete ${item.name}`}
                      disabled={remove.pending}
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <TeamMemberDialog member={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

function TeamMemberDialog({
  member,
  onClose,
}: {
  member: AdminTeamMember | null;
  onClose: () => void;
}) {
  const isEdit = member !== null;
  const form = useAdminAction(
    isEdit ? updateTeamMemberAction : createTeamMemberAction,
    { onSuccess: onClose },
  );

  const [designation, setDesignation] = useState<string>(
    member?.designation ?? "",
  );
  const [photo, setPhoto] = useState<DraftImage[]>(
    member?.imagePath ? [{ path: member.imagePath }] : [],
  );

  return (
    <Modal
      title={isEdit ? "Edit team member" : "New team member"}
      subtitle={isEdit ? member.name : "Shown under Meet the team"}
      onClose={onClose}
    >
      <form action={form.submit} className="a-stack">
        {isEdit && <input type="hidden" name="id" value={member.id} />}
        {/* Both controls are custom components, so their values post via
            hidden inputs. */}
        <input type="hidden" name="designation" value={designation} />
        <input type="hidden" name="imagePath" value={photo[0]?.path ?? ""} />
        <FormError message={form.formError} />

        <Field label="Name" htmlFor="member-name" error={form.fieldErrors?.name}>
          <input
            id="member-name"
            name="name"
            className="a-input"
            defaultValue={member?.name ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.name)}
            placeholder="e.g. Nicky Sharma"
            required
            maxLength={80}
          />
        </Field>

        {/* Field wants an htmlFor, but AdminSelect renders a button with its
            own aria-label — so this one is laid out by hand. */}
        <div className="a-field">
          <span className="a-field-label">Designation</span>
          <AdminSelect
            options={DESIGNATION_OPTIONS}
            value={designation || undefined}
            placeholder="Select a designation…"
            label="Designation"
            onSelect={setDesignation}
          />
          <FieldError message={form.fieldErrors?.designation} />
        </div>

        <Field label="Short bio" htmlFor="member-bio" error={form.fieldErrors?.bio}>
          <textarea
            id="member-bio"
            name="bio"
            className="a-input"
            rows={3}
            defaultValue={member?.bio ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.bio)}
            placeholder="One or two sentences shown under the name."
            maxLength={500}
          />
        </Field>

        <ImageUploader value={photo} onChange={setPhoto} max={1} label="Photo" />
        <FieldError message={form.fieldErrors?.imagePath} />

        <Field
          label="Sort order"
          htmlFor="member-sort"
          error={form.fieldErrors?.sortOrder}
        >
          <input
            id="member-sort"
            name="sortOrder"
            className="a-input"
            type="number"
            min={0}
            max={9999}
            defaultValue={member?.sortOrder ?? 0}
          />
        </Field>

        <label className="a-check">
          <input
            type="checkbox"
            name="active"
            defaultChecked={member?.active ?? true}
          />
          Visible on the site
        </label>

        <div className="a-modal-foot" style={{ margin: "0 -1.6rem -1.6rem" }}>
          <button type="button" className="a-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="a-btn primary" disabled={form.pending}>
            {form.pending ? "Saving…" : "Save member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
