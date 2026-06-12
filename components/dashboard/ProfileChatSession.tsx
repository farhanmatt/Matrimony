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
  Check,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  PencilLine,
  Reply,
  Send,
  ShieldCheck,
  SmilePlus,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils/helpers";
import {
  DASHBOARD_REALTIME_EVENT_NAME,
  type DashboardRealtimeEvent,
} from "@/lib/types/dashboard-realtime";

interface ChatMessage {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  senderProfileId: string;
  replyToMessageId: string | null;
  replyToMessage: {
    id: string;
    content: string;
    senderProfileId: string;
  } | null;
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

type UpsertMessageResponse = {
  data?: {
    conversationId: string;
    message: ChatMessage;
  };
  error?: string;
};

type DeleteMessageResponse = {
  data?: {
    conversationId: string;
    messageId: string;
  };
  error?: string;
};

const QUICK_EMOJIS = [
  "\u{1F600}",
  "\u{1F60A}",
  "\u{1F609}",
  "\u{1F60D}",
  "\u{1F970}",
  "\u{1F618}",
  "\u{1F917}",
  "\u{1F64F}",
  "\u{1F44D}",
  "\u{1F44F}",
  "\u{1F64C}",
  "\u{1F496}",
  "\u{2764}\u{FE0F}",
  "\u{2728}",
  "\u{1F389}",
  "\u{1F339}",
];

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessageActionId, setPendingMessageActionId] = useState<string | null>(
    null
  );
  const [pendingMessageAction, setPendingMessageAction] = useState<
    "edit" | "delete" | null
  >(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [activeReplyActionMessageId, setActiveReplyActionMessageId] = useState<
    string | null
  >(null);
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null
  );
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [animatedOutgoingMessageId, setAnimatedOutgoingMessageId] = useState<
    string | null
  >(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const messageMenuRef = useRef<HTMLDivElement | null>(null);
  const messageElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimeoutRef = useRef<number | null>(null);

  const editingMessage = editingMessageId
    ? chat?.messages.find((message) => message.id === editingMessageId) ?? null
    : null;
  const replyingMessage = replyingMessageId
    ? chat?.messages.find((message) => message.id === replyingMessageId) ?? null
    : null;
  const trimmedDraft = draft.trim();
  const hasDraft = trimmedDraft.length > 0;
  const hasEditedDraft = editingMessage
    ? trimmedDraft !== editingMessage.content.trim()
    : true;
  const canSubmitDraft = hasDraft && hasEditedDraft && !submitting;

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
    if (!chat?.targetProfile.id) {
      return;
    }

    const handleRealtimeEvent = (event: Event) => {
      const realtimeEvent = event as CustomEvent<DashboardRealtimeEvent>;
      const detail = realtimeEvent.detail;

      if (!detail) {
        return;
      }

      if (detail.type === "presence_updated") {
        if (detail.profileId !== chat.targetProfile.id) {
          return;
        }

        startTransition(() => {
          setTargetPresence({
            isOnline: detail.isOnline,
            lastActiveAt: detail.lastActiveAt,
          });
        });
        return;
      }

      if (
        detail.fromProfileId !== chat.targetProfile.id &&
        detail.toProfileId !== chat.targetProfile.id
      ) {
        return;
      }

      void loadChat({ showLoading: false, showError: false });
      void refreshPresence();
    };

    window.addEventListener(
      DASHBOARD_REALTIME_EVENT_NAME,
      handleRealtimeEvent as EventListener
    );

    return () =>
      window.removeEventListener(
        DASHBOARD_REALTIME_EVENT_NAME,
        handleRealtimeEvent as EventListener
      );
  }, [chat?.targetProfile.id, loadChat, refreshPresence]);

  useEffect(() => {
    void refreshPresence();

    const heartbeat = window.setInterval(() => {
      void refreshPresence();
    }, 10_000);

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
    if (!editingMessageId) {
      return;
    }

    const stillExists = chat?.messages.some(
      (message) => message.id === editingMessageId
    );

    if (!stillExists) {
      setEditingMessageId(null);
      setDraft("");
    }
  }, [chat?.messages, editingMessageId]);

  useEffect(() => {
    if (!openMessageMenuId) {
      return;
    }

    const stillExists = chat?.messages.some(
      (message) => message.id === openMessageMenuId
    );

    if (!stillExists) {
      setOpenMessageMenuId(null);
    }
  }, [chat?.messages, openMessageMenuId]);

  useEffect(() => {
    if (!activeReplyActionMessageId) {
      return;
    }

    const stillExists = chat?.messages.some(
      (message) => message.id === activeReplyActionMessageId
    );

    if (!stillExists) {
      setActiveReplyActionMessageId(null);
    }
  }, [activeReplyActionMessageId, chat?.messages]);

  useEffect(() => {
    if (!replyingMessageId) {
      return;
    }

    const stillExists = chat?.messages.some(
      (message) => message.id === replyingMessageId
    );

    if (!stillExists) {
      setReplyingMessageId(null);
    }
  }, [chat?.messages, replyingMessageId]);

  useEffect(() => {
    if (!highlightedMessageId) {
      return;
    }

    const stillExists = chat?.messages.some(
      (message) => message.id === highlightedMessageId
    );

    if (!stillExists) {
      setHighlightedMessageId(null);
    }
  }, [chat?.messages, highlightedMessageId]);

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

  useEffect(() => {
    if (!emojiPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setEmojiPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEmojiPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [emojiPickerOpen]);

  useEffect(() => {
    if (!openMessageMenuId && !activeReplyActionMessageId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        messageMenuRef.current &&
        !messageMenuRef.current.contains(event.target as Node)
      ) {
        setOpenMessageMenuId(null);
        setActiveReplyActionMessageId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMessageMenuId(null);
        setActiveReplyActionMessageId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeReplyActionMessageId, openMessageMenuId]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const focusComposer = useCallback((cursorPosition?: number) => {
    window.requestAnimationFrame(() => {
      if (!composerRef.current) {
        return;
      }

      composerRef.current.focus();

      if (typeof cursorPosition === "number") {
        composerRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  }, []);

  const setMessageElementRef = useCallback(
    (messageId: string, node: HTMLDivElement | null) => {
      if (node) {
        messageElementRefs.current[messageId] = node;
        return;
      }

      delete messageElementRefs.current[messageId];
    },
    []
  );

  const scrollToMessage = useCallback((messageId: string) => {
    const targetElement = messageElementRefs.current[messageId];

    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setHighlightedMessageId(messageId);

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId((currentMessageId) =>
        currentMessageId === messageId ? null : currentMessageId
      );
    }, 1800);
  }, []);

  const cancelEditingMessage = useCallback(() => {
    setEditingMessageId(null);
    setDraft("");
    setEmojiPickerOpen(false);
  }, []);

  const cancelReplyingMessage = useCallback(() => {
    setReplyingMessageId(null);
  }, []);

  const beginEditingMessage = useCallback(
    (message: ChatMessage) => {
      setOpenMessageMenuId(null);
      setActiveReplyActionMessageId(null);
      setReplyingMessageId(null);
      setEditingMessageId(message.id);
      setDraft(message.content);
      setEmojiPickerOpen(false);
      focusComposer(message.content.length);
    },
    [focusComposer]
  );

  const beginReplyingToMessage = useCallback(
    (message: ChatMessage) => {
      setOpenMessageMenuId(null);
      setActiveReplyActionMessageId(null);
      setEmojiPickerOpen(false);
      setReplyingMessageId(message.id);

      if (editingMessageId) {
        setEditingMessageId(null);
        setDraft("");
      }

      focusComposer();
    },
    [editingMessageId, focusComposer]
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      setDraft((currentDraft) => {
        const textarea = composerRef.current;

        if (!textarea) {
          return `${currentDraft}${emoji}`;
        }

        const selectionStart = textarea.selectionStart ?? currentDraft.length;
        const selectionEnd = textarea.selectionEnd ?? currentDraft.length;
        const nextDraft = `${currentDraft.slice(0, selectionStart)}${emoji}${currentDraft.slice(
          selectionEnd
        )}`;
        const nextCursorPosition = selectionStart + emoji.length;

        focusComposer(nextCursorPosition);
        return nextDraft;
      });
    },
    [focusComposer]
  );

  const sendMessage = async () => {
    const content = trimmedDraft;
    if (!content || !chat) {
      return;
    }

    if (editingMessage) {
      if (!hasEditedDraft) {
        cancelEditingMessage();
        return;
      }

      setSubmitting(true);
      setPendingMessageActionId(editingMessage.id);
      setPendingMessageAction("edit");

      try {
        const response = await fetch(`/api/chat/${profileId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-skip-loading": "1",
          },
          body: JSON.stringify({
            messageId: editingMessage.id,
            content,
          }),
        });
        const data = (await response.json()) as UpsertMessageResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to update message");
        }

        if (!data.data?.message) {
          throw new Error("Failed to update message");
        }

        startTransition(() => {
          setChat((current) =>
            current
              ? {
                  ...current,
                  messages: current.messages.map((message) =>
                    message.id === editingMessage.id ? data.data!.message : message
                  ),
                }
              : current
          );
        });

        setReplyingMessageId(null);
        cancelEditingMessage();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to update message"
        );
      } finally {
        setSubmitting(false);
        setPendingMessageActionId(null);
        setPendingMessageAction(null);
      }

      return;
    }

    const replySource = replyingMessage;
    const optimisticMessageId =
      globalThis.crypto?.randomUUID?.() ??
      `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticCreatedAt = new Date().toISOString();
    const optimisticMessage: ChatMessage = {
      id: optimisticMessageId,
      content,
      isRead: false,
      createdAt: optimisticCreatedAt,
      updatedAt: optimisticCreatedAt,
      senderProfileId: chat.viewerProfileId,
      replyToMessageId: replySource?.id ?? null,
      replyToMessage: replySource
        ? {
            id: replySource.id,
            content: replySource.content,
            senderProfileId: replySource.senderProfileId,
          }
        : null,
    };

    setSubmitting(true);
    setDraft("");
    setEmojiPickerOpen(false);
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
        body: JSON.stringify({
          content,
          replyToMessageId: replySource?.id ?? null,
        }),
      });
      const data = (await response.json()) as UpsertMessageResponse;

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
      setReplyingMessageId(null);
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
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMessage = useCallback(
    async (message: ChatMessage) => {
      if (!chat || message.senderProfileId !== chat.viewerProfileId) {
        return;
      }

      setOpenMessageMenuId(null);

      if (!window.confirm("Delete this message?")) {
        return;
      }

      setPendingMessageActionId(message.id);
      setPendingMessageAction("delete");

      if (editingMessageId === message.id) {
        cancelEditingMessage();
      }

      startTransition(() => {
        setChat((current) =>
          current
            ? {
                ...current,
                messages: current.messages.filter(
                  (currentMessage) => currentMessage.id !== message.id
                ).map((currentMessage) =>
                  currentMessage.replyToMessageId === message.id
                    ? {
                        ...currentMessage,
                        replyToMessageId: null,
                        replyToMessage: null,
                      }
                    : currentMessage
                ),
              }
            : current
        );
      });

      try {
        const response = await fetch(`/api/chat/${profileId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-skip-loading": "1",
          },
          body: JSON.stringify({ messageId: message.id }),
        });
        const data = (await response.json()) as DeleteMessageResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to delete message");
        }
      } catch (error) {
        await loadChat({ showLoading: false, showError: false });
        toast.error(
          error instanceof Error ? error.message : "Unable to delete message"
        );
      } finally {
        setPendingMessageActionId(null);
        setPendingMessageAction(null);
      }
    },
    [cancelEditingMessage, chat, editingMessageId, loadChat, profileId]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleComposerKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Escape" && editingMessage) {
      event.preventDefault();
      cancelEditingMessage();
      return;
    }

    if (event.key === "Escape" && replyingMessage) {
      event.preventDefault();
      cancelReplyingMessage();
      return;
    }

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
                  className="ui-media-zoom object-cover"
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
                      ? "animate-pulse bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.12)]"
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
              <div className="ui-icon-lift flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
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
          className="ui-enter-right flex h-[420px] min-h-0 flex-col overflow-hidden rounded-[28px] border border-rose-100/80 bg-white shadow-[0_20px_52px_rgba(15,23,42,0.06)] sm:h-[460px] xl:h-[520px]"
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

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,250,251,0.82)_0%,rgba(255,255,255,1)_100%)] px-5 py-5">
              {chat.messages.length === 0 ? (
                <div className="ui-enter-up flex h-full min-h-[340px] flex-col items-center justify-center text-center">
                  <div className="ui-soft-float flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-[1.45rem] font-bold text-slate-900">
                    Start the conversation
                  </h3>
                  <p className="mt-2 max-w-md text-[15px] leading-6 text-slate-500">
                    Send your first message to{" "}
                    {chat.targetProfile.fullName.split(" ")[0]}.
                  </p>
                </div>
              ) : (
                chat.messages.map((message) => {
                  const isOwnMessage =
                    message.senderProfileId === chat.viewerProfileId;
                  const isReplyActionOpen =
                    !isOwnMessage && activeReplyActionMessageId === message.id;
                  const replyTarget = message.replyToMessage;
                  const replySenderLabel = replyTarget
                    ? replyTarget.senderProfileId === chat.viewerProfileId
                      ? "You"
                      : chat.targetProfile.fullName.split(" ")[0]
                    : null;
                  const shouldHighlightMessage =
                    isOwnMessage && message.id === animatedOutgoingMessageId;
                  const isEditingCurrentMessage =
                    isOwnMessage && message.id === editingMessageId;
                  const isMessageBusy =
                    isOwnMessage && message.id === pendingMessageActionId;
                  const isEdited = message.updatedAt !== message.createdAt;

                  return (
                    <div
                      key={message.id}
                      className={`ui-enter-up flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                      style={{ animationDelay: "60ms", animationFillMode: "forwards" }}
                    >
                      <div
                        ref={(node) => {
                          setMessageElementRef(message.id, node);

                          if (isReplyActionOpen) {
                            messageMenuRef.current = node;
                          } else if (messageMenuRef.current === node) {
                            messageMenuRef.current = null;
                          }
                        }}
                        onClick={
                          isOwnMessage
                            ? undefined
                            : () => {
                                setOpenMessageMenuId(null);
                                setActiveReplyActionMessageId((currentMessageId) =>
                                  currentMessageId === message.id ? null : message.id
                                );
                              }
                        }
                        className={cn(
                          shouldHighlightMessage && "ui-message-pop",
                          "ui-card-lift-soft max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm sm:max-w-[70%]",
                          isOwnMessage
                            ? "bg-gradient-to-r from-rose-600 to-pink-500 text-white"
                            : "border border-rose-100 bg-white text-slate-800",
                          !isOwnMessage && "cursor-pointer transition-colors hover:bg-rose-50/70",
                          highlightedMessageId === message.id &&
                            "ring-2 ring-amber-300 ring-offset-2 ring-offset-white",
                          isEditingCurrentMessage &&
                            "ring-2 ring-rose-200 ring-offset-2 ring-offset-white",
                          isReplyActionOpen &&
                            "ring-2 ring-rose-100 ring-offset-2 ring-offset-white"
                        )}
                      >
                        {replyTarget ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              scrollToMessage(replyTarget.id);
                            }}
                            className={cn(
                              "mb-3 flex w-full flex-col rounded-[16px] border-l-2 px-3 py-2 text-left transition-colors",
                              isOwnMessage
                                ? "border-white/60 bg-white/12 text-white/90 hover:bg-white/18"
                                : "border-rose-300 bg-rose-50/90 text-slate-600 hover:bg-rose-100"
                            )}
                          >
                            <span
                              className={cn(
                                "text-[11px] font-semibold",
                                isOwnMessage ? "text-white" : "text-rose-600"
                              )}
                            >
                              {replySenderLabel}
                            </span>
                            <span
                              className={cn(
                                "mt-1 truncate text-xs",
                                isOwnMessage ? "text-white/85" : "text-slate-500"
                              )}
                            >
                              {replyTarget.content}
                            </span>
                          </button>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.content}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div
                            className={`text-[11px] ${
                              isOwnMessage ? "text-white/80" : "text-slate-400"
                            }`}
                          >
                            {format(new Date(message.createdAt), "MMM d, p")}
                            {isEdited ? " | Edited" : ""}
                            {isOwnMessage && message.isRead ? " | Read" : ""}
                          </div>

                          {isOwnMessage ? (
                            <div
                              ref={
                                openMessageMenuId === message.id ? messageMenuRef : null
                              }
                              className="relative flex items-center"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  {
                                    setActiveReplyActionMessageId(null);
                                    setOpenMessageMenuId((currentMenuId) =>
                                      currentMenuId === message.id ? null : message.id
                                    );
                                  }
                                }
                                disabled={isMessageBusy}
                                className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                                  "text-white/85 hover:bg-white/15 hover:text-white",
                                  isMessageBusy && "cursor-not-allowed opacity-60"
                                )}
                                aria-label="Open message actions"
                                aria-expanded={openMessageMenuId === message.id}
                                aria-haspopup="menu"
                              >
                                {isMessageBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <MoreVertical className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {openMessageMenuId === message.id ? (
                                <div
                                  role="menu"
                                  className="absolute bottom-full right-0 z-20 mb-2 w-36 rounded-2xl border border-rose-100 bg-white p-1.5 shadow-[0_18px_36px_rgba(15,23,42,0.14)]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => beginEditingMessage(message)}
                                    disabled={isMessageBusy}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    role="menuitem"
                                  >
                                    {isMessageBusy && pendingMessageAction === "edit" ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <PencilLine className="h-4 w-4 text-rose-500" />
                                    )}
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteMessage(message)}
                                    disabled={isMessageBusy}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    role="menuitem"
                                  >
                                    {isMessageBusy && pendingMessageAction === "delete" ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : isReplyActionOpen ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                beginReplyingToMessage(message);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
                            >
                              <Reply className="h-3.5 w-3.5" />
                              Reply
                            </button>
                          ) : null}
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
              className="border-t border-rose-100/70 bg-white px-5 py-3"
            >
              <div
                className={`ui-composer-shell rounded-[24px] border bg-[linear-gradient(135deg,rgba(255,251,252,0.98)_0%,rgba(255,246,248,0.92)_100%)] p-2.5 ${
                  hasDraft
                    ? "border-rose-200 shadow-[0_18px_34px_rgba(244,63,94,0.1)]"
                    : "border-rose-100"
                }`}
              >
                {editingMessage ? (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-[18px] border border-rose-100 bg-white/90 px-3 py-2 text-xs text-slate-600">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">Editing message</p>
                      <p className="truncate text-slate-500">
                        Update your message and press Save.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelEditingMessage}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Cancel editing"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : replyingMessage ? (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-[18px] border border-rose-100 bg-white/90 px-3 py-2 text-xs text-slate-600">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        Replying to {chat.targetProfile.fullName.split(" ")[0]}
                      </p>
                      <p className="truncate text-slate-500">
                        {replyingMessage.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelReplyingMessage}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}

                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    editingMessage
                      ? "Edit your message..."
                      : replyingMessage
                        ? `Reply to ${chat.targetProfile.fullName.split(" ")[0]}...`
                      : `Message ${chat.targetProfile.fullName.split(" ")[0]}...`
                  }
                  rows={2}
                  maxLength={1000}
                  className="w-full resize-none bg-transparent px-2 py-0.5 text-sm leading-5 text-slate-700 outline-none transition-colors duration-300 placeholder:text-slate-400"
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="relative flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEmojiPickerOpen((current) => !current)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white/80 text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600"
                      aria-label="Open emoji picker"
                    >
                      <SmilePlus className="h-4.5 w-4.5" />
                    </button>

                    {emojiPickerOpen ? (
                      <div
                        ref={emojiPickerRef}
                        className="absolute bottom-full left-0 z-10 mb-3 w-[240px] rounded-[20px] border border-rose-100 bg-white p-3 shadow-[0_20px_45px_rgba(15,23,42,0.14)]"
                      >
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Add Emoji
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              className="inline-flex h-11 items-center justify-center rounded-2xl border border-transparent text-xl transition-colors hover:border-rose-100 hover:bg-rose-50"
                              aria-label={`Insert ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <span
                      className={`text-xs transition-all duration-300 ${
                        hasDraft ? "text-rose-400" : "text-slate-400"
                      }`}
                    >
                      {draft.length}/1000
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmitDraft}
                    className={`ui-link-shift inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
                      canSubmitDraft ? "ui-send-ready" : ""
                    }`}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingMessage ? (
                      <Check className="ui-arrow-shift h-4 w-4" />
                    ) : (
                      <Send className="ui-arrow-shift h-4 w-4" />
                    )}
                    {editingMessage ? "Save" : "Send"}
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
