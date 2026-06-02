/* ===== Block Crush Daily — Game Engine ===== */
(function() {
  'use strict';

  // --- Constants ---
  const BOARD_SIZE = 8;          // 8x8 grid
  const CELL_SIZE = 37;          // px per cell
  const PIECE_SIZE_LIMIT = 3;    // max piece dimension
  const COLS = BOARD_SIZE;
  const ROWS = BOARD_SIZE;
  const MAX_ENERGY = 5;
  const COINS_PER_LINE = 10;
  const XP_PER_LINE = 5;
  const XP_PER_GAME = 20;
  const DAILY_SEED_KEY = 'bcd_daily_seed';
  const SAVE_KEY = 'bcd_save';
  const TOTAL_DAILY_PIECES = 60; // pieces in daily challenge

  // Power-up costs
  const COST_BOMB = 3;
  const COST_HAMMER = 2;
  const COST_SHUFFLE = 4;

  // --- DOM refs ---
  const boardCanvas = document.getElementById('board');
  const trayCanvas = document.getElementById('tray');
  const ctx = boardCanvas.getContext('2d');
  const tctx = trayCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const modeLabel = document.getElementById('mode-label');
  const energyFill = document.getElementById('energy-fill');
  const energyText = document.getElementById('energy-text');
  const btnDaily = document.getElementById('btn-daily');
  const btnPractice = document.getElementById('btn-practice');
  const btnRestart = document.getElementById('btn-restart');
  const btnBomb = document.getElementById('pu-bomb');
  const btnHammer = document.getElementById('pu-hammer');
  const btnShuffle = document.getElementById('pu-shuffle');
  const btnRewardDouble = document.getElementById('btn-reward-double');
  const btnRewardEnergy = document.getElementById('btn-reward-energy');

  // --- Game state ---
  let grid = [];
  let pieces = [];        // 3 current pieces
  let selectedPiece = -1; // index into pieces, or -1
  let score = 0;
  let energy = 0;
  let mode = 'daily';     // 'daily' or 'practice'
  let dailySeed = 0;
  let dailyPieceIndex = 0;
  let running = true;
  let pieceQueue = [];    // pre-generated piece shapes

  // High scores per mode
  let highScores = { daily: 0, practice: 0 };

  // Progression hooks
  let usedPowerupsThisGame = new Set();
  let clearedThisGame = 0;
  let coinsEarnedThisGame = 0;
  let bestSingleThisGame = 0;
  let dailyCompletedThisGame = false;
  let allUsedThisGame = false;

  // Ad integration (native or simulated)
  let adPendingCallback = null;
  const hasNativeAds = typeof window.AndroidAds !== 'undefined';

  window.onAdReward = function() {
    if (adPendingCallback) { adPendingCallback(); adPendingCallback = null; }
  };
  window.onRewardedReady = function() { updateRewardButtons(); };

  // --- Seeded random (mulberry32) ---
  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // --- Piece generation ---
  // Generates all possible 3x3 tetromino-like shapes
  // Each shape is a 2D array of 0/1
  function generateAllShapes() {
    const shapes = [];
    // Single block
    shapes.push([[1]]);
    // 2-block: horizontal, vertical
    shapes.push([[1,1]]);
    shapes.push([[1],[1]]);
    // 3-block L-shapes
    shapes.push([[1,0],[1,0],[1,1]]);
    shapes.push([[0,1],[0,1],[1,1]]);
    shapes.push([[1,1],[1,0],[1,0]]);
    shapes.push([[1,1],[0,1],[0,1]]);
    // 3-block line
    shapes.push([[1,1,1]]);
    shapes.push([[1],[1],[1]]);
    // 2x2 square
    shapes.push([[1,1],[1,1]]);
    // 3-block corner
    shapes.push([[1,1],[1,0]]);
    shapes.push([[1,1],[0,1]]);
    shapes.push([[1,0],[1,1]]);
    shapes.push([[0,1],[1,1]]);
    // 1x3 + 1 extra
    shapes.push([[1,1,1],[0,1,0]]);
    shapes.push([[0,1,0],[1,1,1]]);
    // 2x3 L
    shapes.push([[1,0],[1,0],[1,1]]);
    shapes.push([[0,1],[0,1],[1,1]]);
    // Small T
    shapes.push([[1,1,1],[0,1,0]]);
    shapes.push([[0,1,0],[1,1,1]]);
    // Mixed small
    shapes.push([[1,1],[0,1]]);
    shapes.push([[1,1],[1,0]]);
    // Extra shapes for variety
    shapes.push([[1],[1],[1],[1]]);
    shapes.push([[1,1,1,1]]);
    shapes.push([[1,1],[1,1],[1,1]]);
    shapes.push([[1,0,0],[1,1,1]]);
    shapes.push([[1,1,1],[0,0,1]]);
    shapes.push([[0,0,1],[1,1,1]]);
    shapes.push([[1,1,1],[1,0,0]]);
    shapes.push([[1,0],[1,1],[0,1]]);
    shapes.push([[0,1],[1,1],[1,0]]);
    shapes.push([[1,1,0],[0,1,1]]);
    shapes.push([[0,1,1],[1,1,0]]);
    return shapes;
  }

  const ALL_SHAPES = generateAllShapes();

  function randomPiece(rng) {
    const idx = Math.floor(rng() * ALL_SHAPES.length);
    const shape = ALL_SHAPES[idx];
    // Deep clone
    return shape.map(row => [...row]);
  }

  // --- Grid operations ---
  function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function cloneGrid(g) { return g.map(row => [...row]); }

  function isValidPlacement(g, piece, row, col) {
    for (let r = 0; r < piece.length; r++) {
      for (let c = 0; c < piece[r].length; c++) {
        if (!piece[r][c]) continue;
        const gr = row + r, gc = col + c;
        if (gr < 0 || gr >= ROWS || gc < 0 || gc >= COLS) return false;
        if (g[gr][gc] !== 0) return false;
      }
    }
    return true;
  }

  function placePiece(g, piece, row, col) {
    const ng = cloneGrid(g);
    for (let r = 0; r < piece.length; r++) {
      for (let c = 0; c < piece[r].length; c++) {
        if (piece[r][c]) ng[row + r][col + c] = 1;
      }
    }
    return ng;
  }

  function clearLines(g) {
    let cleared = 0;
    const ng = cloneGrid(g);
    // Check rows
    for (let r = 0; r < ROWS; r++) {
      if (ng[r].every(c => c !== 0)) {
        ng[r].fill(0);
        cleared++;
      }
    }
    // Check columns
    for (let c = 0; c < COLS; c++) {
      let full = true;
      for (let r = 0; r < ROWS; r++) { if (ng[r][c] === 0) { full = false; break; } }
      if (full) {
        for (let r = 0; r < ROWS; r++) ng[r][c] = 0;
        cleared++;
      }
    }
    // Clear 3x3 blocks
    for (let br = 0; br < ROWS - 2; br++) {
      for (let bc = 0; bc < COLS - 2; bc++) {
        let full = true;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (ng[br+r][bc+c] === 0) { full = false; break; }
          }
          if (!full) break;
        }
        if (full) {
          for (let r = 0; r < 3; r++)
            for (let c = 0; c < 3; c++)
              ng[br+r][bc+c] = 0;
          cleared++;
        }
      }
    }
    return { grid: ng, cleared };
  }

  function canPlaceAny(g, piece) {
    for (let r = 0; r <= ROWS - piece.length; r++) {
      for (let c = 0; c <= COLS - piece[0].length; c++) {
        if (isValidPlacement(g, piece, r, c)) return true;
      }
    }
    return false;
  }

  function canPlaceAnyPiece(g, piecesList) {
    for (const p of piecesList) {
      if (canPlaceAny(g, p)) return true;
    }
    return false;
  }

  // --- Scoring ---
  function calculateScore(cleared, pieceSize) {
    let base = cleared * 100;
    if (cleared >= 3) base += 200;
    if (cleared >= 5) base += 500;
    if (cleared >= 8) base += 1000;
    return base;
  }

  // --- Energy ---
  function gainEnergy(amount) {
    energy = Math.min(MAX_ENERGY, energy + amount);
    updateEnergyUI();
    updatePowerUps();
  }

  function spendEnergy(amount) {
    if (energy < amount) return false;
    energy -= amount;
    updateEnergyUI();
    updatePowerUps();
    return true;
  }

  function checkEnergyMilestones(cleared) {
    // Each row/block cleared gives energy
    if (cleared > 0) gainEnergy(1);
    if (cleared >= 3) gainEnergy(1);
    if (cleared >= 5) gainEnergy(1);
    if (cleared >= 8) gainEnergy(1);
    
    // Progression: coins + XP for clearing
    const P = window.GameProgression;
    if (P) {
      const coinReward = cleared * COINS_PER_LINE;
      if (coinReward > 0) {
        P.addCoins(coinReward, true);
        coinsEarnedThisGame += coinReward;
      }
      P.addXP(cleared * XP_PER_LINE);
      clearedThisGame += cleared;
      if (cleared > bestSingleThisGame) bestSingleThisGame = cleared;
    }
  }

  // --- Drawing ---
  const COLORS = [
    '#0f3460',                    // empty
    '#e94560', '#f5c518', '#533483', '#00b4d8',
    '#06d6a0', '#ff6b6b', '#ff9f43', '#2ed573',
  ];

  function drawBoard() {
    ctx.clearRect(0, 0, 300, 300);
    const cellW = 300 / COLS;
    const cellH = 300 / ROWS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cellW, y = r * cellH;
        const val = grid[r][c];
        if (val) {
          const ci = 1 + ((r * 7 + c * 13) % 7);
          ctx.fillStyle = COLORS[ci];
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x + 2, y + 2, cellW - 6, 3);
        } else {
          ctx.fillStyle = '#0f3460';
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }
  }

  function drawTray() {
    tctx.clearRect(0, 0, 300, 100);
    // Show pending piece count
    tctx.fillStyle = '#888';
    tctx.font = '12px sans-serif';
    tctx.textAlign = 'left';
    if (mode === 'daily') {
      const remaining = Math.max(0, TOTAL_DAILY_PIECES - dailyPieceIndex);
      tctx.fillText(`Pieces left: ${remaining}`, 4, 14);
    } else {
      tctx.fillText('Drag pieces to board', 4, 14);
    }

    const cellW = (300 / 3) * 0.8;
    const startX = 10;
    const spacing = (300 - 30) / 3;

    for (let i = 0; i < pieces.length; i++) {
      const px = startX + i * spacing;
      const py = 24;
      const piece = pieces[i];
      if (!piece) continue;

      const pCell = Math.min(cellW, 28);
      const offX = px + (spacing - piece[0].length * pCell) / 2;
      const offY = py + (70 - piece.length * pCell) / 2;

      // Highlight selected piece
      if (i === selectedPiece) {
        tctx.fillStyle = 'rgba(233,69,96,0.2)';
        tctx.fillRect(px - 2, py - 2, spacing, 72);
        tctx.strokeStyle = '#e94560';
        tctx.lineWidth = 2;
        tctx.strokeRect(px - 2, py - 2, spacing, 72);
      }

      for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece[r].length; c++) {
          if (piece[r][c]) {
            const ci = 1 + ((i * 5 + r * 3 + c * 7) % 7);
            tctx.fillStyle = COLORS[ci];
            tctx.fillRect(offX + c * pCell + 1, offY + r * pCell + 1, pCell - 2, pCell - 2);
            tctx.fillStyle = 'rgba(255,255,255,0.15)';
            tctx.fillRect(offX + c * pCell + 2, offY + r * pCell + 2, pCell - 6, 2);
          }
        }
      }
    }
  }

  function updateUI() {
    scoreEl.textContent = score;
    highscoreEl.textContent = highScores[mode] || 0;
    drawBoard();
    drawTray();
  }

  function updateEnergyUI() {
    const pct = (energy / MAX_ENERGY) * 100;
    energyFill.style.width = pct + '%';
    energyText.textContent = `⚡ ${energy}/${MAX_ENERGY}`;
  }

  function updatePowerUps() {
    const P = window.GameProgression;
    const hasBomb = energy >= COST_BOMB || (P && P.powerupItems?.bomb > 0);
    const hasHammer = energy >= COST_HAMMER || (P && P.powerupItems?.hammer > 0);
    const hasShuffle = energy >= COST_SHUFFLE || (P && P.powerupItems?.shuffle > 0);
    btnBomb.disabled = !hasBomb;
    btnHammer.disabled = !hasHammer;
    btnShuffle.disabled = !hasShuffle;
  }

  // --- Placement ---
  function tryPlacePiece(pieceIdx, row, col) {
    if (pieceIdx < 0 || pieceIdx >= pieces.length) return false;
    const piece = pieces[pieceIdx];
    if (!piece) return false;
    if (!isValidPlacement(grid, piece, row, col)) return false;

    // Place
    grid = placePiece(grid, piece, row, col);

    // Clear lines
    const result = clearLines(grid);
    grid = result.grid;

    // Score
    const pieceSize = piece.flat().filter(Boolean).length;
    const points = calculateScore(result.cleared, pieceSize);
    score += points;

    // Energy
    checkEnergyMilestones(result.cleared);

    // Remove piece
    pieces[pieceIdx] = null;

    // Check if we need new pieces
    const hasNullPiece = pieces.some(p => p === null);
    if (hasNullPiece) {
      fillPieces();
    }

    // Check game over
    checkGameOver();
    updateUI();
    updateRewardButtons();
    checkDailyComplete();
    return true;
  }

  function fillPieces() {
    let rng = null;
    if (mode === 'daily') {
      rng = mulberry32(dailySeed + dailyPieceIndex);
    }

    // Check if daily is complete
    if (mode === 'daily' && dailyPieceIndex >= TOTAL_DAILY_PIECES) {
      // No more pieces — just mark game as won
      return;
    }

    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i] === null) {
        if (mode === 'daily') {
          if (dailyPieceIndex < TOTAL_DAILY_PIECES) {
            pieces[i] = randomPiece(rng);
            dailyPieceIndex++;
          } else {
            pieces[i] = null;
          }
        } else {
          // Practice: always generate
          pieces[i] = randomPiece(Math.random);
        }
      }
    }
  }

  function checkDailyComplete() {
    if (mode === 'daily' && dailyPieceIndex >= TOTAL_DAILY_PIECES) {
      const anyAlive = pieces.some(p => p !== null);
      if (!anyAlive) {
        // All pieces used! Win state
        showGameOver(true);
        return;
      }
      // Check remaining pieces
      for (const p of pieces) {
        if (p && canPlaceAny(grid, p)) return;
      }
      showGameOver(false);
    }
  }

  function checkGameOver() {
    // Remove null pieces
    const alivePieces = pieces.filter(p => p !== null);
    if (alivePieces.length === 0) return; // waiting for fill

    for (const p of alivePieces) {
      if (canPlaceAny(grid, p)) return;
    }

    // Game over
    if (mode === 'daily' && dailyPieceIndex >= TOTAL_DAILY_PIECES) {
      showGameOver(true);
    } else {
      showGameOver(false);
    }
  }

  // --- Game over ---
  function showGameOver(won) {
    if (!running) return;
    running = false;

    // Record progression
    const P = window.GameProgression;
    if (P) {
      dailyCompletedThisGame = won && mode === 'daily';
      allUsedThisGame = won && mode === 'daily' && dailyPieceIndex >= TOTAL_DAILY_PIECES && pieces.every(p => p === null);
      P.recordPlay(score, clearedThisGame, bestSingleThisGame, usedPowerupsThisGame.size >= 3, dailyCompletedThisGame, allUsedThisGame);
    }

    // Update high score
    if (score > highScores[mode]) {
      highScores[mode] = score;
      saveGame();
    }

    // Remove existing overlay
    const old = document.getElementById('game-over');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'game-over';
    overlay.classList.add('show');
    overlay.innerHTML = `
      <div class="go-modal">
        <h2>${won ? '🎉 Daily Complete!' : '💥 Game Over'}</h2>
        <div class="go-score">${score}</div>
        <div class="go-new">${score >= highScores[mode] && score > 0 ? '🏆 New Best!' : ''}</div>
        ${coinsEarnedThisGame > 0 ? `<div class="go-coins">🪙 +${coinsEarnedThisGame} coins earned</div>` : ''}
        <button class="go-reward" onclick="document.AD_DOUBLE()">
          📺 Watch ad to double reward
        </button>
        <button class="go-continue" onclick="document.AD_CONTINUE()">
          Continue
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Expose double function
    document.AD_DOUBLE = function() {
      showAd(function() {
        score *= 2;
        if (P) {
          P.addCoins(coinsEarnedThisGame, false); // double coins too
        }
        document.querySelector('.go-score').textContent = score;
        const rewardBtn = document.querySelector('.go-reward');
        if (rewardBtn) rewardBtn.remove();
        document.querySelector('.go-new').textContent = '🔥 Score doubled!';
      });
    };
    document.AD_CONTINUE = function() {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    };
  }

  // --- Ad integration ---
  function showAd(callback) {
    adPendingCallback = callback;

    if (hasNativeAds) {
      // Use native Android rewarded ad
      window.AndroidAds.showRewarded();
      return;
    }

    // Fallback: simulated ad with 3-second countdown
    const adOverlay = document.createElement('div');
    adOverlay.id = 'ad-overlay';
    adOverlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#000;z-index:200;display:flex;align-items:center;justify-content:center;flex-direction:column;">
        <div style="font-size:48px;margin-bottom:20px;">📺</div>
        <div style="font-size:24px;color:#fff;font-weight:600;">Watching ad...</div>
        <div style="font-size:14px;color:#888;margin-top:8px;" id="ad-timer">3</div>
      </div>
    `;
    document.body.appendChild(adOverlay);

    let count = 3;
    const timerEl = document.getElementById('ad-timer');
    const interval = setInterval(() => {
      count--;
      if (timerEl) timerEl.textContent = count;
      if (count <= 0) {
        clearInterval(interval);
        adOverlay.remove();
        if (adPendingCallback) { adPendingCallback(); adPendingCallback = null; }
      }
    }, 1000);
  }

  // --- Exposed ad triggers ---
  window.showRewardedAd = function(callback) {
    showAd(callback);
  };

  function updateRewardButtons() {
    btnRewardDouble.disabled = score < 50 || !running;
    btnRewardEnergy.disabled = energy >= MAX_ENERGY || !running;
  }

  // --- Save/Load ---
  function saveGame() {
    const data = {
      v: 1,
      dailyHigh: highScores.daily,
      practiceHigh: highScores.practice,
      dailySeed: dailySeed,
      dailyCompleted: dailySeed === getDailySeedStr()
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.v === 1) {
        highScores.daily = data.dailyHigh || 0;
        highScores.practice = data.practiceHigh || 0;
        // Check if daily already completed
        if (data.dailyCompleted && data.dailySeed === getDailySeedStr()) {
          highscoreEl.textContent = highScores.daily;
        }
      }
    } catch(e) {}
  }

  function getDailySeedStr() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
  }

  // --- Daily seed ---
  function computeDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }

  // --- New game ---
  function newGame(m) {
    mode = m;
    grid = createGrid();
    score = 0;
    energy = 0;
    running = true;
    selectedPiece = -1;
    pieces = [];
    usedPowerupsThisGame = new Set();
    clearedThisGame = 0;
    coinsEarnedThisGame = 0;
    bestSingleThisGame = 0;
    dailyCompletedThisGame = false;
    allUsedThisGame = false;
    modeLabel.textContent = mode === 'daily' ? 'DAILY' : 'PRACTICE';
    btnDaily.classList.toggle('active', mode === 'daily');
    btnPractice.classList.toggle('active', mode === 'practice');

    if (mode === 'daily') {
      dailySeed = computeDailySeed();
      dailyPieceIndex = 0;
    }

    // Generate initial 3 pieces
    for (let i = 0; i < 3; i++) {
      if (mode === 'daily') {
        const rng = mulberry32(dailySeed + dailyPieceIndex);
        pieces.push(randomPiece(rng));
        dailyPieceIndex++;
      } else {
        pieces.push(randomPiece(Math.random));
      }
    }

    updateUI();
    updateEnergyUI();
    updatePowerUps();
    updateRewardButtons();
    saveGame();
  }

  // --- Power-up actions ---
  function usePowerupTry(type) {
    // Try inventory item first
    const P = window.GameProgression;
    if (P && P.usePowerupItem(type)) {
      usedPowerupsThisGame.add(type);
      if (P) P.recordPowerupUse();
      return true;
    }
    // Fall back to energy
    const cost = type === 'bomb' ? COST_BOMB : type === 'hammer' ? COST_HAMMER : COST_SHUFFLE;
    if (spendEnergy(cost)) {
      usedPowerupsThisGame.add(type);
      if (P) P.recordPowerupUse();
      return true;
    }
    return false;
  }

  function useBomb() {
    if (!usePowerupTry('bomb')) return;
    const cr = Math.floor(ROWS / 2) - 1;
    const cc = Math.floor(COLS / 2) - 1;
    for (let r = Math.max(0, cr); r < Math.min(ROWS, cr + 2); r++) {
      for (let c = Math.max(0, cc); c < Math.min(COLS, cc + 2); c++) {
        grid[r][c] = 0;
      }
    }
    updateUI();
  }

  function useHammer() {
    if (!usePowerupTry('hammer')) return;
    for (let r = ROWS - 1; r >= 0; r--) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== 0) {
          grid[r][c] = 0;
          updateUI();
          checkGameOver();
          return;
        }
      }
    }
  }

  function useShuffle() {
    if (!usePowerupTry('shuffle')) return;
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i]) {
        if (mode === 'daily' && dailyPieceIndex < TOTAL_DAILY_PIECES - 1) {
          dailyPieceIndex--;
          const rng = mulberry32(dailySeed + dailyPieceIndex);
          pieces[i] = randomPiece(rng);
          dailyPieceIndex++;
        } else {
          pieces[i] = randomPiece(Math.random);
        }
      }
    }
    updateUI();
  }

  // --- Touch/drag handling ---
  let dragPiece = -1;
  let dragStartX = 0, dragStartY = 0;
  let dragOffX = 0, dragOffY = 0;
  let dragGhost = null;

  function getTouchPos(e) {
    const touch = e.touches ? e.touches[0] : e;
    const rect = trayCanvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (300 / rect.width),
      y: (touch.clientY - rect.top) * (100 / rect.height),
      clientX: touch.clientX,
      clientY: touch.clientY
    };
  }

  function getBoardPos(e) {
    const touch = e.touches ? e.touches[0] : e;
    const rect = boardCanvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (300 / rect.width),
      y: (touch.clientY - rect.top) * (300 / rect.height),
      clientX: touch.clientX,
      clientY: touch.clientY
    };
  }

  function handleDragStart(e) {
    e.preventDefault();
    if (!running) return;
    const pos = getTouchPos(e);
    // Check which piece was tapped
    const cellW = (300 / 3) * 0.8;
    const startX = 10;
    const spacing = (300 - 30) / 3;

    for (let i = 0; i < pieces.length; i++) {
      if (!pieces[i]) continue;
      const px = startX + i * spacing;
      if (pos.x >= px && pos.x <= px + spacing && pos.y >= 24 && pos.y <= 94) {
        dragPiece = i;
        selectedPiece = i;
        dragStartX = pos.clientX;
        dragStartY = pos.clientY;
        dragOffX = pos.x - px;
        dragOffY = pos.y - 24;
        drawTray();
        break;
      }
    }
  }

  function handleDragMove(e) {
    e.preventDefault();
    if (dragPiece < 0) return;
    const pos = { clientX: e.touches ? e.touches[0].clientX : e.clientX,
                  clientY: e.touches ? e.touches[0].clientY : e.clientY };
    // Show ghost on board
    const bPos = getBoardPos(e);
    const cellW = 300 / COLS;
    const cellH = 300 / ROWS;
    const p = pieces[dragPiece];
    if (p) {
      const col = Math.floor(bPos.x / cellW);
      const row = Math.floor(bPos.y / cellH);
      // Draw board with ghost
      drawBoard();
      // Ghost placement
      const ghostCol = Math.max(0, Math.min(COLS - p[0].length, col - Math.floor(p[0].length / 2)));
      const ghostRow = Math.max(0, Math.min(ROWS - p.length, row - Math.floor(p.length / 2)));
      if (isValidPlacement(grid, p, ghostRow, ghostCol)) {
        for (let r = 0; r < p.length; r++) {
          for (let c = 0; c < p[r].length; c++) {
            if (p[r][c]) {
              const ci = 1 + ((dragPiece * 5 + r * 3 + c * 7) % 7);
              ctx.fillStyle = COLORS[ci] + '60';
              ctx.fillRect((ghostCol + c) * cellW + 1, (ghostRow + r) * cellH + 1, cellW - 2, cellH - 2);
            }
          }
        }
      }
    }
  }

  function handleDragEnd(e) {
    e.preventDefault();
    if (dragPiece < 0) return;
    const pos = e.changedTouches ? e.changedTouches[0] : e;

    // Check if dropped on board
    const boardRect = boardCanvas.getBoundingClientRect();
    const onBoard = pos.clientX >= boardRect.left && pos.clientX <= boardRect.right &&
                    pos.clientY >= boardRect.top && pos.clientY <= boardRect.bottom;

    if (onBoard) {
      const bPos = getBoardPos(e);
      const cellW = 300 / COLS;
      const cellH = 300 / ROWS;
      const p = pieces[dragPiece];
      if (p) {
        const col = Math.floor(bPos.x / cellW);
        const row = Math.floor(bPos.y / cellH);
        const ghostCol = Math.max(0, Math.min(COLS - p[0].length, col - Math.floor(p[0].length / 2)));
        const ghostRow = Math.max(0, Math.min(ROWS - p.length, row - Math.floor(p.length / 2)));
        tryPlacePiece(dragPiece, ghostRow, ghostCol);
      }
    }

    dragPiece = -1;
    selectedPiece = -1;
    updateUI();
  }

  // --- Event listeners ---
  trayCanvas.addEventListener('touchstart', handleDragStart, { passive: false });
  trayCanvas.addEventListener('touchmove', handleDragMove, { passive: false });
  trayCanvas.addEventListener('touchend', handleDragEnd, { passive: false });

  trayCanvas.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);

  // --- Button handlers ---
  btnDaily.addEventListener('click', () => newGame('daily'));
  btnPractice.addEventListener('click', () => newGame('practice'));
  btnRestart.addEventListener('click', () => newGame(mode));

  btnBomb.addEventListener('click', useBomb);
  btnHammer.addEventListener('click', useHammer);
  btnShuffle.addEventListener('click', useShuffle);

  btnRewardDouble.addEventListener('click', function() {
    const s = score;
    showAd(function() {
      score += Math.floor(s * 0.5);
      updateUI();
      updateRewardButtons();
    });
  });

  // Double current game reward (game-over version)
  window.doubleReward = function() {
    showAd(function() {
      score *= 2;
      saveGame();
      updateUI();
    });
  };

  // --- Init progression ---
  if (window.GameProgression) {
    window.GameProgression.init();
    window.reapplyTheme();
    setTimeout(() => window.checkDailyBonus(), 800);
  
  // --- Init ---
  loadGame();
  newGame('daily');

  // Sync UI with shop counts periodically
  setInterval(() => { if (window.updatePowerupCounts) window.updatePowerupCounts(); }, 2000);

})();
