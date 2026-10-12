import { parseMessage } from "@openuidev/lang-core";
import type { ChatStorage, Message, Thread } from "@openuidev/react-headless";

/*
 * Local thread storage for the booking chat. Agent Interface keeps threads in memory unless it's
 * given a storage, so this one keeps them in localStorage: the thread list under one key and each
 * thread's messages under its own. It's a public demo with no accounts, so a visitor's threads
 * stay in their own browser and nothing is stored on a server.
 * The provider never writes messages back, so <PersistThread> in booking-chat.tsx saves them.
 */

const THREADS_KEY = "booking:threads";
const messagesKey = (id: string) => `booking:messages:${id}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the chat still works, it just won't survive a reload.
  }
}

const readThreads = () => read<Thread[]>(THREADS_KEY, []);

// A thread's title: the first line of its first question, without OpenUI's message envelope.
function titleOf(content: Message["content"]) {
  const text = typeof content === "string" ? parseMessage(content).content : "";
  return text.split("\n").find((l) => l.trim())?.trim().slice(0, 80) || "New trip";
}

// Only for a thread still in the list, so a save that lands after a delete leaves nothing behind.
export function saveMessages(threadId: string, messages: Message[]) {
  if (readThreads().some((t) => t.id === threadId)) write(messagesKey(threadId), messages);
}

export const localThreadStorage: ChatStorage = {
  thread: {
    async listThreads() {
      return { threads: readThreads() };
    },
    async createThread(firstMessage) {
      const thread: Thread = {
        id: crypto.randomUUID(),
        title: titleOf(firstMessage.content),
        createdAt: new Date().toISOString(),
      };
      write(THREADS_KEY, [thread, ...readThreads()]);
      write(messagesKey(thread.id), [firstMessage]);
      return thread;
    },
    async getMessages(threadId) {
      return read<Message[]>(messagesKey(threadId), []);
    },
    async updateThread(thread) {
      write(THREADS_KEY, readThreads().map((t) => (t.id === thread.id ? thread : t)));
      return thread;
    },
    async deleteThread(id) {
      write(THREADS_KEY, readThreads().filter((t) => t.id !== id));
      try {
        window.localStorage.removeItem(messagesKey(id));
      } catch {}
    },
  },
};
