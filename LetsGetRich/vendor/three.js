// three 官方 build 拆成 three.module.min.js + three.core.min.js（前者會 import 後者），
// 這裡統一出口，讓 src 只需 import '../vendor/three.js'。
export * from './three.module.min.js';
