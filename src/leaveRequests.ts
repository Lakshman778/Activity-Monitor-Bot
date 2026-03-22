const leaveRequests: Record<string, any> = {};

export async function createLeaveRequest(guildId: string, userId: string, reason: string, days: number) {
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const id = Date.now().toString();
  leaveRequests[id] = { 
    id, 
    guildId, 
    userId, 
    reason, 
    endDate, 
    status: 'pending', 
    createdAt: new Date() 
  };
  return leaveRequests[id];
}

export async function getLeaveRequests(guildId: string) {
  return Object.values(leaveRequests).filter((r: any) => r.guildId === guildId);
}

export async function getUserLeaveRequests(guildId: string, userId: string) {
  return Object.values(leaveRequests).filter((r: any) => 
    r.guildId === guildId && r.userId === userId
  );
}

export async function getActiveLeaveForUser(guildId: string, userId: string) {
  const now = new Date();
  return Object.values(leaveRequests).find((r: any) => 
    r.guildId === guildId && 
    r.userId === userId && 
    r.status === 'approved' && 
    r.endDate && r.endDate > now
  );
}

export async function getAllActiveLeaves(guildId: string) {
  const now = new Date();
  return Object.values(leaveRequests).filter((r: any) => 
    r.guildId === guildId && 
    r.status === 'approved' && 
    r.endDate && r.endDate > now
  );
}

export async function getPendingRequests(guildId: string) {
  return Object.values(leaveRequests).filter((r: any) => 
    r.guildId === guildId && r.status === 'pending'
  );
}

export async function getLeaveRequestById(id: string | number) {
  return leaveRequests[id.toString()] || null;
}

export async function approveLeaveRequest(requestId: string | number, userId: string) {
  const req = leaveRequests[requestId.toString()];
  if (req && req.userId === userId) {
    req.status = 'approved';
    req.updatedAt = new Date();
  }
  return req;
}

export async function rejectLeaveRequest(requestId: string | number, userId: string) {
  const req = leaveRequests[requestId.toString()];
  if (req && req.userId === userId) {
    req.status = 'rejected';
    req.updatedAt = new Date();
  }
  return req;
}

export async function revokeLeaveRequest(requestId: string | number, userId: string) {
  const req = leaveRequests[requestId.toString()];
  if (req && req.userId === userId) {
    req.status = 'revoked';
    req.updatedAt = new Date();
  }
  return req;
}

export async function createAndApproveLoa(guildId: string, userId: string, reason: string, days: number) {
  const request = await createLeaveRequest(guildId, userId, reason, days);
  return await approveLeaveRequest(request.id, userId);
}

export async function cancelLeaveRequest(requestId: string | number, userId: string) {
  const req = leaveRequests[requestId.toString()];
  if (req && req.userId === userId) {
    req.status = 'cancelled';
    req.updatedAt = new Date();
  }
  return req;
}
