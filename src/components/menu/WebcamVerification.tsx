import { useEffect, useRef, useState } from "react";
import { Camera, ShieldCheck } from "lucide-react";
import { uploadUserPhoto } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/auth";

interface WebcamVerificationProps {
  userId?: number;
  onComplete: () => void;
}

export function WebcamVerification({ userId, onComplete }: WebcamVerificationProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Camera access is required for identity confirmation."));

    return () => {
      isCancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capturePhoto = async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) throw new Error("Camera preview missing");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to capture frame");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Empty photo capture"));
      }, "image/jpeg", 0.88);
    });
  };

  const handleVerify = async () => {
    if (!userId) {
      onComplete();
      return;
    }
    const stream = streamRef.current;
    if (!stream) {
      setError("Camera stream is not ready.");
      return;
    }

    setError("");
    setIsCapturing(true);
    try {
      const photo = await capturePhoto(stream);
      await uploadUserPhoto(userId, photo);
      // Start scare image generation in backend заранее (не блокируем пользователя).
      void fetch(`${API_BASE_URL}/api/users/${userId}/scare-image`, { method: "POST" });
      onComplete();
    } catch {
      setError("Unable to upload webcam confirmation. Try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl shadow-red-500/10 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-red-300">
              <Camera className="h-4 w-4" />
              Webcam Identity Confirmation
            </div>
            <h2 className="mt-2 text-xl font-bold uppercase tracking-wider text-white">
              Hold still for verification
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-[10px] uppercase text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
            Camera Active
          </div>
        </div>

        <div className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-200">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={isCapturing}
          onClick={handleVerify}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white transition hover:bg-red-500 disabled:pointer-events-none disabled:opacity-60"
        >
          <ShieldCheck className={`h-4 w-4 ${isCapturing ? "animate-pulse" : ""}`} />
          {isCapturing ? "Uploading photo..." : "Confirm photo"}
        </button>
      </div>
    </div>
  );
}
