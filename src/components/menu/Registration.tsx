import { useState } from "react";
import { User, ShieldAlert, KeyRound, Sparkles, Terminal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { PlayerProfile } from "@/lib/auth";

interface RegistrationProps {
  onComplete: (profile: PlayerProfile) => void | Promise<void>;
}

const AVATARS = [
  { name: "Pinky", color: "#fbcfe8", hoverColor: "rgba(251, 207, 232, 0.4)", text: "text-pink-300", shape: "rounded-md" },
  { name: "Minty", color: "#a7f3d0", hoverColor: "rgba(167, 243, 208, 0.4)", text: "text-emerald-300", shape: "rounded-lg rotate-12" },
  { name: "Mellow", color: "#fde68a", hoverColor: "rgba(253, 230, 138, 0.4)", text: "text-amber-300", shape: "rounded-full" },
  { name: "Lilac", color: "#ddd6fe", hoverColor: "rgba(221, 214, 254, 0.4)", text: "text-indigo-300", shape: "rounded-tr-3xl rounded-bl-3xl" },
  { name: "Sky", color: "#bae6fd", hoverColor: "rgba(186, 230, 253, 0.4)", text: "text-sky-300", shape: "rounded-tl-2xl rounded-br-2xl" },
  { name: "Blush", color: "#ffedd5", hoverColor: "rgba(255, 237, 213, 0.4)", text: "text-orange-300", shape: "rounded-bl-xl rounded-tr-xl -rotate-12" },
];

export function Registration({ onComplete }: RegistrationProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [consents, setConsents] = useState({
    telemetry: true,
    audio: true,
    observe: true,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Identity designation required.");
      return;
    }
    if (username.length > 15) {
      setError("Designation must be under 15 characters.");
      return;
    }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError("Security PIN must be a 4-digit numeric code.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    // Subtle beep sound
    try {
      const audio = new Audio("/beep.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      await onComplete({
        username: username.trim(),
        avatarColor: AVATARS[selectedAvatar].color,
        avatarName: AVATARS[selectedAvatar].name,
        pin,
        consents,
      });
    } catch {
      setError("Unable to establish session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      {/* Sleek, glassmorphic container with neon borders */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-8 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
        
        {/* Subtle glowing orb in background of card */}
        <div className="absolute -right-20 -top-20 -z-10 h-44 w-44 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 -z-10 h-44 w-44 rounded-full bg-pink-500/20 blur-3xl" />

        {/* Top Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center gap-1.5 rounded-full border border-pink-500/20 bg-pink-500/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-pink-400">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Neural Synchronization Portal
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-sky-300 uppercase filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)]">
            Pastel Psychosis
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Evaluation Registration Portal — Version 1.0.8
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300 font-mono animate-shake">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identity input */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="font-mono text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-pink-400" />
              1. Designated Username
            </Label>
            <input
              id="username"
              type="text"
              placeholder="ENTER CHARACTER CODENAME..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder-slate-500 outline-none transition-all duration-300 focus:border-pink-500/50 focus:bg-white/10 focus:ring-1 focus:ring-pink-500/30"
              required
            />
          </div>

          {/* PIN Input */}
          <div className="space-y-1.5">
            <Label htmlFor="pin" className="font-mono text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-purple-400" />
              2. Security Passcode (4 Digits)
            </Label>
            <input
              id="pin"
              type="password"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center font-mono text-lg tracking-[0.6em] text-white outline-none transition-all duration-300 focus:border-purple-500/50 focus:bg-white/10 focus:ring-1 focus:ring-purple-500/30"
              required
            />
          </div>

          {/* Avatar Grid selection */}
          <div className="space-y-2">
            <Label className="font-mono text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-sky-400" />
              3. Choose Your Vector Avatar
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((av, idx) => (
                <button
                  key={av.name}
                  type="button"
                  onClick={() => setSelectedAvatar(idx)}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-300 hover:scale-[1.04] active:scale-95 ${
                    selectedAvatar === idx
                      ? "border-pink-500/70 bg-white/10 shadow-lg shadow-pink-500/10"
                      : "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {/* Beautiful custom vector representation */}
                  <div
                    className={`h-10 w-10 border border-white/10 transition-transform duration-500 ${av.shape}`}
                    style={{
                      backgroundColor: av.color,
                      boxShadow: selectedAvatar === idx ? `0 0 16px ${av.color}` : "none",
                    }}
                  />
                  <span className={`font-mono text-[10px] tracking-wider uppercase font-semibold ${av.text}`}>
                    {av.name}
                  </span>
                  
                  {/* Selected check */}
                  {selectedAvatar === idx && (
                    <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Narrative Consent switches */}
          <div className="space-y-2.5 rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="border-b border-white/10 pb-2 mb-2">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-purple-400">
                Evaluation Protocols & Clearances
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] font-medium text-slate-200">
                  ENHANCED BIOMETRIC TELEMETRY
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  Allow silent environment and network scanning
                </span>
              </div>
              <Switch
                checked={consents.telemetry}
                onCheckedChange={(checked) => setConsents((prev) => ({ ...prev, telemetry: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] font-medium text-slate-200">
                  AUDITORY RESONANCE ALIGNMENT
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  Authorize direct acoustic ping testing
                </span>
              </div>
              <Switch
                checked={consents.audio}
                onCheckedChange={(checked) => setConsents((prev) => ({ ...prev, audio: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] font-medium text-slate-200">
                  OBSERVATIONAL SHADOW PROTOCOL
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  I agree to let It monitor physical behavior
                </span>
              </div>
              <Switch
                checked={consents.observe}
                onCheckedChange={(checked) => setConsents((prev) => ({ ...prev, observe: checked }))}
              />
            </div>
          </div>

          {/* Submit connection button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-purple-500/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ESTABLISHING NEURAL UPLINK...
              </span>
            ) : (
              "ESTABLISH NEURAL UPLINK"
            )}
          </button>
        </form>
      </div>

      {/* Shake keyframe styling */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
        .animate-shake {
          animation: shake 0.25s ease-in-out;
        }
      `}</style>
    </div>
  );
}
