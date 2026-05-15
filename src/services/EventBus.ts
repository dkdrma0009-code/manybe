type Listener<T = unknown> = (payload: T) => void;

class EventBusImpl {
  private listeners = new Map<string, Set<Listener>>();

  on<T>(event: string, handler: Listener<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Listener);
    return () => { this.listeners.get(event)?.delete(handler as Listener); };
  }

  emit<T>(event: string, payload: T): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }

  once<T>(event: string, handler: Listener<T>): () => void {
    const unsub = this.on<T>(event, (payload) => {
      unsub();
      handler(payload);
    });
    return unsub;
  }
}

export const EventBus = new EventBusImpl();
