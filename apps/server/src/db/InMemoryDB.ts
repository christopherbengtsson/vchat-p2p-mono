class WaitingQueue {
  private waitingQueue: Set<string> = new Set();

  addToQueue(id: string) {
    this.waitingQueue.add(id);
  }

  removeFromQueue(id: string) {
    this.waitingQueue.delete(id);
  }

  get queueCount() {
    return this.waitingQueue.size;
  }

  get getFirstInQueue(): string {
    return this.waitingQueue.values().next().value;
  }
}

const getWaitingQueue = () => new WaitingQueue();
const waitingQueue = getWaitingQueue();

export const InMemoryDB = {
  waitingQueue,
};
