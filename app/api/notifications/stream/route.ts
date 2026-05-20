import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { subscribeToUserNotifications } from "@/lib/utils/notification-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatSseMessage(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe = () => {};
  let closed = false;

  const cleanup = () => {
    if (closed) {
      return;
    }

    closed = true;
    unsubscribe();

    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatSseMessage(event, data)));
      };

      send("ready", {
        connectedAt: new Date().toISOString(),
      });

      unsubscribe = subscribeToUserNotifications(session.user.id, (event) => {
        send("notification", event);
      });

      heartbeat = setInterval(() => {
        send("ping", {
          timestamp: new Date().toISOString(),
        });
      }, 25000);

      request.signal.addEventListener(
        "abort",
        () => {
          cleanup();

          try {
            controller.close();
          } catch {
            // Stream may already be closed by the runtime.
          }
        },
        { once: true }
      );
    },
    cancel() {
      cleanup();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
