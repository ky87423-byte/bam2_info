"use client";

import { useState, useTransition } from "react";
import { Trash2, MessageCircle, Sparkles, Shield, Store } from "lucide-react";
import { deleteCommentAction } from "@/lib/actions/comment";
import CommentForm from "./CommentForm";
import UserActionMenu from "../users/UserActionMenu";
import type { CommentTreeNode } from "@/lib/actions/comment";

interface Props {
  comments: CommentTreeNode[];
  boardType: string;
  postId: number;
  currentUserId: number | null;
  currentUserRole: string | null;
  anonymous?: boolean;       // true 면 작성자 닉네임/역할 가림 + UserActionMenu 무력화
}

export default function CommentList({ comments, boardType, postId, currentUserId, currentUserRole, anonymous = false }: Props) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          boardType={boardType}
          postId={postId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          anonymous={anonymous}
        />
      ))}
    </ul>
  );
}

function CommentItem({
  comment, boardType, postId, currentUserId, currentUserRole, anonymous = false, depth = 0,
}: {
  comment: CommentTreeNode;
  boardType: string;
  postId: number;
  currentUserId: number | null;
  currentUserRole: string | null;
  anonymous?: boolean;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [_, startTrans] = useTransition();
  const canDelete = !comment.deletedAt && (
    (currentUserId !== null && comment.authorId === currentUserId) ||
    currentUserRole === "admin"
  );
  const canReply = !comment.deletedAt && depth === 0 && currentUserId !== null;

  const handleDelete = () => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    startTrans(async () => {
      await deleteCommentAction(comment.id);
    });
  };

  return (
    <li className={depth > 0 ? "ml-8 pl-3 border-l-2 border-gray-100 py-3" : "py-4"}>
      <div className="flex items-start gap-3">
        {/* 아바타 — 익명 모드면 일괄 회색 '?' */}
        <div className={[
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          anonymous ? "bg-gray-200 text-gray-500"
          : comment.authorRole === "admin" ? "bg-purple-100 text-purple-700"
          : comment.authorRole === "shop" ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-600",
        ].join(" ")}>
          {anonymous ? "?" : comment.authorNickname.slice(0, 1)}
        </div>

        <div className="flex-1 min-w-0">
          {/* 닉네임(클릭 메뉴) + 역할 + 행운배지 + 시간 */}
          <div className="flex items-center gap-2 flex-wrap">
            {anonymous ? (
              // 익명 모드 — 본인이거나 admin 이면 작은 식별 라벨, 그 외엔 그냥 "익명"
              <>
                <span className="text-sm font-semibold text-gray-700">익명</span>
                {currentUserId !== null && comment.authorId === currentUserId && (
                  <span className="text-[10px] text-gray-400">(나)</span>
                )}
                {currentUserRole === "admin" && (
                  <span className="text-[10px] text-gray-400">
                    (admin: {comment.authorNickname} #{comment.authorId})
                  </span>
                )}
              </>
            ) : comment.deletedAt ? (
              <span className="text-sm font-semibold text-gray-400">{comment.authorNickname}</span>
            ) : (
              <UserActionMenu
                userId={comment.authorId}
                username={comment.authorUsername}
                nickname={comment.authorNickname}
                role={comment.authorRole}
                className="text-sm font-semibold text-gray-800"
              />
            )}
            {!anonymous && comment.authorRole === "admin" && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold">
                <Shield size={9} /> 관리자
              </span>
            )}
            {!anonymous && comment.authorRole === "shop" && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">
                <Store size={9} /> 업소
              </span>
            )}
            {/* 🏆 행운 당첨 금색 배지 */}
            {comment.isLuckyWin && comment.luckyAmount && (
              <LuckyBadge amount={comment.luckyAmount} />
            )}
            <span className="text-[11px] text-gray-400 ml-auto">
              {formatDate(comment.createdAt)}
            </span>
          </div>

          {/* 내용 */}
          <p className={[
            "mt-1.5 text-sm whitespace-pre-wrap break-words",
            comment.deletedAt ? "text-gray-400 italic" : "text-gray-700",
          ].join(" ")}>
            {comment.content}
          </p>

          {/* 액션 버튼 */}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400">
            {canReply && (
              <button
                onClick={() => setShowReply((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors"
              >
                <MessageCircle size={11} />
                {showReply ? "취소" : "답글"}
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 hover:text-red-500 transition-colors"
              >
                <Trash2 size={11} />
                삭제
              </button>
            )}
          </div>

          {/* 답글 입력 폼 (펼침) */}
          {showReply && (
            <div className="mt-3">
              <CommentForm
                boardType={boardType}
                postId={postId}
                parentId={comment.id}
                onDone={() => setShowReply(false)}
                autoFocus
                placeholder="답글을 입력하세요..."
              />
            </div>
          )}

          {/* 답글들 (1단계 더 들여쓰기) */}
          {comment.replies.length > 0 && (
            <ul className="mt-3 -mr-3">
              {comment.replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  boardType={boardType}
                  postId={postId}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  anonymous={anonymous}
                  depth={depth + 1}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

// ── 🏆 행운 당첨 금색 배지 (화려하게) ─────────────────────────────────────
function LuckyBadge({ amount }: { amount: number }) {
  return (
    <span
      className="
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500
        text-amber-900 text-[10px] font-bold
        shadow-[0_0_12px_rgba(251,191,36,0.6)]
        ring-1 ring-amber-500/50
        animate-pulse
      "
      title={`행운 댓글 — ${amount}P 당첨`}
    >
      <Sparkles size={10} className="text-amber-700" />
      🎉 행운 +{amount}P
    </span>
  );
}

// ── 시간 포맷 ────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleDateString("ko-KR");
}
