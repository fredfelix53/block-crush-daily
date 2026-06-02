/* ===== Block Crush Daily — Game Engine =====
   Visual overhaul: particles, gradients, animations, glow effects
*/
const COLS = 10;
const ROWS = 18;
const CELL = 28;

// ─── Tetromino piece definitions (I, O, T, S, Z, J, L) ──
const SHAPES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};
const PIECE_TYPES = ['I','O','T','S','Z','J','L'];

// ─── Game State ──────────────────────────────────────
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let combo = 5; // starting energy/combo
let maxCombo = 5;
let gameOver = false;
let gameActive = false;
let placedCount = 0;
let bestComboThisGame = 0;
let linesClearedThisGame = 0;

// Refs
let canvas, ctx, nextCanvas, nextCtx;
let particles = null;
let floatingTexts = [];

// ─── Canvas Setup ────────────────────────────────────
function initCanvas() {
  canvas = document.getElementById('game-board');
  ctx = canvas.getContext('2d');
  canvas.width = COLS * CELL + 4;
  canvas.height = ROWS * CELL + 4;

  nextCanvas = document.getElementById('next-piece-canvas');
  nextCtx = nextCanvas.getContext('2d');
  nextCanvas.width = 120;
  nextCanvas.height = 100;
}

// ─── Board Functions ─────────────────────────────────
function createBoard() {
  board = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(new Array(COLS).fill(0));
  }
}

function randomPiece() {
  const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const shape = SHAPES[type].map(row => [...row]);
  return {
    type,
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
}

function spawnPiece() {
  if (!nextPiece) nextPiece = randomPiece();
  currentPiece = {
    ...nextPiece,
    shape: nextPiece.shape.map(row => [...row]),
    x: Math.floor((COLS - nextPiece.shape[0].length) / 2),
    y: 0,
  };
  nextPiece = randomPiece();
  drawNextPiece();

  if (!isValid(currentPiece.shape, currentPiece.x, currentPiece.y)) {
    gameActive = false;
    gameOver = true;
    showGameOver();
    return false;
  }
  return true;
}

function isValid(shape, px, py) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const x = px + c;
        const y = py + r;
        if (x < 0 || x >= COLS || y >= ROWS) return false;
        if (y >= 0 && board[y][x]) return false;
      }
    }
  }
  return true;
}

// ─── Lock Piece & Clear Lines ────────────────────────
function lockPiece() {
  if (!currentPiece) return;
  const { shape, x, y, type } = currentPiece;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const bx = x + c;
        const by = y + r;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          board[by][bx] = type;
        }
      }
    }
  }

  placedCount++;

  // Apply combo/shield bonuses from upgrades
  const bonuses = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses() : {};

  // Check shield chance (case bonus - prevents energy loss)
  let energyPenalty = 1;
  if (bonuses.shieldChance && Math.random() < bonuses.shieldChance) {
    energyPenalty = 0;
    // Shield visual feedback
    if (particles) {
      particles.emit(canvas.width/2, canvas.height/2, '#00ffff', 12);
      floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2 - 20, '🛡️ BLOCKED!', '#00ffff', 18));
    }
  }

  // Clear lines
  let cleared = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(cell => cell !== 0)) {
      cleared.push(r);
    }
  }

  if (cleared.length > 0) {
    // Emit line clear particles
    if (particles) {
      const types = ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff'];
      for (const row of cleared) {
        particles.emitLineClear(canvas.width/2, row * CELL + CELL/2, types);
      }
    }

    // Remove cleared lines
    for (const row of cleared.sort((a,b) => a-b)) {
      board.splice(row, 1);
      board.unshift(new Array(COLS).fill(0));
    }

    // Score with bonuses
    const clearBonus = bonuses.clearBonus || 0;
    const scoreMult = bonuses.scoreMult || 1;
    const lineScore = (cleared.length * 100 + clearBonus * cleared.length) * scoreMult + (comboBonus || 0);
    score += Math.floor(lineScore);

    // Combo bonus from outfit
    const comboBonus = bonuses.comboBonus || 0;
    if (combo > Math.max(maxCombo, 5)) {
      // bonus combo points from outfit
    }
    combo = Math.min(combo + cleared.length, 30);

    linesClearedThisGame += cleared.length;
    if (cleared.length > bestComboThisGame) bestComboThisGame = cleared.length;

    // ─── NEW: Report progress to framework modules ──
    if (window.ChallengesSystem) {
      ChallengesSystem.reportProgress('score', Math.floor(lineScore));
      ChallengesSystem.reportProgress('lines', cleared.length);
      ChallengesSystem.reportProgress('combo', cleared.length >= 4 ? 1 : 0);
    }
    if (window.CollectiblesSystem) {
      CollectiblesSystem.setTracker('highestScore', score);
      CollectiblesSystem.setTracker('maxCombo', combo);
    }
    // ─────────────────────────────────────────────────

    // Floating score
    if (floatingTexts) {
      const label = cleared.length >= 4 ? '💥 LINE STORM!' : cleared.length >= 3 ? '🔥 TRIPLE!' : cleared.length >= 2 ? '✨ DOUBLE!' : '👍 CLEAR!';
      floatingTexts.push(new FloatingText(canvas.width/2, canvas.height/2, `+${Math.floor(lineScore)} ${label}`, '#ffd700', 28));
    }

    updateScoreDisplay();
  } else if (energyPenalty > 0) {
    combo--;
    if (combo <= 0) {
      gameActive = false;
      gameOver = true;
      showGameOver();
      return;
    }
  }

  // Spawn next piece
  if (gameActive) {
    spawnPiece();
  }
}

