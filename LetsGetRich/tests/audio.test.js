import test from 'node:test';
import assert from 'node:assert/strict';

// audio.js 依赖浏览器的 Audio 与 localStorage，这里补最小替身
class FakeAudio {
  constructor(source) {
    this.src = source;
    this.paused = true;
    this.volume = 1;
    this.currentTime = 0;
    this.loop = false;
    this.preload = '';
    this.listeners = {};
  }
  cloneNode() { return new FakeAudio(this.src); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
}

const store = new Map();
globalThis.Audio = FakeAudio;
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { gameAudio } = await import('../src/audio.js');

test('默认开启：解锁后背景音乐会播放，音效可发声', async () => {
  await gameAudio.unlock();
  assert.equal(gameAudio.soundEnabled, true);
  assert.equal(gameAudio.music.paused, false, '背景音乐应在播放');
  assert.notEqual(gameAudio.play('dice'), null, '音效应能发声');
});

test('关闭总开关：背景音乐与音效一起静音', () => {
  const enabled = gameAudio.toggleSound();
  assert.equal(enabled, false);
  assert.equal(gameAudio.music.paused, true, '背景音乐应停止');
  assert.equal(gameAudio.play('dice'), null, '音效应被挡下');
  assert.equal(gameAudio.play('coin'), null, '所有音效都应被挡下');
});

test('关闭瞬间掐掉正在播放的音效，不留残响', () => {
  gameAudio.toggleSound();               // 先开回来
  const voice = gameAudio.play('roulette');
  assert.equal(voice.paused, false, '音效正在播放');
  gameAudio.toggleSound();               // 再关掉
  assert.equal(voice.paused, true, '正在播放的音效应被立即停止');
  assert.equal(gameAudio.voices.size, 0, '播放中清单应清空');
});

test('设置写入 localStorage，重开游戏维持静音', () => {
  assert.equal(gameAudio.soundEnabled, false);
  assert.equal(store.get('property-music'), 'off');
  gameAudio.toggleSound();
  assert.equal(store.get('property-music'), 'on');
});

test('未解锁时不发声', async () => {
  const { gameAudio: fresh } = await import('../src/audio.js?fresh');
  assert.equal(fresh.play('click'), null, '未 unlock 前音效不应发声');
});
