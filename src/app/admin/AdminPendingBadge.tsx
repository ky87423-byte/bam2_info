"use client";

import { useEffect, useRef, useState } from "react";

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
  pollUrl: string;
}

export default function AdminPendingBadge({ initialCount, pollUrl }: Props) {
  const [count, setCount] = useState(initialCount);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const soundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // 30초마다 폴링
  useEffect(() => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const res  = await fetch(pollUrl);
        const data = await res.json();
        setCount(data.count ?? 0);
      } catch { /* 무시 */ }
    }, 30_000);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [pollUrl]);

  // count 변화 → 알림음 on/off
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
    // pointer-events-none: 배지 클릭이 부모 Link를 방해하지 않음
    <span className="relative inline-flex items-center justify-center shrink-0 pointer-events-none">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none select-none">
        {count}
      </span>
    </span>
  );
}
