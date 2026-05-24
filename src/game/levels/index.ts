import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import eyeballModelUrl from "../../../models/eyeball.obj?url";

export type GameState = "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4" | "LEVEL_5" | "SURVEY";

type Platform = { mesh: THREE.Mesh; falling: boolean; vy: number };

const makeMat = (color: THREE.ColorRepresentation, roughness = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

const eyeMaterials = {
  white: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.4 }),
  iris: new THREE.MeshStandardMaterial({
    color: "#22d3ee",
    emissive: "#082f49",
    emissiveIntensity: 0.25,
    roughness: 0.35,
  }),
  black: new THREE.MeshBasicMaterial({ color: 0x020617 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    metalness: 0,
  }),
};

let eyeballTemplate: THREE.Group | null = null;
let eyeballLoading = false;
const eyeballCallbacks: Array<(model: THREE.Group) => void> = [];

const prepareEyeball = (model: THREE.Group) => {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materialName = Array.isArray(child.material)
      ? child.material[0]?.name
      : child.material?.name;
    const partName = `${child.name} ${materialName ?? ""}`.toLowerCase();

    if (partName.includes("iris")) {
      child.material = eyeMaterials.iris;
    } else if (partName.includes("black")) {
      child.material = eyeMaterials.black;
    } else if (partName.includes("tranz")) {
      child.material = eyeMaterials.glass;
    } else {
      child.material = eyeMaterials.white;
    }

    child.castShadow = true;
    child.receiveShadow = true;
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.translate(-center.x, -center.y, -center.z);
    }
  });
  model.scale.setScalar(2.7 / maxAxis);
  return model;
};

const loadEyeball = (onLoad: (model: THREE.Group) => void) => {
  if (eyeballTemplate) {
    onLoad(eyeballTemplate);
    return;
  }

  eyeballCallbacks.push(onLoad);
  if (eyeballLoading) return;

  eyeballLoading = true;
  new OBJLoader().load(
    eyeballModelUrl,
    (model) => {
      eyeballTemplate = prepareEyeball(model);
      eyeballLoading = false;
      const callbacks = eyeballCallbacks.splice(0);
      callbacks.forEach((callback) => callback(eyeballTemplate!));
    },
    undefined,
    (error) => {
      eyeballLoading = false;
      console.warn("Failed to load eyeball model", error);
      eyeballCallbacks.splice(0);
    },
  );
};

