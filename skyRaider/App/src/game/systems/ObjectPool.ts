export interface Poolable {
  active: boolean;
  resetPoolItem(...args: unknown[]): void;
  deactivatePoolItem(): void;
}

export class ObjectPool<T extends Poolable> {
  private readonly items: T[] = [];

  constructor(
    private readonly createItem: () => T,
    initialSize: number,
  ) {
    for (let index = 0; index < initialSize; index += 1) {
      const item = this.createItem();
      item.deactivatePoolItem();
      this.items.push(item);
    }
  }

  acquire(...args: unknown[]): T {
    const item = this.items.find((candidate) => !candidate.active) ?? this.grow();
    item.resetPoolItem(...args);
    return item;
  }

  release(item: T): void {
    item.deactivatePoolItem();
  }

  activeCount(): number {
    return this.items.filter((item) => item.active).length;
  }

  size(): number {
    return this.items.length;
  }

  values(): readonly T[] {
    return this.items;
  }

  private grow(): T {
    const item = this.createItem();
    this.items.push(item);
    return item;
  }
}
