import { auth } from "@/auth";
import { getCommentsForTarget } from "@/lib/actions/comment";
import CommentList from "./CommentList";
import CommentForm from "./CommentForm";
import { MessageSquare } from "lucide-react";

interface Props {
  boardType: string;   // 'promotion' | 'free' | 'notice' | 'anonymous' | ...
  postId:    number;
}

// 익명 모드 자동 판정 — boardType="anonymous" 면 닉네임/역할 가림
function isAnonymousBoard(boardType: string): boolean {
  return boardType === "anonymous";
}

/**
 * 범용 댓글 섹션 — 어떤 게시판에서도 동일하게 호출 가능
 *
 *   <CommentSection boardType="promotion" postId={post.id} />
 *
 * 서버 컴포넌트로 동작하며 댓글 목록을 직접 fetch.
 * 새 댓글 작성/답글/삭제는 client form + server action 조합.
 */
export default async function CommentSection({ boardType, postId }: Props) {
  const [comments, session] = await Promise.all([
    getCommentsForTarget(boardType, postId),
    auth(),
  ]);

  const totalCount = comments.reduce((s, c) => s + 1 + c.replies.length, 0);

  return (
    <section className="mt-8 bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
      <header className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <MessageSquare size={16} className="text-gray-500" />
        <h3 className="font-semibold text-gray-800 text-sm">
          댓글 <span className="text-indigo-600">{totalCount}</span>
        </h3>
        <span className="ml-auto text-[11px] text-gray-400">
          댓글 작성 시 <strong className="text-amber-500">10%</strong> 확률로 행운 포인트 당첨!
        </span>
      </header>

      <div className="p-5">
        {/* 댓글 작성 폼 */}
        {session?.user ? (
          <CommentForm boardType={boardType} postId={postId} />
        ) : (
          <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg">
            댓글을 작성하려면 <a href="/login" className="text-indigo-600 hover:underline">로그인</a>이 필요합니다.
          </p>
        )}

        {/* 댓글 목록 */}
        <div className="mt-5">
          <CommentList
            comments={comments}
            boardType={boardType}
            postId={postId}
            currentUserId={session?.user?.id ? parseInt(session.user.id, 10) : null}
            currentUserRole={session?.user?.role ?? null}
            anonymous={isAnonymousBoard(boardType)}
          />
        </div>
      </div>
    </section>
  );
}
