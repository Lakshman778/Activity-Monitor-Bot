import { db, leaveRequestTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { LeaveRequest } from "@workspace/db";

export async function createLeaveRequest(
  guildId: string,
  userId: string,
  reason: string,
  durationDays: number
): Promise<LeaveRequest> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  const [request] = await db
    .insert(leaveRequestTable)
    .values({
      guildId,
      userId,
      reason,
      durationDays,
      status: "pending",
      startDate: new Date(),
      endDate,
    })
    .returning();

  return request;
}

export async function getPendingRequests(guildId: string): Promise<LeaveRequest[]> {
  return db
    .select()
    .from(leaveRequestTable)
    .where(
      and(
        eq(leaveRequestTable.guildId, guildId),
        eq(leaveRequestTable.status, "pending")
      )
    );
}

export async function getActiveLeaveForUser(
  guildId: string,
  userId: string
): Promise<LeaveRequest | null> {
  const now = new Date();
  const results = await db
    .select()
    .from(leaveRequestTable)
    .where(
      and(
        eq(leaveRequestTable.guildId, guildId),
        eq(leaveRequestTable.userId, userId),
        eq(leaveRequestTable.status, "approved")
      )
    );

  const active = results.find(
    (r) => r.endDate && r.endDate > now
  );
  return active ?? null;
}

export async function getUserLeaveRequests(
  guildId: string,
  userId: string
): Promise<LeaveRequest[]> {
  return db
    .select()
    .from(leaveRequestTable)
    .where(
      and(
        eq(leaveRequestTable.guildId, guildId),
        eq(leaveRequestTable.userId, userId)
      )
    );
}

export async function approveLeaveRequest(
  requestId: number,
  reviewedBy: string
): Promise<LeaveRequest | null> {
  const [updated] = await db
    .update(leaveRequestTable)
    .set({
      status: "approved",
      reviewedBy,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leaveRequestTable.id, requestId))
    .returning();

  return updated ?? null;
}

export async function rejectLeaveRequest(
  requestId: number,
  reviewedBy: string
): Promise<LeaveRequest | null> {
  const [updated] = await db
    .update(leaveRequestTable)
    .set({
      status: "rejected",
      reviewedBy,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leaveRequestTable.id, requestId))
    .returning();

  return updated ?? null;
}

export async function getLeaveRequestById(id: number): Promise<LeaveRequest | null> {
  const result = await db
    .select()
    .from(leaveRequestTable)
    .where(eq(leaveRequestTable.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function revokeLeaveRequest(
  requestId: number,
  revokedBy: string
): Promise<LeaveRequest | null> {
  const [updated] = await db
    .update(leaveRequestTable)
    .set({
      status: "revoked",
      reviewedBy: revokedBy,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leaveRequestTable.id, requestId))
    .returning();

  return updated ?? null;
}

export async function cancelLeaveRequest(
  requestId: number,
  userId: string
): Promise<LeaveRequest | null> {
  const [updated] = await db
    .update(leaveRequestTable)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leaveRequestTable.id, requestId),
        eq(leaveRequestTable.userId, userId)
      )
    )
    .returning();

  return updated ?? null;
}
