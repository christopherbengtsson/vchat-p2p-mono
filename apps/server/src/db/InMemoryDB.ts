class WaitingQueue {
  private waitingQueue = new Set<string>();

  addToQueue(id: string) {
    this.waitingQueue.add(id);
  }

  removeFromQueue(id: string) {
    this.waitingQueue.delete(id);
  }

  get queueCount() {
    return this.waitingQueue.size;
  }

  get getFirstInQueue(): string | undefined {
    return this.waitingQueue.values().next().value;
  }
}

const getWaitingQueue = () => new WaitingQueue();
const waitingQueue = getWaitingQueue();

export const InMemoryDB = {
  waitingQueue,
};
