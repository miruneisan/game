// ゲーム設定
const GAME_CONFIG = {
    HOLES: 10,
    GAME_DURATION: 30, // 秒
    MAX_LEVEL: 7,
    CAT_PARTS: ['😺', '😸', '😻', '🐱', '😽', '😹','🙀','😿','🐾', '🦴','🐶'], // 猫の顔、手足など
};

// レベルごとの設定（猫が出ている時間をミリ秒で設定）
const LEVEL_CONFIG = {
    1: { showTime: 2000, spawnInterval: 1600 },
    2: { showTime: 1800, spawnInterval: 1400 },
    3: { showTime: 1600, spawnInterval: 1200 },
    4: { showTime: 1400, spawnInterval: 1000 },
    5: { showTime: 1200, spawnInterval: 900 },
    6: { showTime: 1100, spawnInterval: 800 },
    7: { showTime: 1000, spawnInterval: 700 },
};

// ゲーム状態
let gameState = {
    level: 1,
    score: 0,
    timeLeft: GAME_CONFIG.GAME_DURATION,
    isPlaying: false,
    activeCats: new Map(), // index -> timeoutId を保存
    spawnTimer: null,
    gameTimer: null,
};

// DOM要素
const gameBoard = document.getElementById('gameBoard');
const startBtn = document.getElementById('startBtn');
const cancelBtn = document.getElementById('cancelBtn');
const levelDisplay = document.getElementById('level');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const gameOverModal = document.getElementById('gameOverModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const finalScore = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// 初期化
function init() {
    createHoles();
    startBtn.addEventListener('click', startGame);
    cancelBtn.addEventListener('click', cancelGame);
    restartBtn.addEventListener('click', restartGame);
}

// 穴を作成
function createHoles() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < GAME_CONFIG.HOLES; i++) {
        const hole = document.createElement('div');
        hole.className = 'hole';
        hole.dataset.index = i;
        
        const cat = document.createElement('div');
        cat.className = 'cat';
        cat.dataset.index = i;
        
        hole.appendChild(cat);
        gameBoard.appendChild(hole);
        
        // クリックイベント
        cat.addEventListener('click', () => petCat(i));
    }
}

// ゲーム開始
function startGame() {
    gameState.isPlaying = true;
    gameState.timeLeft = GAME_CONFIG.GAME_DURATION;
    startBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-block';
    
    updateDisplay();
    startGameTimer();
    spawnCat();
}

// ゲームタイマー
function startGameTimer() {
    gameState.gameTimer = setInterval(() => {
        gameState.timeLeft--;
        timerDisplay.textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            levelComplete();
        }
    }, 1000);
}

// 猫を出現させる
function spawnCat() {
    if (!gameState.isPlaying) return;
    
    const config = LEVEL_CONFIG[gameState.level];
    const availableHoles = [];
    
    // 空いている穴を探す
    for (let i = 0; i < GAME_CONFIG.HOLES; i++) {
        if (!gameState.activeCats.has(i)) {
            availableHoles.push(i);
        }
    }
    
    if (availableHoles.length === 0) {
        // すべての穴が埋まっている場合は少し待つ
        gameState.spawnTimer = setTimeout(() => spawnCat(), 500);
        return;
    }
    
    // ランダムな穴を選択
    const holeIndex = availableHoles[Math.floor(Math.random() * availableHoles.length)];
    const catElement = document.querySelector(`.cat[data-index="${holeIndex}"]`);
    
    // ランダムな猫パーツを選択
    const catPart = GAME_CONFIG.CAT_PARTS[Math.floor(Math.random() * GAME_CONFIG.CAT_PARTS.length)];
    catElement.textContent = catPart;
    
    // 猫を表示
    catElement.classList.add('show');
    
    // 一定時間後に猫を隠す
    const hideTimeout = setTimeout(() => {
        // ゲームが終了していたら何もしない
        if (!gameState.isPlaying) return;
        
        if (catElement.classList.contains('show') && gameState.activeCats.has(holeIndex)) {
            // なでられなかった場合はゲームオーバー
            hideCat(holeIndex);
            gameOver(false);
        }
    }, config.showTime);
    
    // タイムアウトIDを保存
    gameState.activeCats.set(holeIndex, hideTimeout);
    
    // 次の猫を出現させる
    if (gameState.isPlaying) {
        gameState.spawnTimer = setTimeout(() => spawnCat(), config.spawnInterval);
    }
}

