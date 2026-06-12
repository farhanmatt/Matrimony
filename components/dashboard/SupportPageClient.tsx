"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  LifeBuoy,
  Loader2,
  SendHorizonal,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { readShortlistedProfileIds } from "@/lib/utils/shortlist";

type SupportConversationItem = {
  id: string;
  role: "bot" | "user";
  text: string;
  blocked?: boolean;
};

function createConversationItemId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type SupportPageClientProps = {
  userId?: string | null;
};

export default function SupportPageClient({
  userId = null,
}: SupportPageClientProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const [conversation, setConversation] = useState<SupportConversationItem[]>([
    {
      id: "support-bot-greeting",
      role: "bot",
      text:
        "Welcome to support. Describe your issue directly, and I will suggest the most likely reason or next step.",
    },
  ]);

  useEffect(() => {
    const conversationList = conversationListRef.current;
    if (!conversationList) {
      return;
    }

    conversationList.scrollTo({
      top: conversationList.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation, sending]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      toast.error("Please describe your issue before sending.");
      return;
    }

    const userMessage: SupportConversationItem = {
      id: createConversationItemId("user"),
      role: "user",
      text: normalizedMessage,
    };

    setConversation((currentConversation) => [
      ...currentConversation,
      userMessage,
    ]);
    setMessage("");
    setSending(true);

    try {
      const response = await fetch("/api/support-assistant", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: normalizedMessage,
          shortlistCount: userId
            ? readShortlistedProfileIds(userId).length
            : null,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ?? "Unable to reach the support assistant right now."
        );
      }

      const assistantMessage: SupportConversationItem = {
        id: createConversationItemId("bot"),
        role: "bot",
        text:
          typeof result?.data?.message === "string"
            ? result.data.message
            : "Unable to generate a support reply right now.",
        blocked: Boolean(result?.data?.blocked),
      };

      setConversation((currentConversation) => [
        ...currentConversation,
        assistantMessage,
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to reach the support assistant right now."
      );
      setConversation((currentConversation) => currentConversation.slice(0, -1));
      setMessage(normalizedMessage);
    } finally {
      setSending(false);
    }
  };

  const handleMessageKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    const form = event.currentTarget.form;
    if (!form || sending) {
      return;
    }

    form.requestSubmit();
  };

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-0 flex-col gap-4">
      <section
        className="ui-enter-up ui-card-lift-soft relative shrink-0 overflow-hidden rounded-[28px] border border-rose-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,241,242,0.96),_rgba(255,255,255,1)_42%),linear-gradient(135deg,_rgba(255,255,255,1),_rgba(255,247,250,0.95))] px-4 py-2.5 shadow-sm sm:px-6 sm:py-3"
        style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
      >
        <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-rose-100/55 blur-3xl" />
        <div className="absolute bottom-0 left-12 h-24 w-24 rounded-full bg-sky-100/35 blur-3xl" />

        <div className="relative">
          <Link
            href="/dashboard"
            className="ui-link-shift inline-flex items-center gap-2 text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="mt-2">
            <div>
              <div className="flex items-start gap-2.5">
                <div className="ui-soft-float flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 via-pink-50 to-white text-rose-500 shadow-[0_16px_34px_rgba(244,63,94,0.12)]">
                  <LifeBuoy className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="mt-1.5 font-display text-[1.55rem] font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                    Support Center
                  </h1>
                  <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-slate-600">
                    Ask about your account, profile, matches, payments, notifications, or any platform issue in one continuous conversation with the support bot.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="ui-enter-up ui-card-lift-soft relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.06)]"
        style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,_rgba(255,241,242,0.7),_rgba(255,255,255,0))]" />
        <div className="absolute -left-20 top-24 h-40 w-40 rounded-full bg-sky-100/30 blur-3xl" />
        <div className="absolute -right-20 bottom-12 h-48 w-48 rounded-full bg-rose-100/35 blur-3xl" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={conversationListRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pr-3 custom-scrollbar sm:px-6 sm:py-6"
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
              {conversation.map((item) => {
                const isBot = item.role === "bot";

                return (
                  <div
                    key={item.id}
                    className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`border shadow-[0_20px_40px_rgba(15,23,42,0.05)] backdrop-blur ${
                        isBot
                          ? "max-w-[88%] rounded-[24px] px-3 py-3 sm:max-w-[80%] sm:px-4"
                          : "max-w-[78%] rounded-[24px] px-3 py-3 sm:max-w-[70%] sm:px-4"
                      } ${
                        isBot
                          ? item.blocked
                            ? "border-amber-200 bg-[linear-gradient(180deg,_rgba(255,251,235,0.98),_rgba(255,247,237,0.92))]"
                            : "border-sky-100 bg-[linear-gradient(180deg,_rgba(240,249,255,0.95),_rgba(248,250,252,0.96))]"
                          : "border-rose-100 bg-[linear-gradient(180deg,_rgba(255,241,242,0.94),_rgba(255,255,255,0.98))]"
                      }`}
                    >
                      <div
                        className={`flex items-center ${
                          isBot ? "mb-2 gap-2.5" : "mb-2 gap-2.5"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center ${
                            isBot ? "h-8 w-8 rounded-xl" : "h-8 w-8 rounded-xl"
                          } ${
                            isBot
                              ? item.blocked
                                ? "bg-amber-100 text-amber-600"
                                : "bg-sky-100 text-sky-600"
                              : "bg-rose-100 text-rose-600"
                          }`}
                        >
                          {isBot ? (
                            item.blocked ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )
                          ) : (
                            <UserRound className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`font-semibold text-slate-900 ${
                                isBot ? "text-[14px]" : "text-[14px]"
                              }`}
                            >
                              {isBot ? "Support Bot" : "You"}
                            </p>
                            {isBot ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  item.blocked
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-white/80 text-sky-700"
                                }`}
                              >
                                {item.blocked ? "Filtered reply" : "Support reply"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <p
                        className={`whitespace-pre-line text-slate-700 ${
                          isBot ? "text-[14px] leading-6" : "text-[14px] leading-6"
                        }`}
                      >
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sending ? (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,_rgba(240,249,255,0.95),_rgba(248,250,252,0.96))] px-4 py-4 shadow-[0_20px_40px_rgba(15,23,42,0.05)] sm:max-w-[82%] sm:px-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                        <Bot className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold text-slate-900">
                            Support Bot
                          </p>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                            Preparing reply
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking about the best reply...
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 shrink-0 border-t border-rose-100/90 bg-white/92 px-4 py-2.5 backdrop-blur sm:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,1),_rgba(255,247,250,0.96))] p-2 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-2.5">
                  <div className="mb-2 flex justify-end">
                    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                      {message.trim().length}/1500
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <textarea
                      id="support-message"
                      rows={2}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={handleMessageKeyDown}
                      placeholder="Example: In the Find Match page, the profile photo is not shown after I refresh the page."
                      className="min-h-[60px] w-full flex-1 rounded-[22px] border border-slate-200 bg-white/95 px-4 py-2 text-sm leading-5 text-slate-700 outline-none shadow-inner shadow-slate-100/80 transition-colors hover:border-rose-200 focus:border-rose-300"
                    />

                    <button
                      type="submit"
                      disabled={sending}
                      className="ui-link-shift inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-[18px] bg-gradient-to-r from-rose-600 via-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 lg:self-center"
                    >
                      {sending ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <SendHorizonal className="h-4.5 w-4.5" />
                      )}
                      Send To Support Bot
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
