import { Video, Phone, LogIn, Clock, Globe, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { meetingsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const LANGUAGES = [
  { code: "EN", name: "English", color: "bg-lang-teal" },
  { code: "PT", name: "Portuguese", color: "bg-lang-blue" },
  { code: "FR", name: "French", color: "bg-lang-orange" },
  { code: "ZH", name: "Mandarin", color: "bg-lang-yellow" },
  { code: "ZU", name: "Zulu", color: "bg-lang-purple" },
  { code: "XIT", name: "Changana", color: "bg-lang-pink" },
];

const ActionCard = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="group flex flex-col items-center gap-4 p-8 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-[0_0_30px_hsl(162_100%_60%/0.08)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors">
      <Icon className="w-6 h-6 text-foreground group-hover:text-accent transition-colors" />
    </div>
    <div className="text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  </button>
);

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  function generateLocalCode() {
    // 8 char alphanumeric code — shareable without a backend
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  async function startMeeting(audioOnly: boolean) {
    setIsCreating(true);
    try {
      const meeting = await meetingsApi.create(
        audioOnly ? "Voice Call" : "Video Meeting",
        "EN"
      );
      navigate(`/meeting/${meeting.meetingId}`);
    } catch {
      // Backend unavailable — generate a local code so the URL is shareable
      navigate(`/meeting/${generateLocalCode()}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Top-right: user info + logout */}
      {user && (
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">{user.displayName}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}

      {/* Logo / Brand */}
      <div className="mb-16 text-center animate-fade-in-up">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Globe className="w-8 h-8 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ocular<span className="text-accent">Sound</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          Speak your language. Be understood everywhere.
        </p>
      </div>

      {/* Action cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 w-full max-w-3xl animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <ActionCard
          icon={Phone}
          title="Voice Call"
          subtitle="Audio only"
          onClick={() => startMeeting(true)}
          disabled={isCreating}
        />
        <ActionCard
          icon={Video}
          title="Video Meeting"
          subtitle="Full experience"
          onClick={() => startMeeting(false)}
          disabled={isCreating}
        />
        <ActionCard
          icon={LogIn}
          title="Join Meeting"
          subtitle="Enter code"
          onClick={() => navigate("/join")}
        />
        <ActionCard
          icon={Clock}
          title="History"
          subtitle="Past meetings"
          onClick={() => navigate("/history")}
        />
      </div>

      {/* Language strip */}
      <div
        className="flex items-center gap-3 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
          Languages
        </span>
        <div className="flex items-center gap-2">
          {LANGUAGES.map((lang) => (
            <div key={lang.code} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border">
              <div className={`w-1.5 h-1.5 rounded-full ${lang.color}`} />
              <span className="text-[10px] font-mono text-secondary-foreground">{lang.code}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
