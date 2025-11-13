'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  CalendarClock,
  Clock,
  Plus,
  RefreshCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import { toast } from "sonner";

import { AddMeetingDialog } from "@/components/add-meeting-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const HIGHLIGHTS = [
  {
    title: "Secure Access",
    description: "Passwords and private invites keep every room protected.",
    icon: ShieldCheck,
  },
  {
    title: "Team Presence",
    description: "See who is meeting today and track attendance effortlessly.",
    icon: Users2,
  },
  {
    title: "Smart Scheduling",
    description: "Focus on what matters—Meet auto-balances your upcoming load.",
    icon: Sparkles,
  },
] as const;

const statusTone = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "border border-success/30 bg-success/15 text-success";
    case "SCHEDULED":
      return "border border-primary/35 bg-primary/15 text-primary";
    case "ENDED":
      return "border border-muted/50 bg-muted/25 text-muted-foreground";
    default:
      return "border border-border text-muted-foreground";
  }
};

const accessTone = (isPublic: boolean) =>
  isPublic
    ? "border border-secondary/35 bg-secondary/20 text-secondary-foreground"
    : "border border-accent/35 bg-accent/18 text-accent-foreground";

export default function Home() {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creatingInstant, setCreatingInstant] = useState(false);

  const refreshMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/meetings");
      if (!response.ok) {
        throw new Error("Unable to load meetings right now.");
      }

      const data = (await response.json()) as { meetings: MeetingSummary[] };
      setMeetings(data.meetings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error loading meetings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMeetings();
  }, [refreshMeetings]);

  const now = useMemo(() => new Date(), [meetings]);

  const sortedMeetings = useMemo(
    () =>
      [...meetings].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    [meetings],
  );

  const upcomingMeetings = useMemo(
    () =>
      sortedMeetings
        .filter((meeting) => new Date(meeting.endTime).getTime() >= now.getTime())
        .slice(0, 5),
    [sortedMeetings, now],
  );

  const totalMeetings = meetings.length;
  const activeMeetings = meetings.filter((meeting) => meeting.status === "ACTIVE").length;
  const totalParticipants = meetings.reduce(
    (sum, meeting) => sum + meeting.participants.length,
    0,
  );
  const nextMeeting = upcomingMeetings[0] ?? null;

  const handleCopyShareLink = useCallback(async (url: string, successMessage?: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(successMessage ?? "Share link copied to clipboard.");
    } catch (err) {
      toast.error("Could not copy the link, please try again.");
      console.error(err);
    }
  }, []);

  const handleInstantMeeting = useCallback(async () => {
    const title = window.prompt("Name your instant meeting", "Instant Meeting");
    if (!title) return;

    setCreatingInstant(true);
    try {
      const response = await fetch("/api/meetings/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, isPublic: true }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to create instant meeting.");
      }

      const data = (await response.json()) as { meeting: MeetingSummary };
      setMeetings((prev) => [data.meeting, ...prev]);
      toast.success("Instant meeting is ready. Link copied to clipboard.");
      await handleCopyShareLink(data.meeting.joinUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Instant meeting failed.");
    } finally {
      setCreatingInstant(false);
    }
  }, [handleCopyShareLink]);

  const handleMeetingCreated = useCallback(
    (meeting: MeetingSummary) => {
      setMeetings((prev) => [meeting, ...prev]);
      setIsDialogOpen(false);
      void handleCopyShareLink(
        meeting.joinUrl,
        "Meeting scheduled—share link copied to clipboard.",
      );
    },
    [handleCopyShareLink],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12">
      <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/18 via-primary/8 to-card shadow-brand">
        <div className="pointer-events-none absolute -top-20 right-6 h-60 w-60 rounded-full bg-primary/20 blur-3xl sm:h-72 sm:w-72" />
        <CardHeader className="relative z-10 space-y-6 pb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Badge className="border border-primary/40 bg-primary/15 text-primary">
              Executive view
            </Badge>
            <Separator orientation="vertical" className="hidden h-6 lg:block" />
            <span className="text-sm font-medium text-muted-foreground sm:text-base">
              {totalMeetings === 0
                ? "No meetings yet — start by scheduling the first one."
                : `${totalMeetings} meeting${totalMeetings === 1 ? "" : "s"} on the calendar`}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-3xl font-semibold text-foreground sm:text-4xl">
              Plan, host, and share meetings with a single glance.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Manage your upcoming schedule, send polished share links, and keep participants
              in sync with a dashboard crafted for modern teams.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="size-4" />
              Add meeting
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={refreshMeetings}
              disabled={loading}
            >
              <RefreshCcw className="size-4" />
              {loading ? "Refreshing…" : "Refresh data"}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleInstantMeeting}
              disabled={creatingInstant}
            >
              <CalendarClock className="size-4" />
              {creatingInstant ? "Starting…" : "Start instant meeting"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border border-danger/40 bg-danger/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-danger">
              Something went wrong
            </CardTitle>
            <CardDescription className="text-sm text-danger">
              {error} Try refreshing the data.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
              <Users2 className="size-4 text-primary" />
              Total meetings
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-foreground sm:text-3xl">
              {totalMeetings}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {totalMeetings > 0
              ? `${activeMeetings} active today · ${totalParticipants} participant${
                  totalParticipants === 1 ? "" : "s"
                } invited`
              : "Invite your team to their first session."}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
              <Clock className="size-4 text-primary" />
              Next meeting
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-foreground sm:text-3xl">
              {nextMeeting
                ? format(new Date(nextMeeting.startTime), "MMM d · h:mm a")
                : "No upcoming"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {nextMeeting
              ? `Starts ${formatDistanceToNow(new Date(nextMeeting.startTime), {
                  addSuffix: true,
                })}`
              : "Schedule a session to see it here."}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
              <Share2 className="size-4 text-primary" />
              Ready to share
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-foreground sm:text-3xl">
              {upcomingMeetings.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {upcomingMeetings.length > 0
              ? "Copy polished share links with a single click."
              : "Upcoming meetings will show here automatically."}
          </CardContent>
        </Card>
      </section>

      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-semibold text-foreground sm:text-2xl">
                Upcoming schedule
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground sm:text-base">
                The next five meetings across your workspace.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border border-primary/40 bg-primary/12 text-primary"
            >
              {meetings.length} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%] text-muted-foreground">Title</TableHead>
                  <TableHead className="w-[26%] text-muted-foreground">Schedule</TableHead>
                  <TableHead className="w-[18%] text-muted-foreground">Type</TableHead>
                  <TableHead className="w-[12%] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading meetings…
                    </TableCell>
                  </TableRow>
                ) : upcomingMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {meetings.length === 0
                        ? "You have no meetings scheduled yet. Create one to get started."
                        : "No upcoming meetings—everything is wrapped for now."}
                    </TableCell>
                  </TableRow>
                ) : (
                  upcomingMeetings.map((meeting) => (
                    <TableRow key={meeting.id} className="hover:bg-muted/25">
                      <TableCell className="align-top">
                        <div className="font-medium text-foreground">{meeting.title}</div>
                        {meeting.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {meeting.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {format(new Date(meeting.startTime), "MMM d · h:mm a")}
                        </div>
                        <div className="text-xs">
                          Ends {format(new Date(meeting.endTime), "MMM d · h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-2">
                          <Badge className={accessTone(meeting.isPublic)}>
                            {meeting.isInstant ? "Instant" : "Scheduled"}
                          </Badge>
                          <Badge className="border border-muted/50 bg-muted/30 text-muted-foreground">
                            {meeting.isPublic ? "Public access" : "Private group"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge className={statusTone(meeting.status)}>
                          {meeting.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full min-w-[120px] justify-center sm:w-auto"
                          onClick={() => handleCopyShareLink(meeting.joinUrl)}
                        >
                          <Share2 className="size-4" />
                          Copy link
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground sm:text-2xl">
            Highlights
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground sm:text-base">
            Built-in guardrails and insights keep every meeting polished.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-5 shadow-sm transition-colors hover:bg-background/90"
            >
              <Badge className="w-fit border border-primary/30 bg-primary/12 text-primary">
                <Icon className="size-4" />
              </Badge>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AddMeetingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={handleMeetingCreated}
      />
    </main>
  );
}