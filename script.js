// ゲーム設定
const GAME_CONFIG = {
    HOLES: 10,
    GAME_DURATION: 30, // 秒
    MAX_LEVEL: 7,
    CAT_PARTS: ['😺', '😸', '😻', '🐱', '😽', '😹', '🙀','🐾'], // 猫のみ（なでてOK）
    TRAP_PARTS: ['🦴', '🐶'], // 罠（クリックしたらゲームオーバー）
};

// レベルごとの設定（猫が出ている時間をミリ秒で設定）
const LEVEL_CONFIG = {
    1: { showTime: 1800, spawnInterval: 1400 },
    2: { showTime: 1600, spawnInterval: 1200 },
    3: { showTime: 1400, spawnInterval: 1000 },
    4: { showTime: 1200, spawnInterval: 900 },
    5: { showTime: 1100, spawnInterval: 800 },
    6: { showTime: 1000, spawnInterval: 750 },
    7: { showTime: 950, spawnInterval: 700 },
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
    lastClearedLevel: 0, // 最後にクリアしたレベル
    lastClearedScore: 0, // 最後にクリアした時のスコア
};

// DOM要素
const gameBoard = document.getElementById('gameBoard');
const startBtn = document.getElementById('startBtn');
const cancelBtn = document.getElementById('cancelBtn');
const resetBtn = document.getElementById('resetBtn');
const levelDisplay = document.getElementById('level');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const gameOverModal = document.getElementById('gameOverModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const finalScore = document.getElementById('finalScore');
const reachedLevel = document.getElementById('reachedLevel');
const restartBtn = document.getElementById('restartBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
const nameInputSection = document.getElementById('nameInputSection');
const playerNameInput = document.getElementById('playerName');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const skipSaveBtn = document.getElementById('skipSaveBtn');
const rankingBtn = document.getElementById('rankingBtn');
const rankingModal = document.getElementById('rankingModal');
const rankingList = document.getElementById('rankingList');
const closeRankingBtn = document.getElementById('closeRankingBtn');

// 初期化
function init() {
    createHoles();
    startBtn.addEventListener('click', startGame);
    cancelBtn.addEventListener('click', cancelGame);
    resetBtn.addEventListener('click', resetGame);
    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', playAgain);
    saveScoreBtn.addEventListener('click', saveScore);
    skipSaveBtn.addEventListener('click', skipSave);
    rankingBtn.addEventListener('click', showRanking);
    closeRankingBtn.addEventListener('click', closeRanking);
    
    // キャンバスサイズを設定
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // ページ離脱時に状態を保存
    window.addEventListener('beforeunload', () => {
        if (gameState.level > 1 || gameState.score > 0) {
            saveGameState();
        }
    });
    
    // ゲーム状態を復元
    restoreGameState();
}

// キャンバスサイズ調整
function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
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
    
    // ゲームオーバー後の再プレイの場合、前回クリア時のスコアに戻す
    if (gameState.lastClearedLevel > 0 && gameState.level === gameState.lastClearedLevel + 1) {
        // 同じレベルを再プレイする場合
        gameState.score = gameState.lastClearedScore;
        scoreDisplay.textContent = gameState.score;
    } else if (gameState.level === 1 && gameState.lastClearedLevel === 0) {
        // レベル1の最初のプレイ
        gameState.score = 0;
        scoreDisplay.textContent = gameState.score;
    }
    
    startBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-block';
    
    updateDisplay();
    saveGameState(); // ゲーム状態を保存
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
    
    // 猫か罠かをランダムに決定（70%の確率で猫、30%の確率で罠）
    const isCat = Math.random() < 0.7;
    let selectedPart;
    
    if (isCat) {
        // ランダムな猫パーツを選択
        selectedPart = GAME_CONFIG.CAT_PARTS[Math.floor(Math.random() * GAME_CONFIG.CAT_PARTS.length)];
        catElement.dataset.isCat = 'true';
    } else {
        // ランダムな罠パーツを選択
        selectedPart = GAME_CONFIG.TRAP_PARTS[Math.floor(Math.random() * GAME_CONFIG.TRAP_PARTS.length)];
        catElement.dataset.isCat = 'false';
    }
    
    catElement.textContent = selectedPart;
    
    // 猫を表示
    catElement.classList.add('show');
    
    // 一定時間後に猫を隠す
    const hideTimeout = setTimeout(() => {
        // ゲームが終了していたら何もしない
        if (!gameState.isPlaying) return;
        
        if (catElement.classList.contains('show') && gameState.activeCats.has(holeIndex)) {
            // 猫の場合のみ、なでられなかったらゲームオーバー
            if (isCat) {
                hideCat(holeIndex);
                gameOver(false);
            } else {
                // 罠の場合は自然に消える（ゲームオーバーにならない）
                hideCat(holeIndex);
            }
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
        // 猫かどうかをチェック
        const isCat = catElement.dataset.isCat === 'true';
        
        if (isCat) {
            // 猫の場合：スコア加算
            gameState.score += 10 * gameState.level;
            scoreDisplay.textContent = gameState.score;
            saveGameState(); // スコア更新時に保存
            
            // アニメーション
            catElement.classList.add('petted');
            setTimeout(() => {
                catElement.classList.remove('petted');
            }, 300);
            
            // 猫を隠す
            hideCat(index);
        } else {
            // 罠の場合：ゲームオーバー
            catElement.classList.add('petted');
            setTimeout(() => {
                catElement.classList.remove('petted');
                hideCat(index);
                gameOver(false, true); // 罠を踏んだことを示すフラグ
            }, 300);
        }
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
    
    // クリア時のレベルとスコアを記録
    gameState.lastClearedLevel = gameState.level;
    gameState.lastClearedScore = gameState.score;
    saveGameState(); // 状態を保存
    
    if (gameState.level < GAME_CONFIG.MAX_LEVEL) {
        gameState.level++;
        levelDisplay.textContent = gameState.level;
        
        modalTitle.textContent = '🎉 レベルクリア！ 🎉';
        modalMessage.textContent = `レベル${gameState.level}に進みます！`;
        reachedLevel.textContent = gameState.lastClearedLevel;
        finalScore.textContent = gameState.lastClearedScore;
        nameInputSection.classList.add('hidden');
        restartBtn.textContent = '次のレベル';
        restartBtn.style.display = 'inline-block';
        playAgainBtn.classList.add('hidden');
        gameOverModal.classList.remove('hidden');
    } else {
        // 全レベルクリア - 紙吹雪を表示
        startConfetti();
        
        modalTitle.textContent = '🏆 全レベルクリア！ 🏆';
        modalMessage.textContent = 'おめでとうございます！すべてのレベルをクリアしました！';
        reachedLevel.textContent = gameState.level;
        finalScore.textContent = gameState.score;
        nameInputSection.classList.remove('hidden');
        restartBtn.style.display = 'none';
        playAgainBtn.classList.remove('hidden');
        gameOverModal.classList.remove('hidden');
    }
}

// ゲームオーバー
function gameOver(success, isTrap = false) {
    stopGame();
    
    if (!success) {
        modalTitle.textContent = '😿 ゲームオーバー 😿';
        if (isTrap) {
            modalMessage.textContent = '罠をクリックしてしまいました...';
        } else {
            modalMessage.textContent = '猫ちゃんが怒って逃げてしまいました...';
        }
        
        // 最後にクリアしたレベルとスコアを表示
        // レベル1でゲームオーバーの場合は、クリアレベル0として扱う
        const displayLevel = gameState.lastClearedLevel > 0 ? gameState.lastClearedLevel : 0;
        const displayScore = gameState.lastClearedLevel > 0 ? gameState.lastClearedScore : 0;
        
        reachedLevel.textContent = displayLevel;
        finalScore.textContent = displayScore;
        
        // スコアを前回クリア時に戻す（再プレイ用）
        gameState.score = gameState.lastClearedScore;
        scoreDisplay.textContent = gameState.score;
        
        // レベル1以降でゲームオーバーの場合のみ登録可能
        if (displayLevel > 0) {
            nameInputSection.classList.remove('hidden');
            restartBtn.style.display = 'none';
        } else {
            nameInputSection.classList.add('hidden');
            restartBtn.style.display = 'inline-block';
            restartBtn.textContent = 'もう一度';
        }
        
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
    gameState.lastClearedLevel = 0;
    gameState.lastClearedScore = 0;
    gameState.timeLeft = GAME_CONFIG.GAME_DURATION;
    updateDisplay();
    startBtn.disabled = false;
    clearGameState(); // 保存された状態をクリア
}

// ゲーム再開
function restartGame() {
    gameOverModal.classList.add('hidden');
    stopConfetti(); // 紙吹雪を停止
    
    // レベル7クリア後は最初から
    if (gameState.level > GAME_CONFIG.MAX_LEVEL) {
        gameState.level = 1;
        gameState.score = 0;
        gameState.lastClearedLevel = 0;
        gameState.lastClearedScore = 0;
        levelDisplay.textContent = gameState.level;
        scoreDisplay.textContent = gameState.score;
        clearGameState(); // 保存された状態をクリア
    }
    
    // ゲームオーバー後は開始ボタンを表示
    gameState.timeLeft = GAME_CONFIG.GAME_DURATION;
    updateDisplay();
    startBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'none';
}

// 最初から遊ぶ（全レベルクリア後）
function playAgain() {
    gameOverModal.classList.add('hidden');
    stopConfetti(); // 紙吹雪を停止
    
    // レベルとスコアをリセット
    gameState.level = 1;
    gameState.score = 0;
    gameState.lastClearedLevel = 0;
    gameState.lastClearedScore = 0;
    gameState.timeLeft = GAME_CONFIG.GAME_DURATION;
    
    levelDisplay.textContent = gameState.level;
    scoreDisplay.textContent = gameState.score;
    updateDisplay();
    clearGameState(); // 保存された状態をクリア
    
    // 開始ボタンを表示
    startBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'none';
}

// リセット（ヘッダーのリセットボタン）
function resetGame() {
    // 確認ダイアログを表示
    if (gameState.level > 1 || gameState.score > 0) {
        if (!confirm('ゲームを最初からやり直しますか？\n現在の進行状況は失われます。')) {
            return;
        }
    }
    
    // ゲームを停止
    if (gameState.isPlaying) {
        stopGame();
    }
    
    // すべてをリセット
    gameState.level = 1;
    gameState.score = 0;
    gameState.lastClearedLevel = 0;
    gameState.lastClearedScore = 0;
    gameState.timeLeft = GAME_CONFIG.GAME_DURATION;
    
    levelDisplay.textContent = gameState.level;
    scoreDisplay.textContent = gameState.score;
    updateDisplay();
    clearGameState(); // 保存された状態をクリア
    
    // ボタンの状態をリセット
    startBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'none';
    
    // モーダルを閉じる
    gameOverModal.classList.add('hidden');
    stopConfetti();
}

// 表示更新
function updateDisplay() {
    levelDisplay.textContent = gameState.level;
    scoreDisplay.textContent = gameState.score;
    timerDisplay.textContent = gameState.timeLeft;
}

// 紙吹雪エフェクト
let confettiParticles = [];
let confettiAnimationId = null;

class ConfettiParticle {
    constructor() {
        this.x = Math.random() * confettiCanvas.width;
        this.y = -10;
        this.size = Math.random() * 8 + 5;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.color = this.getRandomColor();
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
    }
    
    getRandomColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
            '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e',
            '#e17055', '#74b9ff', '#55efc4', '#ffeaa7'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
        
        if (this.y > confettiCanvas.height) {
            return false;
        }
        return true;
    }
    
    draw() {
        confettiCtx.save();
        confettiCtx.translate(this.x, this.y);
        confettiCtx.rotate(this.rotation * Math.PI / 180);
        confettiCtx.fillStyle = this.color;
        confettiCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        confettiCtx.restore();
    }
}

function startConfetti() {
    // 既存の紙吹雪をクリア
    stopConfetti();
    
    // 初期の紙吹雪を生成
    for (let i = 0; i < 150; i++) {
        confettiParticles.push(new ConfettiParticle());
    }
    
    animateConfetti();
}

function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    // パーティクルを更新・描画
    confettiParticles = confettiParticles.filter(particle => {
        particle.draw();
        return particle.update();
    });
    
    // 新しいパーティクルを追加（最初の3秒間）
    if (confettiParticles.length < 150 && Math.random() < 0.3) {
        confettiParticles.push(new ConfettiParticle());
    }
    
    // パーティクルが残っている間はアニメーション継続
    if (confettiParticles.length > 0) {
        confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
        confettiAnimationId = null;
    }
}

function stopConfetti() {
    if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
    }
    confettiParticles = [];
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// ランキング機能
function getRankings() {
    // Firebaseが利用可能な場合はFirebaseから取得（リアルタイム同期）
    // この関数は直接呼ばれず、showRanking()で非同期に取得される
    const rankings = localStorage.getItem('catGameRankings');
    return rankings ? JSON.parse(rankings) : [];
}

function saveRankings(rankings) {
    localStorage.setItem('catGameRankings', JSON.stringify(rankings));
}

async function saveScore() {
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        alert('名前を入力してください');
        return;
    }
    
    // 最後にクリアしたレベルとスコアを使用
    const recordLevel = gameState.lastClearedLevel > 0 ? gameState.lastClearedLevel : gameState.level;
    const recordScore = gameState.lastClearedLevel > 0 ? gameState.lastClearedScore : gameState.score;
    
    const newRecord = {
        name: playerName,
        level: recordLevel,
        score: recordScore,
        timestamp: Date.now(),
        date: new Date().toISOString()
    };
    
    try {
        // Firebaseに保存
        if (window.firebaseDB) {
            const rankingsRef = window.firebaseRef(window.firebaseDB, 'rankings');
            await window.firebasePush(rankingsRef, newRecord);
            alert('ランキングに登録しました！（全デバイスで同期されます）');
        } else {
            // Firebaseが利用できない場合はLocalStorageに保存
            let rankings = getRankings();
            rankings.push(newRecord);
            rankings.sort((a, b) => b.score - a.score);
            rankings = rankings.slice(0, 10);
            saveRankings(rankings);
            alert('ランキングに登録しました！');
        }
    } catch (error) {
        console.error('保存エラー:', error);
        alert('保存に失敗しました。もう一度お試しください。');
        return;
    }
    
    // 入力欄をクリア
    playerNameInput.value = '';
    nameInputSection.classList.add('hidden');
    restartBtn.style.display = 'inline-block';
    restartBtn.textContent = 'ゲームに戻る';
}

function skipSave() {
    nameInputSection.classList.add('hidden');
    restartBtn.style.display = 'inline-block';
    restartBtn.textContent = 'ゲームに戻る';
}

function showRanking() {
    if (window.firebaseDB) {
        // Firebaseからリアルタイムで取得
        const rankingsRef = window.firebaseRef(window.firebaseDB, 'rankings');
        
        window.firebaseOnValue(rankingsRef, (snapshot) => {
            const data = snapshot.val();
            let rankings = [];
            
            if (data) {
                // オブジェクトを配列に変換
                rankings = Object.values(data);
                // スコアでソート（降順）
                rankings.sort((a, b) => b.score - a.score);
                // 上位10件のみ
                rankings = rankings.slice(0, 10);
            }
            
            displayRankings(rankings);
        }, { onlyOnce: true });
    } else {
        // Firebaseが利用できない場合はLocalStorageから取得
        const rankings = getRankings();
        displayRankings(rankings);
    }
    
    rankingModal.classList.remove('hidden');
}

function displayRankings(rankings) {
    if (rankings.length === 0) {
        rankingList.innerHTML = '<p style="text-align: center; color: #999;">まだランキングがありません</p>';
    } else {
        let html = '';
        rankings.forEach((record, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            html += `
                <div class="ranking-item ${isTop3 ? 'top3' : ''}">
                    <div class="ranking-rank">${rank}</div>
                    <div class="ranking-name">${record.name}</div>
                    <div class="ranking-info">
                        <div class="ranking-level">レベル ${record.level}</div>
                        <div class="ranking-score">${record.score}点</div>
                    </div>
                </div>
            `;
        });
        rankingList.innerHTML = html;
    }
}

function closeRanking() {
    rankingModal.classList.add('hidden');
}

// ゲーム状態の保存と復元
function saveGameState() {
    const state = {
        level: gameState.level,
        score: gameState.score,
        lastClearedLevel: gameState.lastClearedLevel,
        lastClearedScore: gameState.lastClearedScore,
        timestamp: Date.now()
    };
    sessionStorage.setItem('catGameState', JSON.stringify(state));
}

function restoreGameState() {
    const savedState = sessionStorage.getItem('catGameState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            // 5分以内の状態のみ復元
            if (Date.now() - state.timestamp < 5 * 60 * 1000) {
                gameState.level = state.level;
                gameState.score = state.score;
                gameState.lastClearedLevel = state.lastClearedLevel || 0;
                gameState.lastClearedScore = state.lastClearedScore || 0;
                updateDisplay();
            } else {
                // 古い状態は削除
                sessionStorage.removeItem('catGameState');
            }
        } catch (error) {
            console.error('状態の復元に失敗:', error);
        }
    }
}

function clearGameState() {
    sessionStorage.removeItem('catGameState');
}

// 初期化実行
init();
