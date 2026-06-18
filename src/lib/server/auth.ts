import { readState } from "@/lib/server/store";
import type { AuthUser, UserRole } from "@/lib/server/types";

export async function createSession(_email?: string, _password?: string) {
  void _email;
  void _password;
  // Demo sign-in is temporarily disabled.
  // Keep the original credential-based session creation here for later re-enablement.
  /*
  const state = await readState();
  const user = state.users.find(
    (candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password,
  );

  if (!user) {
    return null;
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  state.sessions = [...state.sessions.filter((session) => session.userId !== user.id), { token, userId: user.id, expiresAt }];
  await writeState(state);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  return sanitizeUser(user);
  */

  const state = await readState();
  const fallbackUser = state.users.find((candidate) => candidate.role === "admin") ?? state.users[0];
  return fallbackUser ? sanitizeUser(fallbackUser) : null;
}

export async function clearSession() {
  // Demo sign-in is temporarily disabled, so logout is a no-op for now.
  /*
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);

  if (!token) {
    return;
  }

  const state = await readState();
  state.sessions = state.sessions.filter((session) => session.token !== token);
  await writeState(state);
  */
}

export async function getCurrentUser() {
  // Demo sign-in is temporarily disabled.
  // Bypass the session gate and attach the first admin user as the active operator.
  // Original session-backed logic is preserved below for later re-enablement.
  const state = await readState();
  const fallbackUser = state.users.find((candidate) => candidate.role === "admin") ?? state.users[0];
  return fallbackUser ? sanitizeUser(fallbackUser) : null;

  /*
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const state = await readState();
  const session = state.sessions.find((candidate) => candidate.token === token);

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = state.users.find((candidate) => candidate.id === session.userId);
  return user ? sanitizeUser(user) : null;
  */
}

export function sanitizeUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export function roleRank(role: UserRole) {
  switch (role) {
    case "admin":
      return 5;
    case "publisher":
      return 4;
    case "reviewer":
      return 3;
    case "uploader":
      return 2;
    default:
      return 1;
  }
}

export function canAtLeast(role: UserRole, required: UserRole) {
  return roleRank(role) >= roleRank(required);
}
