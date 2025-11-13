'use client';

import { useCallback, useEffect, useState } from 'react';

export type StoredMeetingCredentials = {
  meetingId: string;
  roomName: string;
  meetingTitle?: string | null;
  name: string;
  email?: string;
  password: string;
};

export type StoredMeetingSession = {
  meetingId: string;
  roomName: string;
  meetingTitle?: string | null;
  token: string;
  livekitUrl: string;
  issuedAt: number;
  expiresAt: number;
};

export type TokenResponsePayload = {
  token: string;
  livekitUrl: string;
  roomName: string;
  meeting: {
    id: string;
    title: string | null;
    status: string;
    isPublic: boolean;
  };
};

const STORAGE_PREFIX = 'meeting';
const credentialsKey = (meetingId: string) => `${STORAGE_PREFIX}:credentials:${meetingId}`;
const sessionKey = (meetingId: string) => `${STORAGE_PREFIX}:session:${meetingId}`;
const roomIndexKey = (roomName: string) => `${STORAGE_PREFIX}:room:${roomName}`;
const SESSION_SAFETY_MARGIN_MS = 30_000; // refresh 30s before expiry
const FALLBACK_SESSION_TTL_MS = 14 * 60 * 1000; // 14 minutes fallback

export const SESSION_REFRESH_MARGIN_MS = SESSION_SAFETY_MARGIN_MS;

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage;
};

const decodeTokenExpiry = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    const decoded = JSON.parse(atob(payload)) as { exp?: number };
    if (decoded.exp && Number.isFinite(decoded.exp)) {
      return decoded.exp * 1000;
    }
    return null;
  } catch (error) {
    console.warn('Failed to decode token expiry', error);
    return null;
  }
};

export const buildSessionFromResponse = (
  credentials: StoredMeetingCredentials,
  data: TokenResponsePayload,
): StoredMeetingSession => {
  const issuedAt = Date.now();
  const expiresAt = decodeTokenExpiry(data.token) ?? issuedAt + FALLBACK_SESSION_TTL_MS;

  return {
    meetingId: credentials.meetingId,
    roomName: data.roomName ?? credentials.roomName,
    meetingTitle: data.meeting?.title ?? credentials.meetingTitle,
    token: data.token,
    livekitUrl: data.livekitUrl,
    issuedAt,
    expiresAt,
  };
};

export const loadStoredCredentials = (
  meetingId: string,
): StoredMeetingCredentials | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(credentialsKey(meetingId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredMeetingCredentials;
    if (
      typeof parsed !== 'object' ||
      typeof parsed.meetingId !== 'string' ||
      parsed.meetingId !== meetingId
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored meeting credentials', error);
    return null;
  }
};

export const persistStoredCredentials = (credentials: StoredMeetingCredentials) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(credentialsKey(credentials.meetingId), JSON.stringify(credentials));
    storage.setItem(roomIndexKey(credentials.roomName), credentials.meetingId);
  } catch (error) {
    console.warn('Failed to persist meeting credentials', error);
  }
};

export const clearStoredCredentials = (meetingId: string) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(credentialsKey(meetingId));
};

export const lookupMeetingIdForRoom = (roomName: string) => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  return storage.getItem(roomIndexKey(roomName));
};

export const clearRoomMapping = (roomName: string) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(roomIndexKey(roomName));
};

export const loadStoredSession = (meetingId: string): StoredMeetingSession | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(sessionKey(meetingId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredMeetingSession;
    if (
      typeof parsed !== 'object' ||
      parsed.meetingId !== meetingId ||
      typeof parsed.token !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored meeting session', error);
    return null;
  }
};

export const persistStoredSession = (session: StoredMeetingSession) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(sessionKey(session.meetingId), JSON.stringify(session));
    storage.setItem(roomIndexKey(session.roomName), session.meetingId);
  } catch (error) {
    console.warn('Failed to persist meeting session', error);
  }
};

export const clearStoredSession = (meetingId: string) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(sessionKey(meetingId));
};

export const isSessionExpired = (session: StoredMeetingSession) =>
  session.expiresAt - SESSION_SAFETY_MARGIN_MS <= Date.now();

const buildMetadata = (credentials: StoredMeetingCredentials) =>
  JSON.stringify({
    roomName: credentials.roomName,
    meetingTitle: credentials.meetingTitle,
  });

export const requestNewSession = async (
  credentials: StoredMeetingCredentials,
): Promise<StoredMeetingSession> => {
  const response = await fetch(`/api/meetings/${credentials.meetingId}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: credentials.email ?? '',
      name: credentials.name,
      password: credentials.password,
      metadata: buildMetadata(credentials),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error ?? 'Unable to refresh meeting session.';
    throw new Error(message);
  }

  const data = (await response.json()) as TokenResponsePayload;
  const session = buildSessionFromResponse(credentials, data);
  persistStoredSession(session);
  return session;
};

export const ensureActiveSession = async (
  meetingId: string,
  options?: {
    refresh?: boolean;
  },
): Promise<StoredMeetingSession | null> => {
  const stored = loadStoredSession(meetingId);
  if (stored && !options?.refresh && !isSessionExpired(stored)) {
    return stored;
  }

  const credentials = loadStoredCredentials(meetingId);
  if (!credentials) {
    return null;
  }

  try {
    return await requestNewSession(credentials);
  } catch (error) {
    console.error('Failed to ensure active session', error);
    throw error;
  }
};

export const clearMeetingState = (meetingId: string) => {
  const credentials = loadStoredCredentials(meetingId);
  if (credentials) {
    clearRoomMapping(credentials.roomName);
  }
  clearStoredSession(meetingId);
  clearStoredCredentials(meetingId);
};

export const getStoredSessionForRoom = (roomName: string) => {
  const meetingId = lookupMeetingIdForRoom(roomName);
  if (!meetingId) {
    return null;
  }
  return loadStoredSession(meetingId);
};

export const ensureSessionForRoom = async (
  roomName: string,
  options?: {
    refresh?: boolean;
  },
) => {
  const meetingId = lookupMeetingIdForRoom(roomName);
  if (!meetingId) {
    return null;
  }
  return ensureActiveSession(meetingId, options);
};

export const useMeetingSession = (
  meetingId: string | null,
  options?: {
    autoRefresh?: boolean;
  },
) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StoredMeetingSession | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!meetingId) {
        setSession(null);
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const nextSession = await ensureActiveSession(meetingId, {
          refresh: force,
        });
        setSession(nextSession);
        setLoading(false);
        return nextSession;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to refresh session.';
        setError(message);
        setLoading(false);
        setSession(null);
        return null;
      }
    },
    [meetingId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!meetingId) {
      setSession(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    ensureActiveSession(meetingId)
      .then((nextSession) => {
        if (cancelled) return;
        setSession(nextSession);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unable to load session.';
        setError(message);
        setLoading(false);
        setSession(null);
      });

    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  useEffect(() => {
    if (!options?.autoRefresh) {
      return;
    }
    if (!session || typeof window === 'undefined') {
      return;
    }
    const timeUntilRefresh = session.expiresAt - SESSION_SAFETY_MARGIN_MS - Date.now();
    if (timeUntilRefresh <= 0) {
      void refresh(true);
      return;
    }
    const id = window.setTimeout(() => {
      void refresh(true);
    }, timeUntilRefresh);
    return () => window.clearTimeout(id);
  }, [options?.autoRefresh, refresh, session]);

  return { session, loading, error, refresh };
};


