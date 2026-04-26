"use client";

import { useEffect, useRef } from "react";
import { useLiveBadge } from "@/lib/useLiveBadge";

function playAlert(ctx: AudioContext) {
  const t = ctx.currentTime;
  [[880, t, t + 0.15], [660, t + 0.2, t + 0.35]].forEach(([freq, start, end]) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq as number;
    gain.gain.setValueAtTime(0.25, start as number);
    gain.gain.exponentialRampToValueAtTime(0.001, end as number);
    osc.start(start as number);
    osc.stop(end as number);
  });
}

interface Props {
  initialCount: number;
  pollUrl:      string;
  channel:      string;     // useLiveBadge 동기화 채널 (예: "admin:msg-ack")
}

export default function AdminPendingBadge({ initialCount, pollUrl, channel }: Props) {
  const { count } = useLiveBadge({ initial: initialCount, fetchUrl: pollUrl, channel });
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const soundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // count 변화 → 알림음 on/off (15초 반복)
  useEffect(() => {
    if (soundTimerRef.current) { clearInterval(soundTimerRef.current); soundTimerRef.current = null; }
    if (count <= 0) return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const fire = () => { if (ctx.state === "suspended") ctx.resume(); playAlert(ctx); };
    fire();
    soundTimerRef.current = setInterval(fire, 15_000);
    return () => { if (soundTimerRef.current) clearInterval(soundTimerRef.current); };
  }, [count]);

  if (count <= 0) return null;

  return (
    <span className="relative inline-flex items-center justify-center shrink-0 pointer-events-none">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none select-none">
        {count}
      </span>
    </span>
  );
}
