"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type MeetingSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  isInstant: boolean;
  startTime: string;
  endTime: string;
  roomName: string;
  joinUrl: string;
  participants: string[];
};

type AddMeetingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meeting: MeetingSummary) => void;
};

type FormState = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isPublic: boolean;
  password: string;
  participants: string;
};

const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$#!";

const generatePassword = (length = 10) => {
  try {
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(length);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(
        bytes,
        (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length],
      ).join("");
    }
    throw new Error("crypto unavailable");
  } catch {
    return Math.random().toString(36).slice(2, 2 + length);
  }
};

const buildDateInputValue = (date: Date) => {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy.toISOString().slice(0, 16);
};

const defaultTimeWindow = () => {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 30);
  start.setSeconds(0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 45);
  return {
    startTime: buildDateInputValue(start),
    endTime: buildDateInputValue(end),
  };
};

const createDefaultFormState = (): FormState => {
  const { startTime, endTime } = defaultTimeWindow();
  return {
    title: "",
    description: "",
    startTime,
    endTime,
    isPublic: true,
    password: generatePassword(),
    participants: "",
  };
};

const normalizeParticipants = (value: string) =>
  value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

export function AddMeetingDialog({
  open,
  onOpenChange,
  onCreated,
}: AddMeetingDialogProps) {
  const [formState, setFormState] = useState<FormState>(createDefaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFormState(createDefaultFormState());
      setError(null);
    }
  }, [open]);

  const handleFieldChange = useCallback(
    <Key extends keyof FormState>(field: Key, value: FormState[Key]) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const participantList = useMemo(
    () => normalizeParticipants(formState.participants),
    [formState.participants],
  );

  const canSubmit = useMemo(() => {
    if (!formState.title.trim()) return false;
    if (!formState.startTime || !formState.endTime) return false;
    if (new Date(formState.endTime) <= new Date(formState.startTime)) return false;
    if (!formState.password || formState.password.length < 6) return false;
    if (!formState.isPublic && participantList.length === 0) return false;
    return true;
  }, [formState, participantList]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSubmit || submitting) return;

      setSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formState.title.trim(),
            description: formState.description.trim() || undefined,
            startTime: formState.startTime,
            endTime: formState.endTime,
            isPublic: formState.isPublic,
            password: formState.password,
            participants: formState.isPublic ? undefined : participantList,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Unable to schedule meeting.");
        }

        const data = (await response.json()) as { meeting: MeetingSummary };
        onCreated(data.meeting);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error occurred.");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, formState, onCreated, participantList, submitting],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a new meeting</DialogTitle>
          <DialogDescription>
            Set the agenda, share details, and your team gets the link instantly.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              placeholder="Design sync"
              value={formState.title}
              onChange={(event) => handleFieldChange("title", event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-description">
              Description <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="meeting-description"
              placeholder="Share agenda, goals, or resources for the session."
              value={formState.description}
              onChange={(event) => handleFieldChange("description", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-start">Start time</Label>
              <Input
                id="meeting-start"
                type="datetime-local"
                value={formState.startTime}
                onChange={(event) => handleFieldChange("startTime", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-end">End time</Label>
              <Input
                id="meeting-end"
                type="datetime-local"
                value={formState.endTime}
                onChange={(event) => handleFieldChange("endTime", event.target.value)}
                required
                aria-invalid={
                  !!formState.startTime &&
                  !!formState.endTime &&
                  new Date(formState.endTime) <= new Date(formState.startTime)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Label>Access</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formState.isPublic ? "default" : "outline"}
                onClick={() => handleFieldChange("isPublic", true)}
              >
                Public link
              </Button>
              <Button
                type="button"
                variant={formState.isPublic ? "outline" : "default"}
                onClick={() => handleFieldChange("isPublic", false)}
              >
                Private invite
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {formState.isPublic
                ? "Anyone with the link and password can join."
                : "Share with specific participants below to restrict access."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="meeting-password">Meeting password</Label>
              <Input
                id="meeting-password"
                value={formState.password}
                minLength={6}
                onChange={(event) => handleFieldChange("password", event.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleFieldChange("password", generatePassword())}
                className="w-full"
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-participants">
              Participant emails{" "}
              <span className="text-xs text-muted-foreground">(comma separated)</span>
            </Label>
            <Textarea
              id="meeting-participants"
              value={formState.participants}
              onChange={(event) => handleFieldChange("participants", event.target.value)}
              placeholder="alex@example.com, jordan@example.com"
              disabled={formState.isPublic}
              aria-required={!formState.isPublic}
            />
            {!formState.isPublic && (
              <p className="text-xs text-muted-foreground">
                Private meetings need at least one participant email.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Scheduling…" : "Schedule meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

