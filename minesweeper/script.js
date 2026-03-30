const minefield = document.getElementById('minefield');
const mineCountElement = document.getElementById('mine-count');
const timerElement = document.getElementById('timer');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const restartBtn = document.getElementById('restart-btn');

const ROWS = 10;
const COLS = 10;
const MINES = 10;

let grid = [];
let revealedCount = 0;
let minesLeft = MINES;
let timer = 0;
let timerInterval;
let isGameOver = false;
let firstClick = true;

function init() {
    createGrid();
    restartBtn.addEventListener('click', resetGame);
    // Disable context menu for right click flags
    minefield.oncontextmenu = (e) => e.preventDefault();
}

function createGrid() {
    minefield.innerHTML = '';
    grid = [];
    revealedCount = 0;
    minesLeft = MINES;
    mineCountElement.textContent = minesLeft.toString().padStart(3, '0');
    
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            cell.addEventListener('click', () => handleCellClick(r, c));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellRightClick(r, c);
            });
            
            minefield.appendChild(cell);
            grid[r][c] = {
                element: cell,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            };
        }
    }
}

function placeMines(exR, exC) {
    let placed = 0;
    while (placed < MINES) {
        let r = Math.floor(Math.random() * ROWS);
        let c = Math.floor(Math.random() * COLS);
        
        // Don't place mine on first click cell or its neighbors
        if (!grid[r][c].isMine && (Math.abs(r - exR) > 1 || Math.abs(c - exC) > 1)) {
            grid[r][c].isMine = true;
            placed++;
        }
    }
    
    // Calculate neighbor counts
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!grid[r][c].isMine) {
                grid[r][c].neighborMines = countNeighborMines(r, c);
            }
        }
    }
}

function countNeighborMines(r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let nr = r + i;
            let nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].isMine) {
                count++;
            }
        }
    }
    return count;
}

function handleCellClick(r, c) {
    if (isGameOver || grid[r][c].isRevealed || grid[r][c].isFlagged) return;

    if (firstClick) {
        firstClick = false;
        placeMines(r, c);
        startTimer();
    }

    revealCell(r, c);
}

function handleCellRightClick(r, c) {
    if (isGameOver || grid[r][c].isRevealed) return;

    const cell = grid[r][c];
    cell.isFlagged = !cell.isFlagged;
    
    if (cell.isFlagged) {
        cell.element.classList.add('flagged');
        cell.element.textContent = '🚩';
        minesLeft--;
    } else {
        cell.element.classList.remove('flagged');
        cell.element.textContent = '';
        minesLeft++;
    }
    mineCountElement.textContent = Math.max(0, minesLeft).toString().padStart(3, '0');
}

function revealCell(r, c) {
    const cell = grid[r][c];
    if (cell.isRevealed) return;

    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    revealedCount++;

    if (cell.isMine) {
        gameOver(false);
        return;
    }

    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines;
        cell.element.dataset.value = cell.neighborMines;
    } else {
        // Flood fill for empty cells
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                let nr = r + i;
                let nc = c + j;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    revealCell(nr, nc);
                }
            }
        }
    }

    if (revealedCount === (ROWS * COLS) - MINES) {
        gameOver(true);
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        timerElement.textContent = timer.toString().padStart(3, '0');
    }, 1000);
}

function gameOver(isWin) {
    isGameOver = true;
    clearInterval(timerInterval);
    
    // Reveal all mines
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c].isMine) {
                grid[r][c].element.classList.add('mine');
                grid[r][c].element.textContent = '💣';
            }
        }
    }

    overlayText.textContent = isWin ? '任務達成！' : '踩到地雷了';
    overlayText.style.color = isWin ? '#00ff88' : '#ff0055';
    overlay.classList.remove('hidden');
}

function resetGame() {
    isGameOver = false;
    firstClick = true;
    timer = 0;
    clearInterval(timerInterval);
    timerElement.textContent = '000';
    overlay.classList.add('hidden');
    createGrid();
}

init();
