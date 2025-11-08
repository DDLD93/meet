'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataPacket_Kind, Participant } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';

const CHAT_TOPIC = 'chat';
const HISTORY_LIMIT = 200;

type ChatPanelProps = {
  meetingId: string;
  persistMessages?: boolean;
  className?: string;
};

type ChatMessage = {
  id: string;
  content: string;
  timestamp: number;
  from: {
    identity?: string;
    name?: string | null;
    email?: string | null;
    local: boolean;
  };
};

type PersistedMessage = {
  id: string;
  meetingId: string;
  senderEmail: string | null;
  senderName: string | null;
  content: string;
  createdAt: string;
};

const createMessageId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const participantLabel = (participant?: Participant | null) => {
  if (!participant) {
    return 'Unknown';
  }
  return participant.name || participant.identity || 'Participant';
};

export function ChatPanel({
  meetingId,
  persistMessages = false,
  className,
}: ChatPanelProps) {
  const room = useMaybeRoomContext();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(persistMessages);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (messageIdsRef.current.has(message.id)) {
        return prev;
      }
      messageIdsRef.current.add(message.id);
      return [...prev, message];
    });
  }, []);

  useEffect(() => {
    if (!room) {
      return;
    }

    const handleData = (
      payload: Uint8Array,
      participant?: Participant,
      _kind?: DataPacket_Kind,
      topic?: string,
    ) => {
      if (topic && topic !== CHAT_TOPIC) {
        return;
      }

      try {
        const raw = JSON.parse(decoder.decode(payload)) as {
          id?: string;
          content?: string;
          timestamp?: number;
          sender?: {
            identity?: string;
            name?: string | null;
            email?: string | null;
          };
        };

        if (!raw.content) {
          return;
        }

        appendMessage({
          id: raw.id ?? createMessageId(),
          content: raw.content,
          timestamp: raw.timestamp ?? Date.now(),
          from: {
            identity: raw.sender?.identity ?? participant?.identity ?? undefined,
            name: raw.sender?.name ?? participant?.name ?? participantLabel(participant),
            email: raw.sender?.email ?? null,
            local: participant?.isLocal ?? false,
          },
        });
      } catch (error) {
        console.error('Failed to process incoming chat message', error);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [appendMessage, room]);

  useEffect(() => {
    if (!persistMessages) {
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setLoadingHistory(true);

    fetch(
      `/api/messages?meetingId=${meetingId}&limit=${HISTORY_LIMIT}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load chat history: ${response.statusText}`);
        }
        return response.json() as Promise<{ messages: PersistedMessage[] }>;
      })
      .then((data) => {
        if (!isActive) {
          return;
        }

        messageIdsRef.current = new Set();
        const mapped = data.messages.map<ChatMessage>((message) => {
          const timestamp = new Date(message.createdAt).getTime();
          const id = message.id ?? createMessageId();
          messageIdsRef.current.add(id);
          return {
            id,
            content: message.content,
            timestamp,
            from: {
              identity: message.senderEmail ?? undefined,
              name: message.senderName,
              email: message.senderEmail,
              local: false,
            },
          };
        });

        setMessages(mapped);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoadingHistory(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [meetingId, persistMessages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !!room, [input, room]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!room) {
        return;
      }
      const content = input.trim();
      if (!content) {
        return;
      }

      const participant = room.localParticipant;
      const messageId = createMessageId();
      const timestamp = Date.now();

      const payload = {
        id: messageId,
        content,
        timestamp,
        sender: {
          identity: participant.identity ?? undefined,
          name: participant.name ?? participant.identity ?? 'You',
          email: participant.identity ?? null,
        },
      };

      setSending(true);

      try {
        await participant.publishData(
          encoder.encode(JSON.stringify(payload)),
          {
            reliable: true,
            topic: CHAT_TOPIC,
          },
        );

        appendMessage({
          id: messageId,
          content,
          timestamp,
          from: {
            identity: participant.identity ?? undefined,
            name: participant.name ?? participant.identity ?? 'You',
            email: participant.identity ?? null,
            local: true,
          },
        });

        if (persistMessages) {
          void fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingId,
              content,
              senderEmail: participant.identity ?? undefined,
              senderName: participant.name ?? undefined,
            }),
          }).catch((error) => {
            console.error('Failed to persist chat message', error);
          });
        }
      } catch (error) {
        console.error('Failed to send chat message', error);
      } finally {
        setSending(false);
        setInput('');
      }
    },
    [appendMessage, input, meetingId, persistMessages, room],
  );

  if (!room) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Chat is unavailable outside of a LiveKit room.
        </div>
      </div>
    );
  }

  return (
    <section
      className={`flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner ${
        className ?? ''
      }`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/90 tracking-wide">Live chat</h2>
        {loadingHistory && (
          <span className="text-xs text-white/50">Loading…</span>
        )}
      </header>
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 text-sm"
      >
        {messages.length === 0 && !loadingHistory ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-black/30 px-4 py-6 text-center text-xs text-white/60">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const local = message.from.local;

            return (
              <div
                key={message.id}
                className={`flex ${local ? 'justify-end' : 'justify-start'}`}
              >
                <article
                  className={`max-w-xs rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    local
                      ? 'bg-sky-500/30 text-white'
                      : 'bg-white/10 text-white/90'
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase tracking-wide text-white/70">
                    {local ? 'You' : message.from.name ?? message.from.identity ?? 'Participant'}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <time
                    className="mt-1 block text-right text-[10px] text-white/50"
                    dateTime={new Date(message.timestamp).toISOString()}
                  >
                    {formatTimestamp(message.timestamp)}
                  </time>
                </article>
              </div>
            );
          })
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 rounded-xl border border-white/10 bg-black/30 p-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:border-sky-400/60"
            aria-label="Type a chat message"
          />
          <button
            type="submit"
            disabled={!canSend || sending}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-100 transition-colors duration-200 hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

export default ChatPanel;

