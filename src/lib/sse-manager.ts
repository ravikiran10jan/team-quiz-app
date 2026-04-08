type SSEController = ReadableStreamDefaultController;

interface ClientInfo {
  controller: SSEController;
}

const clients = new Map<string, Set<ClientInfo>>();

export function addClient(
  quizId: string,
  controller: SSEController
): ClientInfo {
  if (!clients.has(quizId)) {
    clients.set(quizId, new Set());
  }
  const info: ClientInfo = { controller };
  clients.get(quizId)!.add(info);
  return info;
}

export function removeClient(quizId: string, info: ClientInfo) {
  const set = clients.get(quizId);
  if (set) {
    set.delete(info);
    if (set.size === 0) {
      clients.delete(quizId);
    }
  }
}

export function broadcast(
  quizId: string,
  event: string,
  data: unknown
) {
  const set = clients.get(quizId);
  if (!set) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  for (const client of set) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      // Client disconnected, will be cleaned up
      set.delete(client);
    }
  }
}

export function getClientCount(quizId: string): number {
  return clients.get(quizId)?.size ?? 0;
}
