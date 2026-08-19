import Phaser from '../../../vendor/phaser.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants.js';
import { fetchTop, getNickname, setNickname } from '../systems/Leaderboard.js';
export class MenuScene extends Phaser.Scene {
    leaderboardText;
    nicknameButton;
    nicknameInputDom;
    nicknameInputElement;
    startHandlersBound = false;
    constructor() {
        super('MenuScene');
    }
    create() {
        this.startHandlersBound = false;
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'menu-background-premium').setAlpha(1);
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020611, 0.36);
        // 標題
        this.add
            .text(GAME_WIDTH / 2, 132, 'SKY RAIDER', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '56px',
            color: '#ffffff',
            fontStyle: 'bold',
        })
            .setOrigin(0.5);
        // 副標
        this.add
            .text(GAME_WIDTH / 2, 196, '霓虹空战计划', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px',
            color: '#ffe4a8',
            fontStyle: 'bold',
        })
            .setOrigin(0.5);
        // 排行榜
        this.add
            .text(GAME_WIDTH / 2, 268, 'TOP 10 排行榜', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
        })
            .setOrigin(0.5);
        this.leaderboardText = this.add
            .text(GAME_WIDTH / 2, 300, '载入中…', {
            fontFamily: '"Courier New", monospace',
            fontSize: '15px',
            color: '#e8f0ff',
            align: 'left',
            lineSpacing: 4,
        })
            .setOrigin(0.5, 0);
        void this.refreshLeaderboard();
        // TAP TO LAUNCH
        const start = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'TAP TO LAUNCH', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '28px',
            color: '#fff4b8',
            fontStyle: 'bold',
            backgroundColor: '#020611aa',
            padding: { left: 18, right: 18, top: 8, bottom: 8 },
        })
            .setOrigin(0.5);
        this.tweens.add({ targets: start, alpha: 0.4, yoyo: true, repeat: -1, duration: 650 });
        // 暱稱：預設為按鈕，點擊才出現輸入框
        this.createNicknameButton();
        this.createNicknameInput();
        this.showNicknameButton();
        this.time.delayedCall(150, () => {
            this.startHandlersBound = true;
            this.input.on('pointerdown', this.handleStart, this);
            this.input.keyboard?.once('keydown-SPACE', this.handleStart, this);
        });
    }
    handleStart = (pointer) => {
        if (!this.startHandlersBound)
            return;
        const target = (pointer?.event?.target ?? null);
        if (target && target.tagName === 'INPUT')
            return;
        // 明確從第一關開始（避免 Phaser scene data 殘留）
        this.scene.start('GameScene', { stageId: 1 });
    };
    createNicknameButton() {
        this.nicknameButton = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 110, this.formatNicknameLabel(getNickname()), {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#fff4b8',
            backgroundColor: '#11192bcc',
            padding: { left: 16, right: 16, top: 8, bottom: 8 },
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.nicknameButton.on('pointerdown', (_p, _x, _y, event) => {
            event.stopPropagation();
            this.showNicknameInput();
        });
    }
    createNicknameInput() {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 16;
        input.value = getNickname();
        input.placeholder = '输入昵称…';
        input.spellcheck = false;
        input.autocomplete = 'off';
        input.style.cssText = [
            'width: 240px',
            'padding: 10px 14px',
            'border-radius: 10px',
            'border: 2px solid #5dffb0',
            'background: rgba(2, 6, 17, 0.92)',
            'color: #fff4b8',
            'font-size: 20px',
            'font-weight: bold',
            'font-family: Arial, sans-serif',
            'text-align: center',
            'outline: none',
            'box-shadow: 0 0 18px rgba(93, 255, 176, 0.35)',
        ].join(';');
        const commit = () => {
            const saved = setNickname(input.value);
            input.value = saved;
            this.nicknameButton.setText(this.formatNicknameLabel(saved));
            this.showNicknameButton();
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
                commit();
            }
            else if (event.key === 'Escape') {
                input.value = getNickname();
                input.blur();
            }
        });
        input.addEventListener('pointerdown', (event) => event.stopPropagation());
        input.addEventListener('mousedown', (event) => event.stopPropagation());
        input.addEventListener('touchstart', (event) => event.stopPropagation());
        this.nicknameInputElement = input;
        this.nicknameInputDom = this.add
            .dom(GAME_WIDTH / 2, GAME_HEIGHT - 110, input)
            .setOrigin(0.5);
    }
    showNicknameButton() {
        this.nicknameInputDom?.setVisible(false);
        this.nicknameButton.setVisible(true);
    }
    showNicknameInput() {
        if (!this.nicknameInputElement || !this.nicknameInputDom)
            return;
        this.nicknameButton.setVisible(false);
        this.nicknameInputElement.value = getNickname();
        this.nicknameInputDom.setVisible(true);
        // 等 DOM 顯示後再聚焦
        setTimeout(() => {
            this.nicknameInputElement?.focus();
            this.nicknameInputElement?.select();
        }, 30);
    }
    formatNicknameLabel(name) {
        return `昵称：${name}  ✎`;
    }
    async refreshLeaderboard() {
        const rows = await fetchTop();
        this.leaderboardText.setText(this.formatLeaderboard(rows));
    }
    formatLeaderboard(rows) {
        if (!rows || rows.length === 0) {
            return '(尚无纪录，快去挑战吧！)';
        }
        // 標頭：名次 / 玩家 / 分數 / 到達關卡（✓ 代表該關已通關）
        const header = ` #  ${'玩家'.padEnd(11, ' ')}${'分数'.padStart(6, ' ')}  关卡`;
        const body = rows.map((entry, index) => {
            const rank = String(index + 1).padStart(2, ' ');
            const name = String(entry.name ?? '').padEnd(12, ' ').slice(0, 12);
            const score = String(entry.score ?? 0).padStart(7, ' ');
            const stageNumber = Math.max(1, Math.floor(entry.stage ?? 1));
            const stage = `第${stageNumber}关${entry.cleared ? '✓' : ''}`;
            return `${rank}. ${name} ${score}  ${stage}`;
        });
        return [header, ...body].join('\n');
    }
    shutdown() {
        this.nicknameInputDom?.destroy();
        this.nicknameInputDom = undefined;
        this.nicknameInputElement = undefined;
    }
}
