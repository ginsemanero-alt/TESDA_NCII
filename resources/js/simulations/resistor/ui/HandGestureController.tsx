import { useCallback, useEffect, useRef } from "react";
import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

import { ASSET_PATHS, INTERACTION } from "@/resistor/lib/experience";
import { clamp, lerp, sceneInput } from "@/resistor/lib/sceneState";
import { assetUrl, LabConfig } from "@/resistor/lib/config";
import { useLab } from "@/resistor/store";

/**
 * Opt-in webcam control, desktop and tablet only. Both the WASM runtime and
 * the hand model are served from this site (public/simulations/resistor/
 * mediapipe, see docs/ASSETS.md), so it works on the school network without
 * internet. Nothing is fetched until the student presses the button.
 */

/** Detection cadence. Tracking every frame is wasted work on a school PC. */
const DETECT_INTERVAL = 45;
/** How long a hand may go missing before the mouse takes over again. */
const HAND_TIMEOUT = 900;

const [MIN_ZOOM, MAX_ZOOM] = INTERACTION.zoomRange;

type Point = NormalizedLandmark;

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Rough hand scale, used to make the gesture thresholds distance-invariant. */
function handSpan(hand: Point[]): number {
  return Math.max(distance(hand[0], hand[9]), 0.02);
}

function isPinching(hand: Point[]): boolean {
  return distance(hand[4], hand[8]) / handSpan(hand) < 0.55;
}

export default function HandGestureController({ config }: { config: LabConfig }) {
  const status = useLab((s) => s.handStatus);
  const message = useLab((s) => s.handMessage);
  const setHand = useLab((s) => s.setHand);

  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const lastDetect = useRef(0);
  const lastSeen = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    sceneInput.source = "pointer";
  }, []);

  useEffect(() => stop, [stop]);

  const readGestures = useCallback((hands: Point[][]) => {
    sceneInput.source = "hand";

    if (hands.length >= 2) {
      // Hands apart zooms out, together zooms in.
      const spread = distance(hands[0][9], hands[1][9]);
      sceneInput.targetZoom = lerp(sceneInput.targetZoom, clamp(1.75 - spread * 2.2, MIN_ZOOM, MAX_ZOOM), 0.12);
      return;
    }

    const palm = hands[0][9];
    // Mirror x so the part follows the hand as seen on screen.
    sceneInput.targetYaw = lerp(sceneInput.targetYaw, clamp((0.5 - palm.x) * 2.6, -Math.PI, Math.PI), 0.09);
    sceneInput.targetPitch = lerp(
      sceneInput.targetPitch,
      clamp((palm.y - 0.5) * 1.6, -INTERACTION.pitchLimit, INTERACTION.pitchLimit),
      0.09,
    );

    if (isPinching(hands[0])) sceneInput.targetZoom = clamp(sceneInput.targetZoom * 0.985, MIN_ZOOM, MAX_ZOOM);
  }, []);

  const loop = useCallback(() => {
    frameRef.current = requestAnimationFrame(loop);

    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return;

    const now = performance.now();
    if (now - lastDetect.current < DETECT_INTERVAL) return;
    lastDetect.current = now;

    try {
      const hands = landmarker.detectForVideo(video, now).landmarks as Point[][];
      if (hands.length > 0) {
        lastSeen.current = now;
        readGestures(hands);
      } else if (now - lastSeen.current > HAND_TIMEOUT) {
        sceneInput.source = "pointer";
      }
    } catch {
      stop();
      setHand("error");
    }
  }, [readGestures, setHand, stop]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setHand("unsupported");
      return;
    }

    setHand("loading");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("No video element");
      video.srcObject = stream;
      await video.play();

      const { FilesetResolver, HandLandmarker: Landmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(assetUrl(config, ASSET_PATHS.mediapipeWasm));

      landmarkerRef.current = await Landmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: assetUrl(config, ASSET_PATHS.handModel), delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      lastSeen.current = performance.now();
      setHand("running");
      frameRef.current = requestAnimationFrame(loop);
    } catch (error) {
      stop();
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setHand(denied ? "denied" : "error");
    }
  }, [config, loop, setHand, stop]);

  const running = status === "running";

  return (
    <div data-ui className="flex flex-wrap items-center gap-3 rounded-2xl border border-chalk/10 p-4">
      <button
        type="button"
        onClick={() => {
          if (running) {
            stop();
            setHand("off");
          } else {
            void start();
          }
        }}
        disabled={status === "loading" || status === "unsupported"}
        className="min-h-10 rounded-full border border-chalk/20 px-4 text-[13px] font-semibold text-chalk hover:border-copper-lt disabled:opacity-50"
      >
        {running ? "Stop hand control" : "Try hand control (webcam)"}
      </button>
      <p className="m-0 min-w-[12rem] flex-1 text-[12.5px] leading-snug text-sage" aria-live="polite">
        {message}
      </p>
      {/* Kept mounted so the stream has somewhere to go; only shown when live. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={running ? "h-20 w-28 -scale-x-100 rounded-lg border border-chalk/15 object-cover opacity-80" : "hidden"}
      />
    </div>
  );
}
