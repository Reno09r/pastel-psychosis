import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export const Route = createFileRoute("/")({
  component: Game,
});

type GameState = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "SURVEY";

// Detect OS from userAgent
function detectOS(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown OS";
}

// Global stub for the final scare audio/vibration hook
declare global {
  interface Window {
    triggerFinalAudioScare?: () => void;
  }
}

function Game() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<GameState>("LEVEL_1");
  const stateRef = useRef<GameState>("LEVEL_1");
  const [logs, setLogs] = useState<string[]>([]);
  const [hudText, setHudText] = useState("Level 1 — Collect the stars ★");
  const [collected, setCollected] = useState(0);

  // Survey state
  const [q3Answered, setQ3Answered] = useState(false);
  const [q4Text, setQ4Text] = useState("");
  const [collapse, setCollapse] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- THREE.JS GAME ----
  useEffect(() => {
    if (state === "SURVEY") return;
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#ffd1e8");

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 0, 0);
    camera.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    // Player
    const player = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: "#fef3c7" }),
    );
    player.castShadow = true;
    player.position.set(0, 2, 0);
    scene.add(player);

    // Eyes for cute factor
    const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.2, 0.15, 0.51);
    eyeR.position.set(0.2, 0.15, 0.51);
    player.add(eyeL, eyeR);

    // Platforms
    type Platform = { mesh: THREE.Mesh; falling: boolean; vy: number };
    const platforms: Platform[] = [];
    const addPlatform = (x: number, y: number, z: number, w = 4, d = 4, color = "#a7f3d0") => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.6, d),
        new THREE.MeshStandardMaterial({ color }),
      );
      m.position.set(x, y, z);
      m.receiveShadow = true;
      m.castShadow = true;
      scene.add(m);
      platforms.push({ mesh: m, falling: false, vy: 0 });
      return m;
    };

    // Build different layout per level
    const buildLevel = (level: GameState) => {
      if (level === "LEVEL_1") {
        scene.background = new THREE.Color("#ffd1e8");
        scene.fog = null;
        ambient.intensity = 0.9;
        dir.intensity = 1.0;
        addPlatform(0, 0, 0, 6, 6, "#bbf7d0");
        addPlatform(6, 1, 0, 4, 4, "#fde68a");
        addPlatform(12, 2, 0, 4, 4, "#bae6fd");
        addPlatform(18, 3, 0, 4, 4, "#fbcfe8");
        addPlatform(24, 4, 0, 6, 6, "#ddd6fe");
        // Cute trees
        for (let i = 0; i < 6; i++) {
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8),
            new THREE.MeshStandardMaterial({ color: "#92400e" }),
          );
          const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 1.6, 8),
            new THREE.MeshStandardMaterial({ color: "#16a34a" }),
          );
          trunk.position.set(-4 + i * 6, 0.9, -3);
          leaves.position.set(-4 + i * 6, 2.2, -3);
          scene.add(trunk, leaves);
        }
      } else if (level === "LEVEL_2") {
        scene.background = new THREE.Color("#1a1a1a");
        scene.fog = new THREE.FogExp2(0x1a1a1a, 0.05);
        ambient.intensity = 0.3;
        dir.intensity = 0.4;
        const cols = ["#3f3f46", "#27272a", "#52525b", "#18181b"];
        for (let i = 0; i < 7; i++) {
          addPlatform(i * 5, i % 2, 0, 3.5, 3.5, cols[i % cols.length]);
        }
        // Spikes
        for (let i = 1; i < 6; i++) {
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.4, 1.2, 6),
            new THREE.MeshStandardMaterial({ color: "#7f1d1d" }),
          );
          spike.position.set(i * 5 + (Math.random() - 0.5), (i % 2) + 0.9, (Math.random() - 0.5) * 2);
          spike.userData.spike = true;
          scene.add(spike);
          spikes.push(spike);
        }
      } else {
        scene.background = new THREE.Color("#1a0000");
        scene.fog = new THREE.FogExp2(0x1a0000, 0.08);
        ambient.color = new THREE.Color("#dc2626");
        ambient.intensity = 0.6;
        dir.color = new THREE.Color("#ef4444");
        dir.intensity = 0.5;
        for (let i = 0; i < 10; i++) {
          addPlatform(i * 4, Math.sin(i) * 2, 0, 2.5, 2.5, "#450a0a");
        }
        // Wall of spikes
        for (let i = 0; i < 30; i++) {
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1.4, 6),
            new THREE.MeshStandardMaterial({ color: "#b91c1c" }),
          );
          spike.position.set(Math.random() * 40, Math.random() * 3, (Math.random() - 0.5) * 4);
          spike.userData.spike = true;
          scene.add(spike);
          spikes.push(spike);
        }
      }
    };

    // Stars
    const stars: THREE.Mesh[] = [];
    const spikes: THREE.Mesh[] = [];

    const addStars = (positions: [number, number, number][]) => {
      positions.forEach(([x, y, z]) => {
        const star = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.4),
          new THREE.MeshStandardMaterial({ color: "#fde047", emissive: "#facc15", emissiveIntensity: 0.6 }),
        );
        star.position.set(x, y, z);
        star.userData.collected = false;
        star.userData.scale = 1;
        scene.add(star);
        stars.push(star);
      });
    };

    buildLevel(stateRef.current);
    if (stateRef.current === "LEVEL_1") {
      addStars([
        [0, 2, 0],
        [6, 3, 0],
        [12, 4, 0],
        [18, 5, 0],
        [24, 6, 0],
      ]);
    } else if (stateRef.current === "LEVEL_2") {
      addStars([
        [5, 3, 0],
        [10, 3, 0],
        [15, 3, 0],
        [25, 3, 0],
        [30, 3, 0],
      ]);
    }

    // Controls
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const velocity = new THREE.Vector3(0, 0, 0);
    let onGround = false;
    const gravity = -0.025;

    const camTarget = new THREE.Vector3();
    let lastGlitch = performance.now();
    let titleFlipInterval: number | null = null;
    let collapseStarted = false;
    let dead = false;
    let collectedCount = 0;

    // Resize
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Level 2 fourth-wall title flipping
    if (stateRef.current === "LEVEL_2") {
      const phrases = ["HELP ME", "IT IS WATCHING", "GET OUT", "BEHIND YOU"];
      titleFlipInterval = window.setInterval(() => {
        document.title = phrases[Math.floor(Math.random() * phrases.length)];
        window.setTimeout(() => (document.title = "Level 2"), 120);
      }, 1800);
    }

    // Level 3 matrix logs
    let logInterval: number | null = null;
    if (stateRef.current === "LEVEL_3") {
      const os = detectOS();
      const res = `${window.screen.width}x${window.screen.height}`;
      const cores = navigator.hardwareConcurrency ?? "?";
      const lines = [
        `TARGET_OS: ${os}`,
        `CORES: ${cores}`,
        `RESOLUTION: ${res}`,
        `IP_PING: [ROUTING...]`,
        `LOCATION: [ALMATY/LOCATING...]`,
        `MEMORY_SCAN: 0x${Math.floor(Math.random() * 0xffffff).toString(16)}`,
        `KEYLOG: capturing...`,
        `BIOS_ID: ${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        `CONNECTION ESTABLISHED`,
        `HE SEES YOU`,
      ];
      let i = 0;
      logInterval = window.setInterval(() => {
        setLogs((prev) => {
          const next = [...prev, lines[i % lines.length]];
          if (next.length > 18) next.shift();
          return next;
        });
        i++;
      }, 180);
    }

    const triggerShake = () => {
      document.body.classList.add("screen-shake");
      window.setTimeout(() => document.body.classList.remove("screen-shake"), 400);
    };

    const triggerGlitch = () => {
      const prevAmb = ambient.intensity;
      const prevDir = dir.intensity;
      const prevBg = scene.background;
      ambient.intensity = 0;
      dir.intensity = 0;
      scene.background = new THREE.Color(0x000000);
      player.scale.set(4, 4, 4);
      window.setTimeout(() => {
        ambient.intensity = prevAmb;
        dir.intensity = prevDir;
        scene.background = prevBg;
        player.scale.set(1, 1, 1);
      }, 50);
    };

    const killAndAdvance = () => {
      if (dead) return;
      dead = true;
      triggerShake();
      // fade canvas
      renderer.domElement.style.transition = "opacity 1.2s ease, filter 1.2s ease";
      renderer.domElement.style.filter = "brightness(0)";
      renderer.domElement.style.opacity = "0";
      window.setTimeout(() => {
        // advance state machine
        if (stateRef.current === "LEVEL_3") {
          setState("SURVEY");
        } else if (stateRef.current === "LEVEL_2") {
          setState("LEVEL_3");
        } else {
          setState("LEVEL_2");
        }
      }, 1300);
    };

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);

      // Input movement
      const speed = 0.10;
      if (keys["a"] || keys["arrowleft"]) velocity.x = -speed * 10;
      else if (keys["d"] || keys["arrowright"]) velocity.x = speed * 10;
      else velocity.x = 0;

      if (keys["w"] || keys["arrowup"]) velocity.z = -speed * 10;
      else if (keys["s"] || keys["arrowdown"]) velocity.z = speed * 10;
      else velocity.z = 0;

      if ((keys[" "] || keys["space"]) && onGround) {
        velocity.y = 0.45;
        onGround = false;
      }

      velocity.y += gravity;

      player.position.x += velocity.x * 0.1;
      player.position.z += velocity.z * 0.1;
      player.position.y += velocity.y;

      // Platform collision (simple AABB top)
      onGround = false;
      for (const p of platforms) {
        if (p.falling) {
          p.vy += gravity;
          p.mesh.position.y += p.vy;
          continue;
        }
        const px = p.mesh.position.x;
        const py = p.mesh.position.y;
        const pz = p.mesh.position.z;
        const pw = (p.mesh.geometry as THREE.BoxGeometry).parameters.width / 2;
        const pd = (p.mesh.geometry as THREE.BoxGeometry).parameters.depth / 2;
        if (
          player.position.x > px - pw &&
          player.position.x < px + pw &&
          player.position.z > pz - pd &&
          player.position.z < pz + pd &&
          player.position.y - 0.5 <= py + 0.3 &&
          player.position.y - 0.5 >= py - 0.2 &&
          velocity.y <= 0
        ) {
          player.position.y = py + 0.3 + 0.5;
          velocity.y = 0;
          onGround = true;
        }
      }

      // Stars
      for (const s of stars) {
        if (s.userData.collected) {
          s.userData.scale *= 0.85;
          s.scale.setScalar(s.userData.scale);
          if (s.userData.scale < 0.05) {
            scene.remove(s);
          }
          continue;
        }
        s.rotation.y += 0.05;
        if (s.position.distanceTo(player.position) < 1) {
          s.userData.collected = true;
          collectedCount++;
          setCollected(collectedCount);
        }
      }

      // Spikes
      for (const sp of spikes) {
        if (sp.position.distanceTo(player.position) < 0.9) {
          triggerShake();
          // knockback
          velocity.y = 0.3;
          player.position.x -= 1.5;
          if (stateRef.current === "LEVEL_3") {
            killAndAdvance();
          }
        }
      }

      // Fall death
      if (player.position.y < -15) {
        if (stateRef.current === "LEVEL_3") {
          killAndAdvance();
        } else {
          player.position.set(0, 5, 0);
          velocity.set(0, 0, 0);
        }
      }

      // Level 1 glitch
      if (stateRef.current === "LEVEL_1") {
        const now = performance.now();
        if (now - lastGlitch > 10000 + Math.random() * 5000) {
          lastGlitch = now;
          triggerGlitch();
        }
        // Advance after collecting all
        if (collectedCount >= 5 && !dead) {
          dead = true;
          setHudText("Something feels wrong...");
          window.setTimeout(() => setState("LEVEL_2"), 1500);
        }
      }

      // Level 2: end of level collapse
      if (stateRef.current === "LEVEL_2") {
        if (collectedCount >= 5 && !collapseStarted) {
          collapseStarted = true;
          setHudText("...");
          platforms.forEach((p) => (p.falling = true));
          window.setTimeout(() => setState("LEVEL_3"), 2500);
        }
      }

      // Camera lerp follow (isometric side-scroll)
      camTarget.set(player.position.x + 8, player.position.y + 8, player.position.z + 14);
      camera.position.lerp(camTarget, 0.08);
      camera.lookAt(player.position.x, player.position.y, player.position.z);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      if (titleFlipInterval) window.clearInterval(titleFlipInterval);
      if (logInterval) window.clearInterval(logInterval);
      document.title = "Lovable App";
      // Dispose scene
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      setCollected(0);
    };
  }, [state]);

  // Update HUD when state changes
  useEffect(() => {
    if (state === "LEVEL_1") {
      setHudText("Level 1 — Collect the stars ★");
      document.title = "Cute Adventure";
    } else if (state === "LEVEL_2") {
      setHudText("Level 2 — Keep going...");
      document.title = "Level 2";
    } else if (state === "LEVEL_3") {
      setHudText("L3VEL_3 — ???");
      document.title = "...";
    } else if (state === "SURVEY") {
      document.title = "Alpha Test Evaluation";
    }
  }, [state]);

  // ---- Survey typewriter for Q4 ----
  useEffect(() => {
    if (!q3Answered) return;
    // ============================================================
    // Drop-in: external IP geolocation API can be wired here.
    // Example: fetch('https://ipapi.co/json').then(r => r.json()).then(d => setCity(d.city))
    // ============================================================
    const playerCity = "your city"; // <-- replace with fetched city
    const os = detectOS();
    const fullText = `Are you comfortable sitting in ${playerCity} right now behind your ${os} system? Look behind you.`;
    let i = 0;
    setQ4Text("");
    const interval = window.setInterval(() => {
      i++;
      setQ4Text(fullText.slice(0, i));
      if (i >= fullText.length) {
        window.clearInterval(interval);
        // 2 seconds after typewriter completes -> final scare
        window.setTimeout(() => {
          setCollapse(true);
          if (typeof window.triggerFinalAudioScare === "function") {
            try {
              window.triggerFinalAudioScare();
            } catch {
              /* noop */
            }
          }
        }, 2000);
      }
    }, 55);
    return () => window.clearInterval(interval);
  }, [q3Answered]);

  // ---- Global hook for audio scare ----
  useEffect(() => {
    window.triggerFinalAudioScare = () => {
      // ============================================================
      // INJECT LOUD 3D AUDIO HERE:
      //   const a = new Audio('/scare.mp3');
      //   a.volume = 1.0;
      //   a.play();
      //
      // INJECT MOBILE VIBRATION HERE:
      //   if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 600]);
      // ============================================================
    };
    return () => {
      delete window.triggerFinalAudioScare;
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`relative h-screen w-screen overflow-hidden bg-black ${
        collapse ? "final-collapse" : ""
      }`}
    >
      {/* Game canvas mount */}
      {state !== "SURVEY" && (
        <div ref={mountRef} className="absolute inset-0">
          {/* HUD */}
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md bg-black/40 px-3 py-2 font-mono text-sm text-white">
            <div>{hudText}</div>
            <div className="text-yellow-300">★ {collected}</div>
            <div className="mt-1 text-xs opacity-70">WASD / Arrows · Space to jump</div>
          </div>

          {/* Level 3 matrix log overlay */}
          {state === "LEVEL_3" && (
            <div
              ref={overlayRef}
              className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end gap-1 p-4 font-mono text-xs text-red-400"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              {logs.map((l, i) => (
                <div key={i} className="opacity-80">
                  &gt; {l}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Survey phase */}
      {state === "SURVEY" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white p-8 shadow-2xl">
            <div className="mb-6 border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-semibold text-slate-800">
                Alpha Test Evaluation Questionnaire
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Thank you for participating. Your feedback helps us improve our product.
              </p>
            </div>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              {/* Q1 */}
              <fieldset>
                <legend className="mb-2 font-medium text-slate-700">
                  1. Rate the 3D physics responsiveness
                </legend>
                <div className="flex gap-4 text-sm text-slate-600">
                  {["Excellent", "Stable", "Poor"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2">
                      <input type="radio" name="q1" value={opt} />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Q2 */}
              <fieldset>
                <legend className="mb-2 font-medium text-slate-700">
                  2. Which assets did you find most appealing?
                </legend>
                <div className="flex flex-col gap-2 text-sm text-slate-600">
                  {["Character Models", "3D Environments", "Lighting Effects"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2">
                      <input type="checkbox" name="q2" value={opt} />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Q3 */}
              <fieldset>
                <legend className="mb-2 font-medium text-slate-700">
                  3. Are you currently alone in the room?
                </legend>
                <div className="flex gap-4 text-sm text-slate-600">
                  {["Yes", "No"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="q3"
                        value={opt}
                        onChange={() => setQ3Answered(true)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Q4 */}
              <fieldset>
                <legend className="mb-2 font-medium text-slate-700">
                  4. Additional comments
                </legend>
                <textarea
                  readOnly
                  value={q4Text}
                  rows={4}
                  className="w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-800"
                  placeholder="Awaiting question..."
                />
              </fieldset>

              <button
                type="submit"
                disabled
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-60"
              >
                Submit Evaluation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Local styles for shake + collapse */}
      <style>{`
        @keyframes screenShake {
          0%, 100% { transform: translate(0,0); }
          10% { transform: translate(-8px, 4px); }
          20% { transform: translate(7px, -5px); }
          30% { transform: translate(-6px, -3px); }
          40% { transform: translate(5px, 6px); }
          50% { transform: translate(-7px, 2px); }
          60% { transform: translate(8px, -4px); }
          70% { transform: translate(-4px, 5px); }
          80% { transform: translate(6px, -2px); }
          90% { transform: translate(-3px, 3px); }
        }
        .screen-shake { animation: screenShake 0.4s linear; }

        @keyframes collapseShake {
          0%, 100% { transform: translate(0,0) scale(1); }
          25% { transform: translate(-20px, 10px) scale(1.02); }
          50% { transform: translate(15px, -12px) scale(0.98); }
          75% { transform: translate(-12px, 8px) scale(1.03); }
        }
        .final-collapse {
          filter: invert(1) hue-rotate(180deg) contrast(3);
          animation: collapseShake 0.18s infinite;
        }
      `}</style>
    </div>
  );
}
