import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      isRead: (dir) => [{ isRead: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const and = [];
  const userId = searchParams.get("userId");
  if (userId) and.push({ OR: [{ senderId: userId }, { receiverId: userId }] });
  const taskId = searchParams.get("taskId");
  if (taskId) and.push({ taskId });
  const or = searchOr(searchParams.get("q"), [
    "content",
    "sender.fullName",
    "sender.email",
    "receiver.fullName",
    "receiver.email",
  ]);
  if (or) and.push({ OR: or });
  const where = and.length ? { AND: and } : {};

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: {
        sender: { select: { id: true, fullName: true, email: true, role: true } },
        receiver: { select: { id: true, fullName: true, email: true, role: true } },
        task: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.message.count({ where }),
  ]);
  return listResponse(messages, total, list);
});
