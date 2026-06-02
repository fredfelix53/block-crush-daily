/* ===== Block Crush Daily — Shop & Achievement UI ===== */
(function() {
  'use strict';

  let shopOpen = false;
  let achOpen = false;

  // ─── Open Shop Panel ──────────────────────────────
  window.openShop = function(category) {
    if (shopOpen) return closeShop();
    shopOpen = true;

    const P = window.GameProgression;
    if (!P) return;

    removeExistingOverlay('shop-overlay');

    const overlay = document.createElement('div');
    overlay.id = 'shop-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal shop-modal">
        <div class="modal-header">
          <h2>🛒 Shop</h2>
          <button class="modal-close" onclick="closeShop()">✕</button>
        </div>
        <div class="modal-coins">
          <span>🪙 ${P.coins}</span>
        </div>
        <div class="shop-tabs">
          <button class="shop-tab active" data-tab="themes">🎨 Themes</button>
          <button class="shop-tab" data-tab="pieceStyles">🧊 Styles</button>
          <button class="shop-tab" data-tab="powerupPacks">⚡ Power-ups</button>
          <button class="shop-tab" data-tab="boosters">🚀 Boosters</button>
        </div>
        <div class="shop-content" id="shop-content"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Tab switching
    overlay.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderShopCategory(tab.dataset.tab);
      });
    });

    // Show initial category
    renderShopCategory(category || 'themes');
  };

  function renderShopCategory(cat) {
    const P = window.GameProgression;
    const content = document.getElementById('shop-content');
    if (!content) return;

    const catalog = P.getCatalog();
    const items = catalog[cat];
    if (!items) { content.innerHTML = '<div class="shop-empty">Nothing here</div>'; return; }

    function esc(s) { return String(s).replace(/[&<>"'\/]/g, ''); }

    let html = '';
    items.forEach(item => {
      const owned = cat === 'themes' ? P.isUnlocked('themes', item.id) :
                    cat === 'pieceStyles' ? P.isUnlocked('pieceStyles', item.id) : false;
      const active = cat === 'themes' && P.activeTheme === item.id;
      const isPowerup = cat === 'powerupPacks';
      const canAfford = P.coins >= item.price;

      let extraInfo = '';
      if (cat === 'themes') {
        const theme = item;
        extraInfo = '<div class="theme-preview" style="background:' + esc(theme.colors.bg) + ';border:2px solid ' + esc(theme.colors.accent) + ';width:40px;height:24px;border-radius:4px;display:inline-block;vertical-align:middle;"></div>';
      }
      if (cat === 'pieceStyles') {
        const style = item;
        extraInfo = style.borderRadius > 0 ? '🔲 Rounded +' + style.borderRadius + 'px' : '⬛ Sharp edges';
        if (style.glow) extraInfo += ' ✨ Glow';
      }
      if (isPowerup) {
        const pack = item;
        const parts = [];
        if (pack.items.bomb) parts.push('💣x' + pack.items.bomb);
        if (pack.items.hammer) parts.push('🔨x' + pack.items.hammer);
        if (pack.items.shuffle) parts.push('🔀x' + pack.items.shuffle);
        extraInfo = parts.join(' ');
      }

      html += '<div class="shop-item' + (owned ? ' owned' : '') + (active ? ' active' : '') + '">';
      html += '<div class="shop-item-info">';
      html += '<span class="shop-item-name">' + (item.icon || '') + ' ' + esc(item.name) + '</span>';
      html += '<span class="shop-item-desc">' + esc(item.desc) + '</span>';
      if (extraInfo) html += '<span class="shop-item-extra">' + extraInfo + '</span>';
      html += '</div>';
      html += '<div class="shop-item-action">';
      
      if (owned && active) {
        html += '<span class="shop-active-badge">✓ Active</span>';
      } else if (owned && cat !== 'powerupPacks' && cat !== 'boosters' && cat !== 'special') {
        html += '<button class="shop-use-btn" onclick="window.GameProgression.applyTheme(\'' + esc(item.id) + '\'); window.closeShop(); window.openShop(\'themes\')">Select</button>';
      } else if (owned) {
        html += '<span class="shop-owned-badge">✓ Owned</span>';
      } else {
        html += '<button class="shop-buy-btn' + (canAfford ? '' : ' disabled') + '" ';
        if (canAfford) {
          html += 'onclick="window.GameProgression.purchaseItem(\'' + esc(cat) + '\',\'' + esc(item.id) + '\'); window.closeShop(); window.openShop(\'' + esc(cat) + '\')"';
        }
        html += '>🪙 ' + item.price + (canAfford ? '' : ' (need ' + (item.price - P.coins) + ')') + '</button>';
      }
      
      html += '</div></div>';
    });

    content.innerHTML = html;
  }

  // ─── Achievement Panel ────────────────────────────
  window.openAchievements = function() {
    if (achOpen) return closeAchievements();
    achOpen = true;

    const P = window.GameProgression;
    if (!P) return;

    removeExistingOverlay('ach-overlay');

    const progress = P.getAchievementProgress();
    const overlay = document.createElement('div');
    overlay.id = 'ach-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ach-modal">
        <div class="modal-header">
          <h2>🏆 Achievements</h2>
          <button class="modal-close" onclick="closeAchievements()">✕</button>
        </div>
        <div class="ach-progress-bar">
          <div class="ach-progress-fill" style="width:${progress.pct * 100}%"></div>
          <span class="ach-progress-text">${progress.done}/${progress.total}</span>
        </div>
        <div class="ach-list" id="ach-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const list = document.getElementById('ach-list');
    let html = '';
    window.ACHIEVEMENTS.forEach(a => {
      const state = P.achievements[a.id];
      const isDone = state && state.done;
      const claimed = state && state.claimed;

      html += `
        <div class="ach-item ${isDone ? 'done' : ''} ${claimed ? 'claimed' : ''}">
          <span class="ach-icon">${a.icon}</span>
          <div class="ach-info">
            <span class="ach-name">${a.name}</span>
            <span class="ach-desc">${a.desc}</span>
          </div>
          <div class="ach-reward">
            ${claimed ? '<span class="ach-claimed">✓</span>' :
              isDone ? `<button class="ach-claim-btn" onclick="if(window.GameProgression.claimAchievement('${a.id}')){this.parentElement.innerHTML='<span class=\"ach-claimed\">✓</span>';}">🪙 ${a.reward}</button>` :
              `<span class="ach-locked">🔒</span>`}
          </div>
        </div>
      `;
    });
    list.innerHTML = html;
  };

  // ─── Daily Bonus Popup ────────────────────────────
  window.showDailyBonus = function(bonus) {
    removeExistingOverlay('bonus-overlay');

    const overlay = document.createElement('div');
    overlay.id = 'bonus-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal bonus-modal">
        <h2>🎁 Daily Bonus</h2>
        <div class="bonus-info">
          <div class="bonus-streak">🔥 ${bonus.streak} day streak!</div>
          <div class="bonus-items">
            <div class="bonus-item">🪙 +${bonus.coins}</div>
            <div class="bonus-item">⭐ +${bonus.xp} XP</div>
            ${bonus.bonus ? '<div class="bonus-item">💎 +1 of each power-up!</div>' : ''}
          </div>
        </div>
        <button class="bonus-claim" onclick="this.closest('.modal-overlay').remove()">Claimed! 🎉</button>
      </div>
    `;
    document.body.appendChild(overlay);
  };

  // ─── Level Up Popup ───────────────────────────────
  window.showLevelUp = function(level) {
    removeExistingOverlay('lvl-overlay');

    const overlay = document.createElement('div');
    overlay.id = 'lvl-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal lvl-modal">
        <h2>🎊 Level Up!</h2>
        <div class="lvl-number">${level}</div>
        <p style="color:#aaa;margin:8px 0;">You reached level ${level}!</p>
        ${level % 5 === 0 ? '<p style="color:#f5c518;">🏅 New items unlocked in the shop!</p>' : ''}
        <button class="bonus-claim" onclick="this.closest('.modal-overlay').remove()">Awesome!</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Level milestone unlocks
    if (level === 3) {
      if (!window.GameProgression.inventory.themes.includes('ocean')) {
        window.GameProgression.inventory.themes.push('ocean');
        window.GameProgression.save();
      }
    }
    if (level === 6) {
      if (!window.GameProgression.inventory.themes.includes('sunset')) {
        window.GameProgression.inventory.themes.push('sunset');
        window.GameProgression.save();
      }
    }
  };

  // ─── Achievement Popup (multiple at once) ────────
  window.showAchievements = function(achievements) {
    achievements.forEach((a, i) => {
      setTimeout(() => {
        removeExistingOverlay('ach-popup');
        const overlay = document.createElement('div');
        overlay.id = 'ach-popup';
        overlay.className = 'ach-popup';
        overlay.innerHTML = `
          <div class="ach-popup-inner">
            <span class="ach-popup-icon">${a.icon}</span>
            <div>
              <strong style="color:#f5c518;">Achievement Unlocked!</strong>
              <div style="font-size:14px;">${a.name}</div>
              <div style="font-size:12px;color:#aaa;">Claim 🪙${a.reward} in achievements panel</div>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 4000);
      }, i * 1500);
    });
  };

  // ─── Coin Effect ──────────────────────────────────
  window.showCoinEffect = function(amount) {
    const el = document.getElementById('coin-effect') || (() => {
      const e = document.createElement('div');
      e.id = 'coin-effect';
      e.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;font-weight:700;color:#f5c518;z-index:150;pointer-events:none;text-shadow:0 2px 8px rgba(0,0,0,0.5);transition:all 0.8s ease-out;opacity:1;';
      document.body.appendChild(e);
      return e;
    })();
    
    el.textContent = `+${amount} 🪙`;
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%,-50%) scale(1)';
    
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%,-80%) scale(1.3)';
      el.style.opacity = '0';
    });
    
    setTimeout(() => { el.style.opacity = '0'; }, 800);
  };

  // ─── Update Coin UI on main screen ────────────────
  window.updateCoinUI = function() {
    const el = document.getElementById('coin-display');
    if (el && window.GameProgression) el.textContent = `🪙 ${window.GameProgression.coins}`;
  };

  // ─── Update Powerup item counts ───────────────────
  window.updatePowerupCounts = function() {
    const P = window.GameProgression;
    if (!P) return;
    ['bomb', 'hammer', 'shuffle'].forEach(type => {
      const el = document.getElementById(`pu-count-${type}`);
      if (el) el.textContent = P.powerupItems[type] || 0;
    });
  };

  // ─── Apply Theme ──────────────────────────────────
  window.applyTheme = function(themeId) {
    const P = window.GameProgression;
    const theme = (window.CATALOG?.themes || []).find(t => t.id === themeId);
    if (!theme) return;

    document.documentElement.style.setProperty('--board-bg', theme.colors.bg);
    document.documentElement.style.setProperty('--board-accent', theme.colors.accent);

    const board = document.getElementById('board');
    const tray = document.getElementById('tray');
    const adBanner = document.getElementById('ad-banner');
    if (board) board.style.background = theme.colors.bg;
    if (tray) tray.style.background = theme.colors.accent;
    if (adBanner) adBanner.style.background = theme.colors.accent;
    document.querySelectorAll('.pu-btn').forEach(el => el.style.background = theme.colors.accent);
    document.querySelectorAll('.action-btn:not(.active):not(.danger)').forEach(el => el.style.background = theme.colors.bg);
  };

  // ─── Apply Piece Style ────────────────────────────
  window.applyPieceStyle = function(styleId) {
    // Piece style changes are handled in the board drawing logic
    const style = (window.CATALOG?.pieceStyles || []).find(s => s.id === styleId);
    if (style) {
      window._activePieceStyle = style;
    }
  };

  // ─── Shop button in header ────────────────────────
  window.toggleShop = function() {
    if (shopOpen) closeShop();
    else openShop('themes');
  };

  window.toggleAchievements = function() {
    if (achOpen) closeAchievements();
    else openAchievements();
  };

  // ─── Helpers ──────────────────────────────────────
  function closeShop() {
    const el = document.getElementById('shop-overlay');
    if (el) el.remove();
    shopOpen = false;
  }
  window.closeShop = closeShop;

  function closeAchievements() {
    const el = document.getElementById('ach-overlay');
    if (el) el.remove();
    achOpen = false;
  }
  window.closeAchievements = closeAchievements;

  function removeExistingOverlay(id) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
  }

  // ─── Daily Bonus Auto-Check ───────────────────────
  window.checkDailyBonus = function() {
    const P = window.GameProgression;
    if (!P) return;
    const info = P.getDailyBonusInfo();
    if (!info.claimed) {
      const bonus = P.claimDailyBonus();
      if (bonus) {
        setTimeout(() => window.showDailyBonus(bonus), 500);
      }
    }
  };

  // ─── Reapply theme on page load ──────────────────
  window.reapplyTheme = function() {
    const P = window.GameProgression;
    if (P && P.activeTheme && P.activeTheme !== 'default') {
      window.applyTheme(P.activeTheme);
    }
  };

})();