// ─── Piece Movement ─────────────────────────────────
function movePiece(dx, dy) {
  if (!currentPiece || !gameActive || gameOver) return false;
  if (isValid(currentPiece.shape, currentPiece.x + dx, currentPiece.y + dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
  }
  // If can't move down, lock
  if (dy > 0) {
    lockPiece();
  }
  return false;
}

function rotatePiece() {
  if (!currentPiece || !gameActive || gameOver) return;
  const shape = currentPiece.shape;
  const rotated = shape[0].map((_, idx) => shape.map(row => row[idx]).reverse());
  if (isValid(rotated, currentPiece.x, currentPiece.y)) {
    currentPiece.shape = rotated;
  }
}

function hardDrop() {
  if (!currentPiece || !gameActive || gameOver) return;
  while (isValid(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
  }
  lockPiece();
}

// ─── Ghost Piece (drop preview) ──────────────────────
function getGhostY() {
  if (!currentPiece) return 0;
  let gy = currentPiece.y;
  while (isValid(currentPiece.shape, currentPiece.x, gy + 1)) gy++;
  return gy;
}

// ─── Render ──────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Board background
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.beginPath();
  ctx.roundRect(2, 2, COLS * CELL, ROWS * CELL, 6);
  ctx.fill();

  // Grid cells
  const themeColors = { bg: '#0f1020', accent: '#1a1a2e' }; // default
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL + 2;
      const y = r * CELL + 2;
      if (board[r][c]) {
        drawGradientBlock(ctx, x, y, CELL, board[r][c], true);
      } else {
        drawEmptyCell(ctx, x, y, CELL, themeColors);
      }
    }
  }

  // Ghost piece
  if (currentPiece && gameActive && !gameOver) {
    const gy = getGhostY();
    const { shape, x, type } = currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const bx = (x + c) * CELL + 2;
          const by = (gy + r) * CELL + 2;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.roundRect(bx, by, CELL, CELL, 4);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  // Current piece with glow
  if (currentPiece && gameActive && !gameOver) {
    const { shape, x, y, type } = currentPiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const bx = (x + c) * CELL + 2;
          const by = (y + r) * CELL + 2;
          // Stronger glow for active piece
          drawGradientBlock(ctx, bx, by, CELL, type, true, '#ffffff');
        }
      }
    }
  }

  // Particles
  if (particles) {
    particles.update();
    particles.draw(ctx);
  }

  // Floating texts
  floatingTexts = floatingTexts.filter(ft => ft.update());
  for (const ft of floatingTexts) {
    ft.draw(ctx);
  }
}

function drawNextPiece() {
  if (!nextCtx || !nextPiece) return;
  const nc = nextCanvas;
  nextCtx.clearRect(0, 0, nc.width, nc.height);

  const shape = nextPiece.shape;
  const cw = 24;
  const sw = shape[0].length * cw;
  const sh = shape.length * cw;
  const ox = (nc.width - sw) / 2;
  const oy = (nc.height - sh) / 2;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        drawGradientBlock(nextCtx, ox + c * cw, oy + r * cw, cw, nextPiece.type, false);
      }
    }
  }
}

