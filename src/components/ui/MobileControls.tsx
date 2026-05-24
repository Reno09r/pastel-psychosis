import { useEffect, useRef, useCallback } from "react";

export interface MobileControlsRef {
  moveX: number;
  moveZ: number;
  jump: boolean;
  cameraRotX: number;
  cameraRotY: number;
}

interface MobileControlsProps {
  controlsRef: React.MutableRefObject<MobileControlsRef>;
  visible: boolean;
}

/**
 * Mobile on-screen controls overlay.
 *
 * Left side  → virtual joystick  (WASD / movement)
 * Right side → touch-drag for camera rotation + jump button
 */
export function MobileControls({ controlsRef, visible }: MobileControlsProps) {
  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const rightAreaRef = useRef<HTMLDivElement>(null);

  // Joystick state
  const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
  const joystickTouchId = useRef<number | null>(null);

  // Right-pad camera drag state
  const rightTouchId = useRef<number | null>(null);
  const rightLastPos = useRef<{ x: number; y: number } | null>(null);

  // ------------------------------------------------------------------ helpers
  const JOYSTICK_RADIUS = 48; // px, max knob travel

  const setKnobPos = useCallback((dx: number, dy: number) => {
    const knob = joystickKnobRef.current;
    if (!knob) return;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }, []);

  const resetJoystick = useCallback(() => {
    controlsRef.current.moveX = 0;
    controlsRef.current.moveZ = 0;
    setKnobPos(0, 0);
    joystickOrigin.current = null;
    joystickTouchId.current = null;
  }, [controlsRef, setKnobPos]);

  // ------------------------------------------------------------------ LEFT joystick
  useEffect(() => {
    const el = joystickAreaRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (joystickTouchId.current !== null) return; // already tracking
      const t = e.changedTouches[0];
      joystickTouchId.current = t.identifier;
      const rect = el.getBoundingClientRect();
      joystickOrigin.current = {
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (joystickTouchId.current === null || !joystickOrigin.current) return;
      let touch: Touch | undefined;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId.current) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch) return;

      const rect = el.getBoundingClientRect();
      const rawX = touch.clientX - rect.left - joystickOrigin.current.x;
      const rawY = touch.clientY - rect.top - joystickOrigin.current.y;
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);
      const clamped = Math.min(dist, JOYSTICK_RADIUS);
      const angle = Math.atan2(rawY, rawX);
      const clampedX = Math.cos(angle) * clamped;
      const clampedY = Math.sin(angle) * clamped;

      setKnobPos(clampedX, clampedY);

      // Normalised −1..1
      controlsRef.current.moveX = clampedX / JOYSTICK_RADIUS;
      controlsRef.current.moveZ = clampedY / JOYSTICK_RADIUS;
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId.current) {
          resetJoystick();
          break;
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [controlsRef, resetJoystick, setKnobPos]);

  // ------------------------------------------------------------------ RIGHT camera drag
  useEffect(() => {
    const el = rightAreaRef.current;
    if (!el) return;

    const SENSITIVITY = 0.004;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      // Allow multiple fingers; pick first free
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (rightTouchId.current === null) {
          rightTouchId.current = t.identifier;
          rightLastPos.current = { x: t.clientX, y: t.clientY };
          break;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (rightTouchId.current === null || !rightLastPos.current) return;
      let touch: Touch | undefined;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === rightTouchId.current) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch) return;

      const dx = touch.clientX - rightLastPos.current.x;
      const dy = touch.clientY - rightLastPos.current.y;
      rightLastPos.current = { x: touch.clientX, y: touch.clientY };

      controlsRef.current.cameraRotY -= dx * SENSITIVITY;
      controlsRef.current.cameraRotX -= dy * SENSITIVITY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === rightTouchId.current) {
          rightTouchId.current = null;
          rightLastPos.current = null;
          break;
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [controlsRef]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {/* -------- LEFT joystick zone -------- */}
      <div
        ref={joystickAreaRef}
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "45%",
          height: "45%",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Base ring */}
        <div
          style={{
            position: "relative",
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(4px)",
            boxShadow: "0 0 24px rgba(255,192,255,0.15)",
          }}
        >
          {/* Knob */}
          <div
            ref={joystickKnobRef}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 54,
              height: 54,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 35%, rgba(255,200,255,0.95), rgba(200,150,255,0.7))",
              border: "2px solid rgba(255,255,255,0.45)",
              boxShadow:
                "0 0 18px rgba(200,100,255,0.5), inset 0 2px 4px rgba(255,255,255,0.4)",
              transform: "translate(-50%, -50%)",
              transition: "box-shadow 0.1s ease",
              backdropFilter: "blur(2px)",
            }}
          />
        </div>
      </div>

      {/* -------- RIGHT camera-drag + jump zone -------- */}
      <div
        ref={rightAreaRef}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: "55%",
          height: "50%",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "28px 28px",
          gap: 16,
        }}
      >
        {/* Camera hint label */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "monospace",
            letterSpacing: "0.1em",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          drag to rotate camera
        </div>

        {/* Jump button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            controlsRef.current.jump = true;
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            controlsRef.current.jump = false;
          }}
          onPointerLeave={() => {
            controlsRef.current.jump = false;
          }}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,220,120,0.95), rgba(255,150,60,0.75))",
            border: "2px solid rgba(255,255,255,0.45)",
            boxShadow:
              "0 0 22px rgba(255,180,50,0.5), inset 0 2px 4px rgba(255,255,255,0.35)",
            cursor: "pointer",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "sans-serif",
            touchAction: "none",
            WebkitTapHighlightColor: "transparent",
            transition: "transform 0.08s ease, box-shadow 0.08s ease",
            flexShrink: 0,
          }}
          aria-label="Jump"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
