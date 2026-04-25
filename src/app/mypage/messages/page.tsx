import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Mail, Inbox, Send, ChevronLeft } from "lucide-react";
import MessageRow from "./MessageRow";

interface Props {
  searchParams: Promise<{ folder?: "inbox" | "sent" }>;
}

export default async function MyMessagesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id, 10);

  const params = await searchParams;
  const folder: "inbox" | "sent" = params.folder === "sent" ? "sent" : "inbox";

  const where = folder === "inbox" ? { receiverId: userId } : { senderId: userId };
  const rows = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sender:   { select: { id: true, nickname: true, username: true, role: true } },
      receiver: { select: { id: true, nickname: true, username: true, role: true } },
    },
  });

  const unreadInboxCount = await prisma.message.count({
    where: { receiverId: userId, isRead: false },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/mypage" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={14} /> 마이페이지
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <Mail size={20} className="text-indigo-500" />
        <h1 className="text-xl font-bold text-gray-800">쪽지함</h1>
      </div>

      {/* 폴더 탭 */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 rounded-xl p-0.5 w-fit">
        <Link
          href="/mypage/messages?folder=inbox"
          className={[
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            folder === "inbox" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
          ].join(" ")}
        >
          <Inbox size={14} />
          받은 쪽지
          {unreadInboxCount > 0 && (
            <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
              {unreadInboxCount}
            </span>
          )}
        </Link>
        <Link
          href="/mypage/messages?folder=sent"
          className={[
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            folder === "sent" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
          ].join(" ")}
        >
          <Send size={14} />
          보낸 쪽지
        </Link>
      </div>

      {/* 쪽지 목록 */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          {folder === "inbox" ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {rows.map((m) => (
            <MessageRow
              key={m.id}
              messageId={m.id}
              folder={folder}
              counterpart={folder === "inbox" ? m.sender : m.receiver}
              content={m.content}
              isRead={m.isRead}
              createdAt={m.createdAt.toISOString()}
              isReceiver={folder === "inbox"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