// ─── Game Loop ───────────────────────────────────────
let lastDrop = 0;
const DROP_INTERVAL = 800;

function gameLoop(timestamp) {
  if (!gameActive || gameOver) return;

  if (timestamp - lastDrop > DROP_INTERVAL) {
    movePiece(0, 1);
    lastDrop = timestamp;
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ─── Score Display ──────────────────────────────────
function updateScoreDisplay() {
  const el = document.getElementById('score-value');
  if (el) {
    el.textContent = score;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
  const energyEl = document.getElementById('combo-display');
  if (energyEl) energyEl.textContent = combo + '/' + maxCombo;
}

// ─── Start Game ─────────────────────────────────────
function startGame() {
  createBoard();
  score = 0;
  combo = 5;
  gameOver = false;
  gameActive = true;
  placedCount = 0;
  bestComboThisGame = 0;
  linesClearedThisGame = 0;
  floatingTexts = [];

  // ─── NEW: Notify framework modules ──────────────
  if (window.RetentionSystem) {
    RetentionSystem.onGameStart();
  }
  if (window.ChallengesSystem) {
    // Report game played
  }
  // ─────────────────────────────────────────────────

  // Apply upgrade bonuses
  if (window.ProgressionSystem) {
    const bonuses = ProgressionSystem.getActiveBonuses();
    combo += (bonuses.startEnergy || 0); // case bonus
    if (bonuses.extraLife) maxCombo = 5 + bonuses.extraLife; // outfit bonus
    else maxCombo = 5;
  }

  // Init particles
  particles = new ParticleSystem();

  document.getElementById('game-over-overlay')?.classList.remove('visible');

  lastDrop = performance.now();
  nextPiece = randomPiece();
  if (!spawnPiece()) {
    gameActive = false;
    gameOver = true;
    showGameOver();
    return;
  }

  updateScoreDisplay();
  gameLoop(performance.now());
}

// ─── Game Over ──────────────────────────────────────
function showGameOver() {
  const overlay = document.getElementById('game-over-overlay');
  if (!overlay) return;
  overlay.classList.add('visible');
  document.getElementById('final-score').textContent = score;

  // End of game stats for progression
  if (window.ProgressionSystem) {
    ProgressionSystem.endOfGame({
      score,
      linesCleared: linesClearedThisGame,
      bestCombo: bestComboThisGame,
    });

    // Check achievements
    const unlocked = ProgressionSystem.checkAchievements();
    if (unlocked.length > 0) {
      // Show achievement popup after a brief delay
      setTimeout(() => showAchievementPopup(unlocked), 1000);
    }

    // Check daily bonus
    setTimeout(() => checkDailyBonus(), 1500);
  }

  // ─── NEW: Framework module hooks ────────────────
  if (window.RetentionSystem) {
    RetentionSystem.onGameEnd(score);
    RetentionSystem.submitScore('Player', score);
  }
  if (window.ChallengesSystem) {
    ChallengesSystem.reportProgress('score', score);
    ChallengesSystem.reportProgress('lines', linesClearedThisGame);
    ChallengesSystem.reportProgress('games', 1);
    if (bestComboThisGame >= 3) ChallengesSystem.reportProgress('combo', 1);
  }
  if (window.CollectiblesSystem) {
    CollectiblesSystem.incrementTracker('totalGames');
    CollectiblesSystem.setTracker('highestScore', score);
    CollectiblesSystem.setTracker('maxCombo', bestComboThisGame);
  }
  // Try interstitial ad
  if (window.AdsManager) {
    setTimeout(() => AdsManager.tryShowInterstitial(), 2000);
  }
  // ─────────────────────────────────────────────────

  // Level up particles
  if (particles) {
    setTimeout(() => particles.emitLevelUp(), 500);
  }
}

function showAchievementPopup(achievements) {
  const existing = document.querySelector('.achievement-popup');
  if (existing) existing.remove();

  achievements.forEach((ach, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'achievement-popup show';
      div.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-title">🏅 Achievement Unlocked!</div>
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
        <div class="ach-reward">+${ach.reward.coins} 🪙 ${ach.reward.gems ? `+${ach.reward.gems} 💎` : ''}</div>
      `;
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    }, i * 700);
  });
}

function checkDailyBonus() {
  if (!window.ProgressionSystem) return;
  const result = ProgressionSystem.claimDailyBonus();
  if (!result) return;

  const existing = document.querySelector('.daily-bonus-popup');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = 'daily-bonus-popup show';
  div.innerHTML = `
    <h3>📅 Daily Bonus Claimed!</h3>
    <div class="streak-fire">${'🔥'.repeat(Math.min(result.streak, 7))}</div>
    <div class="reward-row">🪙 +${result.coins} coins</div>
    ${result.gems ? `<div class="reward-row">💎 +${result.gems} gems</div>` : ''}
    <div style="font-size:13px;color:#888;margin-top:6px;">Day ${result.streak} streak!</div>
    <button class="game-btn btn-primary" style="margin-top:10px;display:inline-flex;" onclick="this.closest('.daily-bonus-popup').remove()">Awesome!</button>
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ─── UI Controls ─────────────────────────────────────
function initUI() {
  // Close game over
  document.getElementById('restart-btn')?.addEventListener('click', startGame);

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!gameActive || gameOver) return;
    switch(e.key) {
      case 'ArrowLeft': movePiece(-1, 0); break;
      case 'ArrowRight': movePiece(1, 0); break;
      case 'ArrowDown': movePiece(0, 1); break;
      case 'ArrowUp': rotatePiece(); break;
      case ' ': case 'Space': e.preventDefault(); hardDrop(); break;
    }
  });
}

// ─── Touch / Drag Controls ──────────────────────────
let touchStartX = 0;
let touchStartY = 0;
let dragTimer = null;

function initTouchControl() {
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    clearTimeout(dragTimer);
    dragTimer = setTimeout(() => hardDrop(), 500);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    clearTimeout(dragTimer);
    if (!gameActive || gameOver) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) > 20) {
      movePiece(dx > 0 ? 1 : -1, 0);
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    clearTimeout(dragTimer);
    if (Math.abs(e.changedTouches[0].clientY - touchStartY) < 10 && 
        Math.abs(e.changedTouches[0].clientX - touchStartX) < 10) {
      rotatePiece();
    }
  });
}

