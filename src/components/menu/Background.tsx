import { useEffect, useState } from "react";

export function Background() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // Generate some random floating particles
    const items = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage x
      y: 100 + Math.random() * 20, // start below screen
      size: 4 + Math.random() * 12, // size in px
      delay: Math.random() * 10, // animation delay in s
      duration: 15 + Math.random() * 20, // speed in s
    }));
    setParticles(items);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black select-none pointer-events-none z-0">
      {/* Premium animated pastel mesh gradient */}
      <div className="absolute inset-0 opacity-60">
        <div className="mesh-gradient-orb orb-1" />
        <div className="mesh-gradient-orb orb-2" />
        <div className="mesh-gradient-orb orb-3" />
        <div className="mesh-gradient-orb orb-4" />
      </div>

      {/* Floating glassmorphic particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-white/10 border border-white/20 backdrop-blur-[1px] animate-float"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Retro CRT scanlines overlay for high-end aesthetic */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.03]" />
      
      {/* Soft ambient vignette */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

      {/* Custom Styles */}
      <style>{`
        .mesh-gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          mix-blend-mode: screen;
          opacity: 0.75;
          animation: float-orb 25s infinite alternate ease-in-out;
        }

        .orb-1 {
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, oklch(0.85 0.12 320) 0%, transparent 70%); /* Soft Pink */
          left: -10%;
          top: -10%;
          animation-duration: 28s;
        }

        .orb-2 {
          width: 45vw;
          height: 45vw;
          background: radial-gradient(circle, oklch(0.82 0.08 260) 0%, transparent 70%); /* Soft Lilac */
          right: -5%;
          top: 15%;
          animation-duration: 22s;
          animation-delay: -4s;
        }

        .orb-3 {
          width: 55vw;
          height: 55vw;
          background: radial-gradient(circle, oklch(0.88 0.1 190) 0%, transparent 70%); /* Soft Cyan/Mint */
          left: 15%;
          bottom: -15%;
          animation-duration: 32s;
          animation-delay: -8s;
        }

        .orb-4 {
          width: 40vw;
          height: 40vw;
          background: radial-gradient(circle, oklch(0.92 0.12 90) 0%, transparent 70%); /* Mellow Yellow */
          right: 20%;
          bottom: 25%;
          animation-duration: 26s;
          animation-delay: -12s;
        }

        @keyframes float-orb {
          0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          50% {
            transform: translate(8%, -6%) scale(1.1) rotate(180deg);
          }
          100% {
            transform: translate(-5%, 8%) scale(0.9) rotate(360deg);
          }
        }

        @keyframes float-up {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          5% {
            opacity: 0.6;
          }
          95% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-115vh) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-float {
          animation-name: float-up;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .bg-scanlines {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.25) 50%
          ), linear-gradient(
            90deg, 
            rgba(255, 0, 0, 0.06), 
            rgba(0, 255, 0, 0.02), 
            rgba(0, 0, 255, 0.06)
          );
          background-size: 100% 4px, 6px 100%;
        }

        .bg-radial-vignette {
          background: radial-gradient(circle, transparent 20%, rgba(0, 0, 0, 0.4) 80%);
        }
      `}</style>
    </div>
  );
}
