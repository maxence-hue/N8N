import { NextRequest } from 'next/server';
import { memoryStore, MessageEventPayload } from '@/lib/store';

const encoder = new TextEncoder();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return new Response('conversationId requis', { status: 400 });
  }

  let closeHandler: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: MessageEventPayload) => {
        if (payload.conversationId !== conversationId) return;
        controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'));
      }, 25000);

      const emitter = memoryStore.getEmitter();
      emitter.on('message', send);

      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

      const abortListener = () => {
        if (closeHandler) {
          closeHandler();
        }
      };

      closeHandler = () => {
        clearInterval(heartbeat);
        emitter.off('message', send);
        controller.close();
        request.signal.removeEventListener('abort', abortListener);
      };

      request.signal.addEventListener('abort', abortListener);
    },
    cancel() {
      if (closeHandler) {
        closeHandler();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}
