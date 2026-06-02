"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/components/common/LoadingSpinner";

interface ChatMessage {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderProfileId: string;
}

interface ChatPayload {
  conversationId: string | null;
  viewerProfileId: string;
  targetProfile: {
    id: string;
    fullName: string;
    profession: string | null;
    location: string;
    imageUrl: string | null;
    isOnline: boolean;
    lastActiveAt: string | null;
  };
  messages: ChatMessage[];
}

interface ProfileChatSessionProps {
  profileId: string;
}

type SendMessageResponse = {
  data?: {
    conversationId: string;
    message: ChatMessage;
  };
  error?: string;
};

export default function ProfileChatSession({
  profileId,
}: ProfileChatSessionProps) {
  const [chat, setChat] = useState<ChatPayload | null>(null);
  const [targetPresence, setTargetPresence] = useState<{
    isOnline: boolean;
    lastActiveAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [animatedOutgoingMessageId, setAnimatedOutgoingMessageId] = useState<string | null>(
    null
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasDraft = draft.trim().length > 0;

  const loadChat = useCallback(
    async ({
      showLoading = true,
      showError = true,
    }: {
      showLoading?: boolean;
      showError?: boolean;
    } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/chat/${profileId}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load chat");
        }

      startTransition(() => {
        setTargetPresence({
          isOnline: Boolean(data.data?.targetProfile?.isOnline),
          lastActiveAt: data.data?.targetProfile?.lastActiveAt ?? null,
        });
        setChat(data.data);
      });
    } catch (error) {
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load chat"
          );
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [profileId]
  );

  const refreshPresence = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/presence/${profileId}`, {
        method: "POST",
        headers: {
          "x-skip-loading": "1",
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      startTransition(() => {
        setTargetPresence({
          isOnline: Boolean(data.data?.targetProfile?.isOnline),
          lastActiveAt: data.data?.targetProfile?.lastActiveAt ?? null,
        });
      });
    } catch {
      // Keep the latest known presence when a heartbeat fails.
    }
  }, [profileId]);

  useEffect(() => {
    void loadChat();
  }, [loadChat, retryKey]);

  useEffect(() => {
    void refreshPresence();

    const heartbeat = window.setInterval(() => {
      void refreshPresence();
    }, 20_000);

    const handleFocus = () => {
      void refreshPresence();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshPresence();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshPresence]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages.length]);

  useEffect(() => {
    if (!animatedOutgoingMessageId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAnimatedOutgoingMessageId((current) =>
        current === animatedOutgoingMessageId ? null : current
      );
    }, 820);

    return () => window.clearTimeout(timeoutId);
  }, [animatedOutgoingMessageId]);

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !chat) {
      return;
    }

    const optimisticMessageId =
      globalThis.crypto?.randomUUID?.() ??
      `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticMessageId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      senderProfileId: chat.viewerProfileId,
    };

    setDraft("");
    setAnimatedOutgoingMessageId(optimisticMessageId);
    startTransition(() => {
      setChat((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, optimisticMessage],
            }
          : current
      );
    });

    try {
      const response = await fetch(`/api/chat/${profileId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-skip-loading": "1",
        },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as SendMessageResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send message");
      }

      if (!data.data?.message) {
        throw new Error("Failed to send message");
      }

      setAnimatedOutgoingMessageId((current) =>
        current === optimisticMessageId ? data.data!.message.id : current
      );

      startTransition(() => {
        setChat((current) =>
          current
            ? {
                ...current,
                conversationId: data.data?.conversationId ?? current.conversationId,
                messages: current.messages.map((message) =>
                  message.id === optimisticMessageId ? data.data!.message : message
                ),
              }
            : current
        );
      });
    } catch (error) {
      startTransition(() => {
        setChat((current) =>
          current
            ? {
                ...current,
                messages: current.messages.filter(
                  (message) => message.id !== optimisticMessageId
                ),
              }
            : current
        );
      });
      setAnimatedOutgoingMessageId((current) =>
        current === optimisticMessageId ? null : current
      );
      setDraft((current) => (current.trim() ? current : content));
      toast.error(
        error instanceof Error ? error.message : "Unable to send message"
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleComposerKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!chat) {
    return (
      <div
        className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm"
        style={{ animationDelay: "60ms", animationFillMode: "forwards" }}
      >
        <div className="ui-soft-float mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <MessageCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-[1.55rem] font-bold text-slate-900">
          Chat unavailable
        </h1>
        <p className="mt-2 text-[15px] text-slate-500">
          We could not load this conversation right now.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="ui-link-shift inline-flex items-center justify-center rounded-[16px] border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            Retry
          </button>
          <Link
            href="/dashboard/liked"
            className="ui-link-shift inline-flex items-center justify-center rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.2)]"
          >
            Back to Interests
          </Link>
        </div>
      </div>
    );
  }

  const effectiveTargetPresence = targetPresence ?? {
    isOnline: chat.targetProfile.isOnline,
    lastActiveAt: chat.targetProfile.lastActiveAt,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div
        className="ui-enter-up flex items-center"
        style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
      >
        <Link
          href="/dashboard/liked"
          className="ui-link-shift inline-flex items-center gap-2 text-[15px] font-medium text-slate-600 transition-colors hover:text-rose-600"
        >
          <ArrowLeft className="ui-arrow-shift h-4 w-4" />
          Back to Interests
        </Link>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <aside
          className="ui-enter-left ui-card-lift-soft h-[420px] self-start overflow-y-auto rounded-[28px] border border-rose-100/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:h-[460px] xl:h-[520px]"
          style={{ animationDelay: "110ms", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-4">
            <div className="ui-icon-lift relative h-16 w-16 overflow-hidden rounded-full bg-rose-50">
              {chat.targetProfile.imageUrl ? (
                <Image
                  src={chat.targetProfile.imageUrl}
                  alt={chat.targetProfile.fullName}
                  fill
                  className="ui-media-zoom object-cover blur-[4px]"
                  sizes="64px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-rose-300">
                  <UserCircle2 className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="truncate font-display text-[1.45rem] font-bold text-slate-900">
                {chat.targetProfile.fullName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {chat.targetProfile.profession || "Matrimony Member"}
              </p>
              <div
                className={`mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  effectiveTargetPresence.isOnline
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    effectiveTargetPresence.isOnline
                      ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.12)] animate-pulse"
                      : "bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.1)]"
                  }`}
                />
                <span>{effectiveTargetPresence.isOnline ? "Online" : "Offline"}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{chat.targetProfile.location}</span>
          </div>

          <div className="ui-card-lift-soft mt-6 rounded-[18px] bg-[linear-gradient(135deg,rgba(255,244,246,0.98)_0%,rgba(255,251,252,0.92)_100%)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 ui-icon-lift">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Private profile thread
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  This chat is only for your conversation with{" "}
                  {chat.targetProfile.fullName.split(" ")[0]} from your interest
                  shortlist.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section
          className="ui-enter-right overflow-hidden rounded-[28px] border border-rose-100/80 bg-white shadow-[0_20px_52px_rgba(15,23,42,0.06)]"
          style={{ animationDelay: "170ms", animationFillMode: "forwards" }}
        >
          <div className="border-b border-rose-100/70 px-5 py-4">
            <h2 className="font-display text-[1.3rem] font-bold text-slate-900">
              Chat with {chat.targetProfile.fullName.split(" ")[0]}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Only this profile&apos;s conversation appears in this session.
            </p>
          </div>

          <div className="flex min-h-[520px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,250,251,0.82)_0%,rgba(255,255,255,1)_100%)] px-5 py-5">
              {chat.messages.length === 0 ? (
                <div className="ui-enter-up flex h-full min-h-[340px] flex-col items-center justify-center text-center">
                  <div className="ui-soft-float flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-[1.45rem] font-bold text-slate-900">
                    Start the conversation
                  </h3>
                  <p className="mt-2 max-w-md text-[15px] leading-6 text-slate-500">
                    Send your first message to {chat.targetProfile.fullName.split(" ")[0]}.
                  </p>
                </div>
              ) : (
                chat.messages.map((message) => {
                  const isOwnMessage =
                    message.senderProfileId === chat.viewerProfileId;
                  const shouldHighlightMessage =
                    isOwnMessage && message.id === animatedOutgoingMessageId;

                  return (
                    <div
                      key={message.id}
                      className={`ui-enter-up flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      style={{ animationDelay: "60ms", animationFillMode: "forwards" }}
                    >
                      <div
                        className={`${shouldHighlightMessage ? "ui-message-pop " : ""}ui-card-lift-soft max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm sm:max-w-[70%] ${
                          isOwnMessage
                            ? "bg-gradient-to-r from-rose-600 to-pink-500 text-white"
                            : "border border-rose-100 bg-white text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.content}
                        </p>
                        <div
                          className={`mt-2 text-[11px] ${
                            isOwnMessage ? "text-white/80" : "text-slate-400"
                          }`}
                        >
                          {format(new Date(message.createdAt), "MMM d, p")}
                          {isOwnMessage && message.isRead ? " • Read" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-rose-100/70 bg-white px-5 py-4"
            >
              <div
                className={`ui-composer-shell rounded-[24px] border bg-[linear-gradient(135deg,rgba(255,251,252,0.98)_0%,rgba(255,246,248,0.92)_100%)] p-3 ${
                  hasDraft
                    ? "border-rose-200 shadow-[0_18px_34px_rgba(244,63,94,0.1)]"
                    : "border-rose-100"
                }`}
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={`Message ${chat.targetProfile.fullName.split(" ")[0]}...`}
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-slate-700 outline-none transition-colors duration-300 placeholder:text-slate-400"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`text-xs transition-all duration-300 ${
                      hasDraft ? "text-rose-400" : "text-slate-400"
                    }`}
                  >
                    {draft.trim().length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={!hasDraft}
                    className={`ui-link-shift inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
                      hasDraft ? "ui-send-ready" : ""
                    }`}
                  >
                    <Send className="ui-arrow-shift h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </section>
    </div>
  );
}
