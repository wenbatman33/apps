import { describe, expect, it } from 'vitest';
import { ObjectPool, type Poolable } from '../src/game/systems/ObjectPool';

class FakePoolItem implements Poolable {
  active = false;
  resets = 0;

  resetPoolItem(): void {
    this.active = true;
    this.resets += 1;
  }

  deactivatePoolItem(): void {
    this.active = false;
  }
}

describe('ObjectPool', () => {
  it('reuses inactive objects before growing', () => {
    const pool = new ObjectPool(() => new FakePoolItem(), 1);
    const first = pool.acquire();
    pool.release(first);
    const second = pool.acquire();

    expect(second).toBe(first);
    expect(pool.size()).toBe(1);
    expect(pool.activeCount()).toBe(1);
  });

  it('grows when every object is active', () => {
    const pool = new ObjectPool(() => new FakePoolItem(), 1);
    pool.acquire();
    pool.acquire();

    expect(pool.size()).toBe(2);
    expect(pool.activeCount()).toBe(2);
  });
});
