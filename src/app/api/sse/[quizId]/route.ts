import { addClient, removeClient } from "@/lib/sse-manager";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const clientInfo = addClient(quizId, controller);

      // Send initial connection event
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ quizId })}\n\n`)
      );

      // Keep-alive ping every 30s
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 30000);

      // Cleanup on close
      _request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        removeClient(quizId, clientInfo);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