// 猫をなでる
function petCat(index) {
    if (!gameState.isPlaying) return;
    
    const catElement = document.querySelector(`.cat[data-index="${index}"]`);
    
    if (catElement.classList.contains('show') && gameState.activeCats.has(index)) {
        // スコア加算
        gameState.score += 10 * gameState.level;
        scoreDisplay.textContent = gameState.score;
        
        // アニメーション
        catElement.classList.add('petted');
        setTimeout(() => {
            catElement.classList.remove('petted');
        }, 300);
        
        // 猫を隠す
        hideCat(index);
    }
}

// 猫を隠す
function hideCat(index) {
    const catElement = document.querySelector(`.cat[data-index="${index}"]`);
    catElement.classList.remove('show');
    
    // タイムアウトをクリア
    if (gameState.activeCats.has(index)) {
        clearTimeout(gameState.activeCats.get(index));
        gameState.activeCats.delete(index);
    }
}

// レベルクリア
function levelComplete() {
    stopGame();
    
    if (gameState.level < GAME_CONFIG.MAX_LEVEL) {
        gameState.level++;
        levelDisplay.textContent = gameState.level;
        
        modalTitle.textContent = '🎉 レベルクリア！ 🎉';
        modalMessage.textContent = `レベル${gameState.level}に進みます！`;
        finalScore.textContent = gameState.score;
        restartBtn.textContent = '次のレベル';
        gameOverModal.classList.remove('hidden');
    } else {
        // 全レベルクリア
        modalTitle.textContent = '🏆 全レベルクリア！ 🏆';
        modalMessage.textContent = 'おめでとうございます！すべてのレベルをクリアしました！';
        finalScore.textContent = gameState.score;
        restartBtn.textContent = 'もう一度';
        gameOverModal.classList.remove('hidden');
    }
}

// ゲームオーバー
function gameOver(success) {
    stopGame();
    
    if (!success) {
        modalTitle.textContent = '😿 ゲームオーバー 😿';
        modalMessage.textContent = '猫ちゃんが怒って逃げてしまいました...';
        finalScore.textContent = gameState.score;
        restartBtn.textContent = 'もう一度';
        gameOverModal.classList.remove('hidden');
    }
}

// ゲーム停止
function stopGame() {
    gameState.isPlaying = false;
    
    if (gameState.spawnTimer) {
        clearTimeout(gameState.spawnTimer);
    }
    
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
    }
    
    // すべての猫のタイムアウトをクリア
    gameState.activeCats.forEach((timeoutId) => {
        clearTimeout(timeoutId);
    });
    
    // すべての猫を隠す
    document.querySelectorAll('.cat').forEach(cat => {
        cat.classList.remove('show');
    });
    gameState.activeCats.clear();
    
    // ボタン表示を戻す
    startBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'none';
}

// ゲームキャンセル
function cancelGame() {
    stopGame();
    gameState.level = 1;
    gameState.score = 0;
    gameState.timeLeft = GAME_CONFIG.GAME_DURATION;
    updateDisplay();
    startBtn.disabled = false;
}

// ゲーム再開
function restartGame() {
    gameOverModal.classList.add('hidden');
    
    // レベル7クリア後は最初から
    if (gameState.level > GAME_CONFIG.MAX_LEVEL) {
        gameState.level = 1;
        gameState.score = 0;
        levelDisplay.textContent = gameState.level;
        scoreDisplay.textContent = gameState.score;
    }
    
    // ゲームを自動的に開始
    startGame();
}

// 表示更新
function updateDisplay() {
    levelDisplay.textContent = gameState.level;
    scoreDisplay.textContent = gameState.score;
    timerDisplay.textContent = gameState.timeLeft;
}

// 初期化実行
init();
