import * as THREE from "three";

export type GameState = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4" | "LEVEL_5" | "SURVEY";

type Platform = { mesh: THREE.Mesh; falling: boolean; vy: number };

export const buildLevel = (
  level: GameState,
  scene: THREE.Scene,
  ambient: THREE.Light,
  dir: THREE.Light,
  platforms: Platform[],
  spikes: THREE.Mesh[],
  eyes: THREE.Mesh[]
) => {
  const addPlatform = (x: number, y: number, z: number, w = 4, d = 4, color = "#a7f3d0") => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.6, d),
      new THREE.MeshStandardMaterial({ color })
    );
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
    platforms.push({ mesh: m, falling: false, vy: 0 });
    return m;
  };

  if (level === "LEVEL_1" || level === "LEVEL_2") {
    scene.background = new THREE.Color(level === "LEVEL_1" ? "#ffd1e8" : "#fbcfe8");
    scene.fog = level === "LEVEL_1" ? null : new THREE.FogExp2(0xfbcfe8, 0.02);
    ambient.intensity = level === "LEVEL_1" ? 0.9 : 0.7;
    dir.intensity = level === "LEVEL_1" ? 1.0 : 0.8;
    addPlatform(0, 0, 0, 6, 6, "#bbf7d0");
    addPlatform(6, 1, 0, 4, 4, "#fde68a");
    addPlatform(12, 2, 0, 4, 4, "#bae6fd");
    addPlatform(18, 3, 0, 4, 4, "#fbcfe8");
    addPlatform(24, 4, 0, 6, 6, "#ddd6fe");
    // Cute trees
    for (let i = 0; i < 6; i++) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: "#92400e" })
      );
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: "#16a34a" })
      );
      trunk.position.set(-4 + i * 6, 0.9, -3);
      leaves.position.set(-4 + i * 6, 2.2, -3);
      if (level === "LEVEL_2" && Math.random() > 0.5) {
        (leaves.material as THREE.MeshStandardMaterial).color.setHex(0x000000); 
        (trunk.material as THREE.MeshStandardMaterial).color.setHex(0x1a1a1a);
      }
      scene.add(trunk, leaves);
    }
  } else if (level === "LEVEL_3") {
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
        new THREE.MeshStandardMaterial({ color: "#7f1d1d" })
      );
      spike.position.set(i * 5 + (Math.random() - 0.5), (i % 2) + 0.9, (Math.random() - 0.5) * 2);
      spike.userData.spike = true;
      scene.add(spike);
      spikes.push(spike);
    }
  } else if (level === "LEVEL_4") {
    scene.background = new THREE.Color("#0f172a");
    scene.fog = new THREE.FogExp2(0x0f172a, 0.04);
    ambient.intensity = 0.4;
    dir.intensity = 0.5;
    // Weird platforms
    for (let i = 0; i < 8; i++) {
      addPlatform(i * 4, i * 0.5, Math.sin(i) * 2, 3, 3, "#334155");
    }
    // Big floating eyes
    for (let i = 0; i < 15; i++) {
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      pupil.position.z = 1.3;
      sclera.add(pupil);
      sclera.position.set(Math.random() * 30, 4 + Math.random() * 10, -10 + Math.random() * 20);
      sclera.userData.isEye = true;
      scene.add(sclera);
      eyes.push(sclera);
    }
  } else {
    scene.background = new THREE.Color("#1a0000");
    scene.fog = new THREE.FogExp2(0x1a0000, 0.08);
    (ambient as THREE.AmbientLight).color = new THREE.Color("#dc2626");
    ambient.intensity = 0.6;
    (dir as THREE.DirectionalLight).color = new THREE.Color("#ef4444");
    dir.intensity = 0.5;
    for (let i = 0; i < 10; i++) {
      addPlatform(i * 4, Math.sin(i) * 2, 0, 2.5, 2.5, "#450a0a");
    }
    // Wall of spikes
    for (let i = 0; i < 30; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1.4, 6),
        new THREE.MeshStandardMaterial({ color: "#b91c1c" })
      );
      spike.position.set(Math.random() * 40, Math.random() * 3, (Math.random() - 0.5) * 4);
      spike.userData.spike = true;
      scene.add(spike);
      spikes.push(spike);
    }
  }
};
