import { useState, useEffect } from "react";
import { Play, Settings, Database, Terminal, Shield, LogOut, Eye, EyeOff, Sparkles, Volume2, ShieldAlert } from "lucide-react";
import { PlayerProfile } from "./Registration";
import { Slider } from "@/components/ui/slider";

interface MainMenuProps {
  profile: PlayerProfile;
  onStartGame: () => void;
  onReset: () => void;
}

export function MainMenu({ profile, onStartGame, onReset }: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<"menu" | "database" | "settings" | "credits">("menu");
  const [showPin, setShowPin] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [glitchIntensity, setGlitchIntensity] = useState([50]);
  const [systemSpec, setSystemSpec] = useState({
    os: "Unknown",
    ip: "Scanning...",
    cameras: 0,
    mics: 0,
    headphones: "Unconfirmed",
    resolution: "Unknown",
    cores: "Unknown",
  });

  useEffect(() => {
    // Populate dynamic system telemetry info
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent;
      let detectedOS = "Unknown OS";
      if (/Windows/i.test(userAgent)) detectedOS = "Windows";
      else if (/Mac OS X|Macintosh/i.test(userAgent)) detectedOS = "macOS";
      else if (/Linux/i.test(userAgent)) detectedOS = "Linux";
      else if (/Android/i.test(userAgent)) detectedOS = "Android";
      else if (/iPhone|iPad|iPod/i.test(userAgent)) detectedOS = "iOS";

      // Detect resolution & cores
      const res = `${window.screen.width}x${window.screen.height}`;
      const cores = window.navigator.hardwareConcurrency?.toString() || "?";

      // Gather media device metadata silently
      navigator.mediaDevices?.enumerateDevices()
        .then((devices) => {
          const cameras = devices.filter((d) => d.kind === "videoinput").length;
          const mics = devices.filter((d) => d.kind === "audioinput").length;
          const headphones = devices.some(
            (d) =>
              d.label.toLowerCase().includes("headphone") ||
              d.label.toLowerCase().includes("headset") ||
              d.label.toLowerCase().includes("earphone")
          ) ? "Detected" : "Not Detected";

          setSystemSpec((prev) => ({
            ...prev,
            os: detectedOS,
            cameras,
            mics,
            headphones,
            cores,
            resolution: res,
          }));
        })
        .catch(() => {
          setSystemSpec((prev) => ({
            ...prev,
            os: detectedOS,
            cores,
            resolution: res,
          }));
        });
    }

    // Try fetching network IP silently
    fetch("https://get.geojs.io/v1/ip/geo.json")
      .then((res) => res.json())
      .then((data) => {
        setSystemSpec((prev) => ({ ...prev, ip: data.ip || "127.0.0.1" }));
      })
      .catch(() => {
        setSystemSpec((prev) => ({ ...prev, ip: "192.168.1.72" }));
      });
  }, []);

  const playClickSound = () => {
    try {
      const audio = new Audio("/beep.mp3");
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}
  };

  const handleStart = () => {
    playClickSound();
    onStartGame();
  };

  const handleReset = () => {
    playClickSound();
    if (confirm("WARNING: Purging identity will format local credentials. Proceed?")) {
      onReset();
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-8 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
        
        {/* Glowing floating decorative ambient meshes inside card */}
        <div className="absolute -right-20 -top-20 -z-10 h-44 w-44 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 -z-10 h-44 w-44 rounded-full bg-pink-500/20 blur-3xl" />

        {/* Global synchronization bar */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Custom Mini Avatar Node */}
            <div
              className="h-8 w-8 rounded-md border border-white/10 shrink-0"
              style={{
                backgroundColor: profile.avatarColor,
                boxShadow: `0 0 12px ${profile.avatarColor}`,
              }}
            />
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-white tracking-wide uppercase">
                {profile.username}
              </span>
              <span className="font-mono text-[9px] text-slate-400">
                Subject Sync: {profile.avatarName}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-green-400">
              SYNCHRONIZED
            </span>
          </div>
        </div>

        {/* Main interactive panel */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <h2 className="text-2xl font-extrabold tracking-widest text-white uppercase flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-pink-400 animate-pulse" />
                Pastel Psychosis
              </h2>
              <p className="font-mono text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                NEURAL INTEGRATION EVALUATION ENVIRONMENT
              </p>
            </div>

            {/* Menu options list */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStart}
                className="group relative flex items-center justify-between rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-transparent p-4 text-left outline-none transition-all duration-300 hover:scale-[1.02] hover:border-pink-500/50 hover:bg-pink-500/20 active:scale-98 shadow-md hover:shadow-pink-500/5"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-pink-500/20 p-2 text-pink-300 group-hover:scale-110 transition-transform">
                    <Play className="h-5 w-5 fill-current" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                      Start Assessment
                    </div>
                    <div className="font-mono text-[9px] text-pink-300/80">
                      Initialize volumetric cute cube interface
                    </div>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_8px_#ec4899] animate-ping" />
              </button>

              <button
                onClick={() => { playClickSound(); setActiveTab("database"); }}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 text-left outline-none transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/20 p-2 text-purple-300 group-hover:scale-110 transition-transform">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                      Diagnostic Database
                    </div>
                    <div className="font-mono text-[9px] text-slate-400">
                      Query system parameters and hardware scan
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { playClickSound(); setActiveTab("settings"); }}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 text-left outline-none transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-sky-500/20 p-2 text-sky-300 group-hover:scale-110 transition-transform">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                      Modulation Settings
                    </div>
                    <div className="font-mono text-[9px] text-slate-400">
                      Calibrate volume, glitch matrix, and telemetry
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { playClickSound(); setActiveTab("credits"); }}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 text-left outline-none transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/20 p-2 text-amber-300 group-hover:scale-110 transition-transform">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                      Psychological Safety Logs
                    </div>
                    <div className="font-mono text-[9px] text-slate-400">
                      Read development warnings and credits
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-white/10 mt-6 flex justify-end">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-red-300 hover:bg-red-500/20 transition-all active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5" />
                Purge User Identity
              </button>
            </div>
          </div>
        )}

        {/* Database Diagnostic Spec overlay */}
        {activeTab === "database" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-mono text-sm font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2">
                <Database className="h-4 w-4" />
                Diagnostic Telemetry Database
              </h3>
              <button
                onClick={() => { playClickSound(); setActiveTab("menu"); }}
                className="font-mono text-[10px] text-slate-400 hover:text-white uppercase"
              >
                &lt; BACK TO DASHBOARD
              </button>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/40 p-4 space-y-3 font-mono text-[11px] leading-relaxed">
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">REGISTERED CODENAME:</span>
                <span className="text-white font-bold">{profile.username}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">VECTOR PROFILE MAPPING:</span>
                <span className="font-semibold" style={{ color: profile.avatarColor }}>
                  {profile.avatarName} ({profile.avatarColor})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">ACCESS PINCODE:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-white tracking-widest">{showPin ? profile.pin : "••••"}</span>
                  <button onClick={() => setShowPin(!showPin)} className="text-slate-400 hover:text-white">
                    {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">HOST OPERATING SYSTEM:</span>
                <span className="text-purple-300 font-semibold">{systemSpec.os}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">CPU PHYSICAL CORE COUNT:</span>
                <span className="text-sky-300">{systemSpec.cores} Cores</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">MONITOR RESOLUTION:</span>
                <span className="text-sky-300">{systemSpec.resolution}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">NETWORK IP ADDR LEAK:</span>
                <span className="text-amber-300 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                  {systemSpec.ip}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">HARDWARE CAMERA INPUTS:</span>
                <span className="text-white">{systemSpec.cameras} Detected</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">HARDWARE MICROPHONES:</span>
                <span className="text-white">{systemSpec.mics} Detected</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 py-1">
                <span className="text-slate-400">ACOUSTIC DUPLEX FEEDS:</span>
                <span className="text-white">{systemSpec.headphones}</span>
              </div>
              
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[10px] leading-relaxed text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 animate-pulse" />
                <div>
                  <span className="font-bold">ALERT:</span> Neural diagnostic system is highly experimental. Subject telemetry shows slightly unstable brain synchrony. Handle game loop with immediate caution.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modulation Settings Overlay */}
        {activeTab === "settings" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-mono text-sm font-bold text-sky-300 uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-4 w-4" />
                System Modulation Controls
              </h3>
              <button
                onClick={() => { playClickSound(); setActiveTab("menu"); }}
                className="font-mono text-[10px] text-slate-400 hover:text-white uppercase"
              >
                &lt; BACK TO DASHBOARD
              </button>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/40 p-5 space-y-6">
              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-sky-400" />
                    MASTER DECIBEL LEVEL
                  </span>
                  <span>{volume}%</span>
                </div>
                <Slider
                  defaultValue={volume}
                  max={100}
                  step={1}
                  onValueChange={(val) => setVolume(val)}
                  className="[&_[role=slider]]:bg-sky-400"
                />
              </div>

              {/* Glitch Frequency Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-pink-400" />
                    PSYCHOTIC GLITCH RATIO
                  </span>
                  <span className={glitchIntensity[0] > 75 ? "text-red-400 font-bold" : "text-slate-300"}>
                    {glitchIntensity[0] > 75 ? "PSYCHOTIC" : glitchIntensity[0] > 40 ? "MODERATE" : "STABLE"} ({glitchIntensity}%)
                  </span>
                </div>
                <Slider
                  defaultValue={glitchIntensity}
                  max={100}
                  step={5}
                  onValueChange={(val) => setGlitchIntensity(val)}
                  className="[&_[role=slider]]:bg-pink-400"
                />
              </div>

              {/* Console logs toggle */}
              <div className="border-t border-white/5 pt-4 space-y-3 font-mono text-[11px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>TELEMETRY LEAK TRANSMISSIONS</span>
                  <span className="text-green-400 font-bold">UPLINK ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ENVIRONMENT SCANNER SCAN RATIO</span>
                  <span className="text-purple-300 font-bold">25 PINGS/SEC</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety logs & credits overlay */}
        {activeTab === "credits" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-mono text-sm font-bold text-amber-300 uppercase tracking-widest flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Psychological Safety Log Archive
              </h3>
              <button
                onClick={() => { playClickSound(); setActiveTab("menu"); }}
                className="font-mono text-[10px] text-slate-400 hover:text-white uppercase"
              >
                &lt; BACK TO DASHBOARD
              </button>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-[10px] text-slate-300 space-y-3 leading-relaxed">
              <div className="h-40 overflow-y-auto pr-1 space-y-2 custom-scrollbar text-[9px] uppercase">
                <p className="text-red-400 font-bold border-b border-red-500/20 pb-1">--- SECURITY PROTOCOL NOTICE ---</p>
                <p>Log 48-1A: Subject has initialized Pastel Psychosis environment.</p>
                <p>Log 48-1B: WebRTC scan successfully gathered network credentials.</p>
                <p>Log 48-2A: High frequency acoustic knocking rescheduled for Level 4.</p>
                <p>Log 48-3B: Observational surveillance active. Eye vectors rendering...</p>
                <p className="text-pink-300 font-bold border-b border-pink-500/20 pt-1 pb-1">--- GAMEPLAY PROTOCOLS ---</p>
                <p>Collect 5 stars to advance level loops.</p>
                <p>Level 3 initiates dimensional layout collapse. Watch step.</p>
                <p>Level 5 triggers active host registry leak. Do not close browser.</p>
                <p className="text-sky-300 font-bold border-b border-sky-500/20 pt-1 pb-1">--- CREDITS ---</p>
                <p>Produced by: The Psychosis Evaluation Team</p>
                <p>Lead Engineer: Antigravity AI Pair</p>
                <p>Visual Aesthetics: Premium OKLCH Glassmorphism</p>
                <p>3D Spatial Core: Three.js isometric rasterizer</p>
                <p>State Manager: TanStack Router Engine</p>
              </div>
              <div className="text-[9px] text-slate-500 border-t border-white/10 pt-2 flex items-center gap-1.5 uppercase">
                <Shield className="h-3 w-3 shrink-0" />
                Subject memory encryption fully synchronized with active session.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Basic keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
}
