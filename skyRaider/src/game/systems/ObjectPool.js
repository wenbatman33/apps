export class ObjectPool {
    createItem;
    items = [];
    constructor(createItem, initialSize) {
        this.createItem = createItem;
        for (let index = 0; index < initialSize; index += 1) {
            const item = this.createItem();
            item.deactivatePoolItem();
            this.items.push(item);
        }
    }
    acquire(...args) {
        const item = this.items.find((candidate) => !candidate.active) ?? this.grow();
        item.resetPoolItem(...args);
        return item;
    }
    release(item) {
        item.deactivatePoolItem();
    }
    activeCount() {
        return this.items.filter((item) => item.active).length;
    }
    size() {
        return this.items.length;
    }
    values() {
        return this.items;
    }
    grow() {
        const item = this.createItem();
        this.items.push(item);
        return item;
    }
}
