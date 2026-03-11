import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Users, Video } from "lucide-react";
import { meetingsApi, type Meeting } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDuration(start: string, end: string | null) {
  const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function MeetingCard({ meeting, userId }: { meeting: Meeting; userId: string }) {
  const navigate = useNavigate();
  const isHost = meeting.hostId === userId;

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{meeting.title}</h3>
            {isHost && (
              <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                HOST
              </span>
            )}
            {meeting.endedAt ? (
              <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                ENDED
              </span>
            ) : (
              <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent/15 text-accent animate-pulse">
                LIVE
              </span>
            )}
          </div>

          <p className="text-[11px] font-mono text-muted-foreground mb-3">
            {meeting.meetingId}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(meeting.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Video className="w-3.5 h-3.5" />
              {formatDuration(meeting.createdAt, meeting.endedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {meeting.participants.length + 1}
            </span>
          </div>
        </div>

        {!meeting.endedAt && (
          <button
            onClick={() => navigate(`/meeting/${meeting.meetingId}`)}
            className="shrink-0 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition"
          >
            Rejoin
          </button>
        )}
      </div>
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: meetings, isLoading, error } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => meetingsApi.list(),
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Meeting History</h1>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
            {error instanceof Error ? error.message : "Failed to load history"}
          </p>
        )}

        {meetings && meetings.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No meetings yet. Start or join one!</p>
          </div>
        )}

        {meetings && meetings.length > 0 && (
          <div className="space-y-3">
            {meetings.map((m) => (
              <MeetingCard key={m.meetingId} meeting={m} userId={user?.userId ?? ""} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
