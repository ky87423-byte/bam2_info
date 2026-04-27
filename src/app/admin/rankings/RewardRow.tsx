"use client";

import { useState, useTransition } from "react";
import { Save, Gift, Check } from "lucide-react";
import { markPrizeShippedAction } from "@/lib/actions/rankingReward";

interface Props {
  reward: {
    id:           number;
    periodKey:    string;
    rank:         number;
    nickname:     string;
    username:     string;
    points:       number;
    bonusPoints:  number;
    title:        string;
    prizeShipped: boolean;
    prizeMemo:    string;
    notifiedAt:   Date | null;
    createdAt:    Date;
  };
}

export default function RewardRow({ reward }: Props) {
  const [shipped, setShipped] = useState(reward.prizeShipped);
  const [memo, setMemo] = useState(reward.prizeMemo);
  const [pending, startTrans] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = () => {
    startTrans(async () => {
      const res = await markPrizeShippedAction(reward.id, shipped, memo);
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
    });
  };

  const medal = reward.rank === 1 ? "🥇" : reward.rank === 2 ? "🥈" : "🥉";

  return (
    <tr className={shipped ? "bg-gray-50/50" : ""}>
      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap tabular-nums">
        {reward.createdAt.toISOString().slice(0, 10)}
      </td>
      <td className="px-3 py-2 text-xs">
        <code className="text-gray-600">{reward.periodKey}</code>
      </td>
      <td className="px-3 py-2 text-center font-bold whitespace-nowrap">
        {medal} {reward.rank}위
      </td>
      <td className="px-3 py-2 text-xs">
        <div className="font-semibold text-gray-800">{reward.nickname}</div>
        <div className="text-gray-400">@{reward.username}</div>
      </td>
      <td className="px-3 py-2 text-right text-xs tabular-nums">
        <div className="text-gray-700">{reward.points.toLocaleString()}P</div>
        <div className="text-yellow-600 font-semibold">+{reward.bonusPoints.toLocaleString()}P</div>
      </td>
      <td className="px-3 py-2 text-center">
        {reward.notifiedAt ? <Check size={14} className="text-green-500 inline" /> : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={shipped} disabled={pending}
            onChange={(e) => setShipped(e.target.checked)}
            className="w-4 h-4 accent-yellow-500" />
          <Gift size={11} className={shipped ? "text-yellow-500" : "text-gray-300"} />
          <span className={shipped ? "text-yellow-700 font-semibold" : "text-gray-500"}>
            {shipped ? "발송됨" : "미발송"}
          </span>
        </label>
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="기프티콘 / 송장번호 등"
          disabled={pending}
          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-yellow-400"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-gray-800 text-white hover:bg-black disabled:opacity-40">
          <Save size={10} /> {pending ? "..." : saved ? "저장됨" : "저장"}
        </button>
      </td>
    </tr>
  );
}