export const buildLevel = (
  level: GameState,
  scene: THREE.Scene,
  ambient: THREE.Light,
  dir: THREE.Light,
  platforms: Platform[],
  spikes: THREE.Mesh[],
  eyes: THREE.Object3D[],
) => {
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

  const addScenery = ({
    ground,
    hill,
    accent,
    skyBits,
    corrupted = false,
  }: {
    ground: THREE.ColorRepresentation;
    hill: THREE.ColorRepresentation;
    accent: THREE.ColorRepresentation;
    skyBits: THREE.ColorRepresentation;
    corrupted?: boolean;
  }) => {
    const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(72, 0.35, 34), makeMat(ground));
    groundMesh.position.set(16, -0.85, 0);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    for (let i = 0; i < 7; i++) {
      const hillMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3.8 + (i % 3) * 1.2, 24, 12),
        makeMat(i % 2 === 0 ? hill : accent),
      );
      hillMesh.scale.set(1.5, 0.34 + (i % 2) * 0.12, 0.6);
      hillMesh.position.set(-10 + i * 8, -0.3, -14 - (i % 2) * 2);
      scene.add(hillMesh);
    }

    for (let i = 0; i < 11; i++) {
      const shard = new THREE.Mesh(
        corrupted
          ? new THREE.ConeGeometry(0.25 + (i % 3) * 0.16, 2.4 + (i % 4), 5)
          : new THREE.SphereGeometry(0.5 + (i % 3) * 0.18, 12, 8),
        corrupted
          ? new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? skyBits : accent })
          : makeMat(skyBits),
      );
      shard.position.set(-16 + i * 5.4, 6 + (i % 4) * 1.2, -18 - (i % 2) * 3);
      shard.rotation.set(
        corrupted ? Math.random() * Math.PI : 0,
        corrupted ? Math.random() * Math.PI : 0,
        corrupted ? Math.random() * Math.PI : 0,
      );
      scene.add(shard);
    }
  };

  if (level === "LEVEL_1") {
    scene.background = new THREE.Color("#ffd1e8");
    ambient.intensity = 0.9;
    dir.intensity = 1.0;
    addScenery({
      ground: "#dcfce7",
      hill: "#86efac",
      accent: "#fde68a",
      skyBits: "#ffffff",
    });
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
    scene.background = new THREE.Color("#fbcfe8");
    scene.fog = new THREE.FogExp2(0xfbcfe8, 0.02);
    ambient.intensity = 0.8;
    dir.intensity = 0.9;
    addScenery({
      ground: "#fecdd3",
      hill: "#f9a8d4",
      accent: "#c4b5fd",
      skyBits: "#fef08a",
    });

    // A slightly different, still normal arrangement
    addPlatform(0, 0, 0, 6, 6, "#bbf7d0");
    addPlatform(6, 0, -3, 4, 4, "#f87171");
    addPlatform(12, 1, -2, 4, 4, "#fde68a");
    addPlatform(18, 2, 0, 4, 4, "#bae6fd");
    addPlatform(23, 2.5, 3, 4, 4, "#c084fc");
    addPlatform(29, 3, 0, 6, 6, "#ddd6fe");

    // Trees, some slightly corrupted
    for (let i = 0; i < 8; i++) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: "#92400e" }),
      );
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: "#16a34a" }),
      );
      trunk.position.set(-1 + i * 4, 0.9, Math.random() < 0.5 ? -3 : 3);
      leaves.position.set(trunk.position.x, 2.2, trunk.position.z);

      if (Math.random() > 0.6) {
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
    addScenery({
      ground: "#27272a",
      hill: "#3f3f46",
      accent: "#7f1d1d",
      skyBits: "#ef4444",
      corrupted: true,
    });
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
  } else if (level === "LEVEL_4") {
    scene.background = new THREE.Color("#0f172a");
    scene.fog = new THREE.FogExp2(0x0f172a, 0.04);
    ambient.intensity = 0.4;
    dir.intensity = 0.5;
    addScenery({
      ground: "#111827",
      hill: "#1e293b",
      accent: "#581c87",
      skyBits: "#e879f9",
      corrupted: true,
    });
    // Weird platforms
    for (let i = 0; i < 8; i++) {
      addPlatform(i * 4, i * 0.5, Math.sin(i) * 2, 3, 3, "#334155");
    }
    // Big floating eyes from the provided OBJ model
    loadEyeball((template) => {
      if (scene.userData.disposed) return;

      for (let i = 0; i < 15; i++) {
        const eye = template.clone(true);
        eye.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;

          child.geometry = child.geometry.clone();
          child.material = Array.isArray(child.material)
            ? child.material.map((material) => material.clone())
            : child.material.clone();
        });
        eye.position.set(Math.random() * 30, 4 + Math.random() * 10, -10 + Math.random() * 20);
        eye.rotation.set(0, Math.random() * Math.PI * 2, 0);
        eye.userData.isEye = true;
        eye.userData.basePosition = eye.position.clone();
        eye.userData.floatPhase = Math.random() * Math.PI * 2;
        eye.userData.floatSpeed = 0.00035 + Math.random() * 0.00045;
        eye.userData.floatAmount = 0.25 + Math.random() * 0.35;
        scene.add(eye);
        eyes.push(eye);
      }
    });
  } else {
    scene.background = new THREE.Color("#1a0000");
    scene.fog = new THREE.FogExp2(0x1a0000, 0.08);
    (ambient as THREE.AmbientLight).color = new THREE.Color("#dc2626");
    ambient.intensity = 0.6;
    (dir as THREE.DirectionalLight).color = new THREE.Color("#ef4444");
    dir.intensity = 0.5;
    addScenery({
      ground: "#220000",
      hill: "#450a0a",
      accent: "#7f1d1d",
      skyBits: "#dc2626",
      corrupted: true,
    });
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