// ─── HUD Setup ──────────────────────────────────────
function updateHUD() {
  if (!window.ProgressionSystem) return;
  const state = ProgressionSystem.getState();
  const coins = document.getElementById('hud-coins');
  const gems = document.getElementById('hud-gems');
  const level = document.getElementById('hud-level');
  if (coins) { coins.textContent = state.coins; }
  if (gems) { gems.textContent = state.gems; }
  if (level) { level.textContent = state.level; }
}

// ─── Init ────────────────────────────────────────────
// ─── Global Toast (used by all modules) ────────
function showToast(msg) {
  let el = document.getElementById('system-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'system-toast';
    el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;border:1px solid rgba(255,255,255,0.1);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

function init() {
  initCanvas();
  initUI();
  initTouchControl();

  // Load progression
  if (window.ProgressionSystem) {
    ProgressionSystem.load();
    updateHUD();
    // Refresh HUD periodically
    setInterval(updateHUD, 3000);
  }

  // ─── NEW: Initialize Framework Modules ─────────
  // Store Rotator (for dynamic offers/deals)
  if (window.StoreRotator) {
    StoreRotator.init();
  }

  // Retention System (login rewards, leaderboards, offline)
  if (window.RetentionSystem) {
    RetentionSystem.init();
    // Show offline earnings on load
    const earnings = RetentionSystem.getOfflineEarnings();
    if (earnings > 0) {
      setTimeout(() => {
        showToast('⏰ Welcome back! You earned +' + earnings + ' 🪙 while away!');
        RetentionSystem.claimOfflineEarnings();
        updateHUD();
        RetentionSystem.showLoginRewardsModal();
      }, 1000);
    }
  }

  // Ads Manager (with real AdMob IDs)
  if (window.AdsManager) {
    AdsManager.init({
      rewardedId: 'ca-app-pub-3940256099942544/5224354917',
      interstitialId: 'ca-app-pub-3940256099942544/1033173712',
      bannerId: 'ca-app-pub-3940256099942544/6300978111',
    });
  }

  // Challenges System (daily/weekly/milestone)
  if (window.ChallengesSystem) {
    ChallengesSystem.init();
  }

  // Collectibles System (badges, titles)
  if (window.CollectiblesSystem) {
    CollectiblesSystem.init();
    CollectiblesSystem.setTracker('playerLevel', ProgressionSystem ? ProgressionSystem.getState().level : 1);
  }

  // Tutorial (first-time players)
  if (window.TutorialSystem) {
    TutorialSystem.init({
      gameTitle: 'Block Crush Daily',
      steps: [
        {
          id: 'welcome',
          text: 'Welcome to Block Crush! Arrange falling blocks to complete lines and score points! 🧱',
          target: null,
          position: 'center',
          requireAction: 'tap',
          nextOnAction: true,
          highlight: null,
        },
        {
          id: 'controls',
          text: 'Use ← → to move, ↑ to rotate, ↓ to drop fast. Complete lines to earn coins!',
          target: '#game-board',
          position: 'bottom',
          requireAction: null,
          nextOnAction: false,
          highlight: '#game-board',
        },
        {
          id: 'upgrades',
          text: 'Spend coins on Weapon, Case & Outfit upgrades in the Shop! Each level boosts your stats.',
          target: '#shop-btn',
          position: 'top',
          requireAction: null,
          nextOnAction: false,
          highlight: '#shop-btn',
        },
        {
          id: 'challenges',
          text: 'Complete daily challenges for bonus coins and gems! New tasks every day.',
          target: '#btn-challenges',
          position: 'top',
          requireAction: null,
          nextOnAction: false,
          highlight: '#btn-challenges',
        },
        {
          id: 'rewards',
          text: 'Watch ads for extra coins, or collect daily login rewards. Premium items are real-money only!',
          target: '#btn-ad-reward',
          position: 'top',
          requireAction: null,
          nextOnAction: false,
          highlight: '#btn-ad-reward',
        },
        {
          id: 'complete',
          text: 'That\'s it! Complete lines, earn coins, upgrade your gear. Have fun! 🎉',
          target: null,
          position: 'center',
          requireAction: 'tap',
          nextOnAction: true,
          highlight: null,
        },
      ],
    });
    if (TutorialSystem.shouldShow()) {
      setTimeout(() => TutorialSystem.start(() => {
        showToast('🎉 Tutorial complete! Good luck!');
      }), 500);
    }
  }

  // ── END: New Framework Modules ────────────────

  // Button: Shop
  document.getElementById('shop-btn')?.addEventListener('click', () => {
    if (window.ShopUI) ShopUI.open();
  });

  // Button: Button bar shop
  document.getElementById('button-shop')?.addEventListener('click', () => {
    if (window.ShopUI) ShopUI.open();
  });

  // Button: Button bar achievements
  document.getElementById('button-ach')?.addEventListener('click', () => {
    showAchievementsList();
  });

  startGame();
  render();
}

// ─── Achievements List Modal ────────────────────────
function showAchievementsList() {
  if (!window.ProgressionSystem) return;
  const state = ProgressionSystem.getState();
  const achievements = ProgressionSystem.getAchievements();
  const unlocked = Object.keys(state.achievements).length;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="min-width:300px;">
      <h3 style="text-align:center;margin-bottom:8px;color:var(--accent-gold);">🏆 Achievements</h3>
      <div style="text-align:center;margin-bottom:12px;font-size:14px;color:var(--text-secondary);">${unlocked}/${achievements.length} unlocked</div>
      <div style="max-height:400px;overflow-y:auto;">
        ${achievements.map(a => {
          const done = !!state.achievements[a.id];
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:${done ? 'rgba(76,209,55,0.05)' : 'transparent'};border-radius:8px;margin-bottom:4px;${done ? 'opacity:0.8;' : ''}">
            <span style="font-size:20px;">${done ? a.icon : '🔒'}</span>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;">${a.name}</div>
              <div style="font-size:11px;color:var(--text-secondary);">${a.desc}</div>
            </div>
            ${done ? '✅' : `<span style="font-size:11px;color:var(--accent-gold);">🪙${a.reward.coins}${a.reward.gems ? ' 💎'+a.reward.gems : ''}</span>`}
          </div>`;
        }).join('')}
      </div>
      <button class="game-btn btn-restart" style="margin:10px auto 0;display:block;" onclick="this.closest('.modal-overlay').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ─── Boot ────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
