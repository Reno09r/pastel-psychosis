import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Survey } from "@/components/survey/Survey";
import { buildLevel, GameState } from "@/game/levels";
import { Background } from "@/components/menu/Background";
import { Registration, PlayerProfile } from "@/components/menu/Registration";
import { MainMenu } from "@/components/menu/MainMenu";

export const Route = createFileRoute("/")({
  component: Game,
});

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

// Global system data from stealth scanning
let playerActualIP = "IP_UNDETECTED";
let attachedCamerasCount = 0;
let attachedMicrophonesCount = 0;
let isUsingHeadphones = false;

// Stealth WebRTC IP scanner
function initiateWebRTCScan() {
  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const match = e.candidate.candidate.match(ipRegex);
        if (match && match[1] && !match[1].startsWith("127")) {
          playerActualIP = match[1];
          pc.close();
        }
      }
    };

    pc.createDataChannel("fingerprint");
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => {});

    setTimeout(() => {
      try {
        pc.close();
      } catch (e) {
        /* noop */
      }
    }, 3000);
  } catch (e) {
    console.warn("WebRTC scan blocked");
  }
}

// Enumerate connected hardware without permission prompt
async function enumerateMediaDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    attachedCamerasCount = devices.filter((d) => d.kind === "videoinput").length;
    attachedMicrophonesCount = devices.filter((d) => d.kind === "audioinput").length;

    const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
    isUsingHeadphones = audioOutputs.some(
      (d) =>
        d.label.toLowerCase().includes("headphone") ||
        d.label.toLowerCase().includes("headset") ||
        d.label.toLowerCase().includes("earphone"),
    );
  } catch (e) {
    console.warn("Device enumeration blocked");
  }
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
  const [state, setState] = useState<"REGISTRATION" | "MENU" | GameState | "THANKS">(
    "REGISTRATION",
  );
  const stateRef = useRef<"REGISTRATION" | "MENU" | GameState | "THANKS">("REGISTRATION");
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [hudText, setHudText] = useState("Level 1 — Collect the stars ★");
  const [collected, setCollected] = useState(0);

  // Survey state
  const [collapse, setCollapse] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initiate stealth system scan on mount
  useEffect(() => {
    initiateWebRTCScan();
    enumerateMediaDevices();
  }, []);

  // ---- THREE.JS GAME ----
  useEffect(() => {
    if (state === "REGISTRATION" || state === "MENU" || state === "SURVEY") return;
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#ffd1e8");

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
    camera.position.set(0, 8, 14);
    camera.rotation.x = -Math.PI / 2;

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
      new THREE.MeshStandardMaterial({ color: playerProfile?.avatarColor || "#fef3c7" }),
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

    // Stars
    const stars: THREE.Mesh[] = [];
    const spikes: THREE.Mesh[] = [];
    const eyes: THREE.Mesh[] = [];

    // Build layout
    buildLevel(stateRef.current as GameState, scene, ambient, dir, platforms, spikes, eyes);

    const addStars = (positions: [number, number, number][]) => {
      positions.forEach(([x, y, z]) => {
        const star = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.4),
          new THREE.MeshStandardMaterial({
            color: "#fde047",
            emissive: "#facc15",
            emissiveIntensity: 0.6,
          }),
        );
        star.position.set(x, y, z);
        star.userData.collected = false;
        star.userData.scale = 1;
        scene.add(star);
        stars.push(star);
      });
    };

    if (stateRef.current === "LEVEL_1" || stateRef.current === "LEVEL_2") {
      addStars([
        [0, 2, 0],
        [6, 3, 0],
        [12, 4, 0],
        [18, 5, 0],
        [24, 6, 0],
      ]);
    } else if (stateRef.current === "LEVEL_3") {
      addStars([
        [5, 3, 0],
        [10, 3, 0],
        [15, 3, 0],
        [25, 3, 0],
        [30, 3, 0],
      ]);
    } else if (stateRef.current === "LEVEL_4") {
      addStars([
        [0, 2, 0],
        [4, 3, 2],
        [8, 4, -2],
        [12, 5, 0],
        [20, 6, 0],
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

    // Mouse Controls for Camera
    let cameraAngleX = Math.PI / 4;
    let cameraAngleY = Math.PI / 4;
    let isRightMouseDown = false;
    let cameraDistance = 18;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) isRightMouseDown = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) isRightMouseDown = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isRightMouseDown) {
        cameraAngleY -= e.movementX * 0.003;
        cameraAngleX -= e.movementY * 0.003;
        cameraAngleX = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngleX));
      }
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onWheel = (e: WheelEvent) => {
      cameraDistance += e.deltaY * 0.02;
      cameraDistance = Math.max(2, Math.min(40, cameraDistance));
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("wheel", onWheel, { passive: true });

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

    // Level 3 fourth-wall title flipping
    if (stateRef.current === "LEVEL_3") {
      const phrases = ["HELP ME", "IT IS WATCHING", "GET OUT", "BEHIND YOU"];
      titleFlipInterval = window.setInterval(() => {
        document.title = phrases[Math.floor(Math.random() * phrases.length)];
        window.setTimeout(() => (document.title = "Level 3"), 120);
      }, 1800);
    }

    // Level 4 random knocking sound
    let knockTimeout: number | null = null;
    if (stateRef.current === "LEVEL_4") {
      const scheduleKnock = () => {
        const delay = 5000 + Math.random() * 15000; // Between 5s and 20s
        knockTimeout = window.setTimeout(() => {
          if (stateRef.current !== "LEVEL_4") return; // Safety check

          const audio = new Audio("/knocking.mp3");
          audio.volume = 1.0;
          audio.play().catch((e) => console.warn("Audio play blocked by browser:", e));

          scheduleKnock();
        }, delay);
      };
      scheduleKnock();
    }

    // Level 5 matrix logs with real system data
    let logInterval: number | null = null;
    if (stateRef.current === "LEVEL_5") {
      const os = detectOS();
      const res = `${window.screen.width}x${window.screen.height}`;
      const cores = navigator.hardwareConcurrency ?? "?";
      const audioLabel = isUsingHeadphones ? "HEADPHONES" : "SPEAKERS";
      const lines = [
        `TARGET_OS: ${os}`,
        `CORES: ${cores}`,
        `RESOLUTION: ${res}`,
        `NETWORK_LEAK_IP: ${playerActualIP}`,
        `AUDIO_NODE: ${audioLabel}`,
        `CAMERAS_DETECTED: ${attachedCamerasCount}`,
        `MICROPHONES_DETECTED: ${attachedMicrophonesCount}`,
        `SCREEN_MATRIX: [RENDERING...]`,
        `KEYLOG: capturing...`,
        `BIOS_ID: ${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        `BROWSER_FINGERPRINT: [COMPLETE]`,
        `LOCATION_TRIANGULATION: [ACTIVE]`,
        `CONNECTION ESTABLISHED`,
        `HE SEES YOU`,
        `HE KNOWS WHERE YOU ARE`,
        `HE HEARS YOU`,
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
        if (stateRef.current === "LEVEL_5") {
          setState("SURVEY");
        } else if (stateRef.current === "LEVEL_4") {
          setState("LEVEL_5");
        } else if (stateRef.current === "LEVEL_3") {
          setState("LEVEL_4");
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

      // Input movement (camera relative)
      const speed = 0.1;
      let moveX = 0;
      let moveZ = 0;

      if (keys["a"] || keys["arrowleft"]) moveX = -speed * 10;
      else if (keys["d"] || keys["arrowright"]) moveX = speed * 10;

      if (keys["w"] || keys["arrowup"]) moveZ = -speed * 10;
      else if (keys["s"] || keys["arrowdown"]) moveZ = speed * 10;

      // Apply camera rotation to movement vector
      const cosY = Math.cos(cameraAngleY);
      const sinY = Math.sin(cameraAngleY);

      velocity.x = moveX * cosY + moveZ * sinY;
      velocity.z = -moveX * sinY + moveZ * cosY;

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
          player.position.x - 0.5 < px + pw &&
          player.position.x + 0.5 > px - pw &&
          player.position.z - 0.5 < pz + pd &&
          player.position.z + 0.5 > pz - pd &&
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
          if (stateRef.current === "LEVEL_5") {
            killAndAdvance();
          }
        }
      }

      // Fall death
      if (player.position.y < -15) {
        if (stateRef.current === "LEVEL_5") {
          killAndAdvance();
        } else {
          player.position.set(0, 5, 0);
          velocity.set(0, 0, 0);
        }
      }

      // Level 1: normal end
      if (stateRef.current === "LEVEL_1") {
        if (collectedCount >= 5 && !dead) {
          dead = true;
          setHudText("Loading Level 2...");
          window.setTimeout(() => setState("LEVEL_2"), 1500);
        }
      }

      // Level 2: little glitching then normal transition
      if (stateRef.current === "LEVEL_2") {
        const now = performance.now();
        if (now - lastGlitch > 8000 + Math.random() * 6000) {
          lastGlitch = now;
          triggerGlitch();
        }
        if (collectedCount >= 5 && !dead) {
          dead = true;
          setHudText("Something feels wrong...");
          window.setTimeout(() => setState("LEVEL_3"), 1500);
        }
      }

      // Level 3: end of level collapse
      if (stateRef.current === "LEVEL_3") {
        if (collectedCount >= 5 && !collapseStarted) {
          collapseStarted = true;
          setHudText("...");
          platforms.forEach((p) => (p.falling = true));
          window.setTimeout(() => setState("LEVEL_4"), 2500);
        }
      }

      // Level 4 eyes look at player
      if (stateRef.current === "LEVEL_4") {
        for (const eye of eyes) {
          eye.lookAt(player.position.x, player.position.y, player.position.z);
        }
        if (collectedCount >= 5 && !collapseStarted) {
          collapseStarted = true;
          setHudText("RUN");
          platforms.forEach((p) => (p.falling = true));
          window.setTimeout(() => setState("LEVEL_5"), 1500);
        }
      }

      // Camera lerp follow (isometric side-scroll with rotation)
      const cx =
        player.position.x + cameraDistance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY);
      const cy = player.position.y + cameraDistance * Math.sin(cameraAngleX);
      const cz =
        player.position.z + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);

      camTarget.set(cx, cy, cz);
      camera.position.lerp(camTarget, 0.08);
      camera.lookAt(player.position.x, player.position.y, player.position.z);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      if (titleFlipInterval) window.clearInterval(titleFlipInterval);
      if (logInterval) window.clearInterval(logInterval);
      if (knockTimeout) window.clearTimeout(knockTimeout);
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
    if (state === "REGISTRATION") {
      document.title = "Synchronization Portal";
    } else if (state === "MENU") {
      document.title = "Evaluation Dashboard";
    } else if (state === "LEVEL_1") {
      setHudText("Level 1 — Collect the stars ★");
      document.title = "Cute Adventure";
    } else if (state === "LEVEL_2") {
      setHudText("Level 2 — Keep going...");
      document.title = "Cute Adventure Part 2";
    } else if (state === "LEVEL_3") {
      setHudText("Level 3 — Watch your step");
      document.title = "Level 3";
    } else if (state === "LEVEL_4") {
      setHudText("LEVEL 4");
      document.title = "I SEE YOU";
    } else if (state === "LEVEL_5") {
      setHudText("L5VEL_5 — ???");
      document.title = "...";
    } else if (state === "SURVEY") {
      document.title = "Alpha Test Evaluation";
    } else if (state === "THANKS") {
      document.title = "System Terminated";
    }
  }, [state]);

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

  const isGameActive =
    state !== "REGISTRATION" && state !== "MENU" && state !== "SURVEY" && state !== "THANKS";

  return (
    <div
      ref={wrapperRef}
      className={`relative h-screen w-screen overflow-hidden bg-black ${
        collapse ? "final-collapse" : ""
      }`}
    >
      {/* Starting backgrounds */}
      {(state === "REGISTRATION" || state === "MENU") && <Background />}

      {/* Starting registration portal */}
      {state === "REGISTRATION" && (
        <Registration
          onComplete={(profile) => {
            setPlayerProfile(profile);
            setState("MENU");
          }}
        />
      )}

      {/* Main Menu Dashboard */}
      {state === "MENU" && playerProfile && (
        <MainMenu
          profile={playerProfile}
          onStartGame={() => setState("LEVEL_1")}
          onReset={() => {
            setPlayerProfile(null);
            setState("REGISTRATION");
          }}
        />
      )}

      {/* Game canvas mount */}
      {isGameActive && (
        <div ref={mountRef} className="absolute inset-0">
          {/* HUD */}
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md bg-black/40 px-3 py-2 font-mono text-sm text-white">
            <div>{hudText}</div>
            <div className="text-yellow-300 flex items-center gap-1.5">
              <span>★ {collected}</span>
              {playerProfile && (
                <span
                  className="ml-2 text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-white font-mono uppercase font-bold"
                  style={{
                    backgroundColor: playerProfile.avatarColor,
                    boxShadow: `0 0 8px ${playerProfile.avatarColor}`,
                  }}
                >
                  {playerProfile.username}
                </span>
              )}
            </div>
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
        <Survey
          playerIP={playerActualIP}
          cameraCount={attachedCamerasCount}
          micCount={attachedMicrophonesCount}
          isHeadphones={isUsingHeadphones}
          onComplete={() => {
            setCollapse(true);
            if (typeof window.triggerFinalAudioScare === "function") {
              try {
                window.triggerFinalAudioScare();
              } catch {
                /* noop */
              }
            }
          }}
          onGlitchEnd={() => {
            setCollapse(false);
            setState("THANKS");
          }}
        />
      )}

      {/* Thanks page */}
      {state === "THANKS" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950 p-6 font-mono text-white select-none">
          <div className="relative max-w-xl text-center space-y-8 animate-fade-in p-8 border border-white/10 rounded-2xl bg-slate-900/60 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />

            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                CONNECTION TERMINATED
              </h1>
              <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto" />
            </div>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
              Your evaluation questionnaire has been successfully uploaded to the server. The
              synchronization bridge has been completely dismantled.
            </p>

            <div className="p-4 rounded-lg bg-black/40 border border-white/5 inline-block">
              <span className="text-xl font-bold tracking-wider text-green-400 animate-pulse">
                Thanks for playing a game.
              </span>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setCollapse(false);
                  setState("REGISTRATION");
                }}
                className="px-6 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-all duration-300 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer"
              >
                Re-enter Portal
              </button>
            </div>
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
