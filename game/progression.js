/* ===== Block Crush Daily — Progression System (Coins, XP, Levels, Achievements) ===== */
(function() {
  'use strict';

  const SAVE_KEY = 'bcd_progress';
  const DAILY_KEY = 'bcd_daily_bonus';

  // ─── Shop Catalog ────────────────────────────────────
  const CATALOG = {

    // Board themes — change colors of empty cells and background
    themes: [
      { id: 'default',   name: 'Classic Dark',   price: 0,    desc: 'The original dark theme',          colors: { bg: '#0f3460', accent: '#16213e' } },
      { id: 'ocean',     name: 'Ocean Blue',     price: 500,  desc: 'Calming ocean blues',              colors: { bg: '#023047', accent: '#0a4a6e' } },
      { id: 'sunset',    name: 'Sunset Glow',    price: 800,  desc: 'Warm sunset orange & pink',        colors: { bg: '#2d1b3d', accent: '#4a1a3a' } },
      { id: 'forest',    name: 'Forest Green',   price: 1000, desc: 'Lush forest greens',              colors: { bg: '#1a3a2a', accent: '#2a4a3a' } },
      { id: 'neon',      name: 'Neon Nights',    price: 1500, desc: 'Bright neon on dark purple',       colors: { bg: '#1a0030', accent: '#2a0050' } },
      { id: 'royal',     name: 'Royal Gold',     price: 2000, desc: 'Gold & royal purple',             colors: { bg: '#1a0030', accent: '#3a1050' } },
      { id: 'midnight',  name: 'Midnight Sky',   price: 3000, desc: 'Deep navy with starry accents',    colors: { bg: '#000a1a', accent: '#001a30' } },
      { id: 'cherry',    name: 'Cherry Blossom', price: 5000, desc: 'Soft pink cherry blossoms',        colors: { bg: '#2a0a1a', accent: '#3a1525' } },
    ],

    // Piece styles — visual variation of placed blocks
    pieceStyles: [
      { id: 'classic',    name: 'Classic Blocks', price: 0,    desc: 'Original block style',        borderRadius: 0, glow: false },
      { id: 'rounded',    name: 'Rounded Gems',   price: 600,  desc: 'Smooth rounded blocks',       borderRadius: 6, glow: false },
      { id: 'glow',       name: 'Glow Effect',    price: 1200, desc: 'Blocks with subtle glow',    borderRadius: 3, glow: true },
      { id: 'glass',      name: 'Glass Panels',   price: 2000, desc: 'Semi-transparent glass look', borderRadius: 4, glow: true },
      { id: 'neon_edge',  name: 'Neon Edge',      price: 3500, desc: 'Neon-outlined blocks',        borderRadius: 2, glow: true },
    ],

    // Power-up packs (one-time purchase)
    powerupPacks: [
      { id: 'starter',   name: 'Starter Pack',   price: 200,  items: { bomb: 3, hammer: 3, shuffle: 3 },   desc: '3 of each power-up' },
      { id: 'bomber',    name: 'Bomb Bundle',    price: 300,  items: { bomb: 8 },                         desc: '8 bombs' },
      { id: 'hammer',    name: 'Hammer Pack',    price: 200,  items: { hammer: 8 },                       desc: '8 hammers' },
      { id: 'shuffler',  name: 'Shuffle Pack',   price: 400,  items: { shuffle: 8 },                      desc: '8 shuffles' },
      { id: 'mega',      name: 'Mega Bundle',    price: 1000, items: { bomb: 10, hammer: 10, shuffle: 10 }, desc: '10 of each power-up' },
    ],

    // Boosters — temporary in-game buffs
    boosters: [
      { id: 'score_x2',   name: 'Score Booster',   price: 500,  desc: '2x score for next game',      effect: 'scoreMultiplier:2' },
      { id: 'energy_boost', name: 'Energy Boost',   price: 400,  desc: 'Start with +3 energy',        effect: 'bonusEnergy:3' },
      { id: 'extra_row',  name: 'Extra Row Clear',  price: 800,  desc: 'Auto-clear bottom row once', effect: 'autoClear:row_8' },
    ],

    // Special items
    special: [
      { id: 'ad_skip',  name: 'Ad-Free Day',  price: 1500, desc: 'No rewarded ad countdown for 24h', effect: 'adSkip:1d' },
    ],
  };

  // ─── Achievement Definitions ─────────────────────────
  const ACHIEVEMENTS = [
    { id: 'first_play',      name: 'First Steps',      desc: 'Play your first game',                reward: 50,   icon: '🎮',  check: p => p.totalPlays >= 1 },
    { id: 'score_100',       name: 'Century',          desc: 'Score 100 in one game',               reward: 100,  icon: '💯',  check: p => p.bestScore >= 100 },
    { id: 'score_500',       name: 'High Roller',      desc: 'Score 500 in one game',               reward: 250,  icon: '🎯',  check: p => p.bestScore >= 500 },
    { id: 'score_1000',      name: 'Four Digits',      desc: 'Score 1000 in one game',              reward: 500,  icon: '🏆',  check: p => p.bestScore >= 1000 },
    { id: 'score_2000',      name: 'Block Master',     desc: 'Score 2000 in one game',              reward: 1000, icon: '👑',  check: p => p.bestScore >= 2000 },
    { id: 'clear_10',        name: 'Line Beginner',    desc: 'Clear 10 lines total',                reward: 100,  icon: '📏',  check: p => p.totalClears >= 10 },
    { id: 'clear_50',        name: 'Line Collector',   desc: 'Clear 50 lines total',                reward: 300,  icon: '📐',  check: p => p.totalClears >= 50 },
    { id: 'clear_100',       name: 'Line Machine',     desc: 'Clear 100 lines total',               reward: 500,  icon: '⚙️',  check: p => p.totalClears >= 100 },
    { id: 'clear_500',       name: 'Line Legend',      desc: 'Clear 500 lines total',               reward: 1500, icon: '🏅',  check: p => p.totalClears >= 500 },
    { id: 'plays_5',         name: 'Dedicated',        desc: 'Play 5 games',                        reward: 100,  icon: '🎲',  check: p => p.totalPlays >= 5 },
    { id: 'plays_25',        name: 'Addicted',         desc: 'Play 25 games',                       reward: 300,  icon: '🎰',  check: p => p.totalPlays >= 25 },
    { id: 'plays_100',       name: 'Block Addict',     desc: 'Play 100 games',                      reward: 1000, icon: '💎',  check: p => p.totalPlays >= 100 },
    { id: 'daily_3',         name: 'Daily Regular',    desc: 'Complete daily challenge 3 times',    reward: 200,  icon: '📅',  check: p => p.dailyCompletions >= 3 },
    { id: 'daily_7',         name: 'Week Warrior',     desc: 'Complete daily challenge 7 times',    reward: 500,  icon: '📆',  check: p => p.dailyCompletions >= 7 },
    { id: 'daily_30',        name: 'Monthly Master',   desc: 'Complete daily challenge 30 times',   reward: 2000, icon: '🗓️', check: p => p.dailyCompletions >= 30 },
    { id: 'streak_3',        name: '3-Day Streak',     desc: 'Play 3 days in a row',                reward: 200,  icon: '🔥',  check: p => p.bestStreak >= 3 },
    { id: 'streak_7',        name: '7-Day Streak',     desc: 'Play 7 days in a row',                reward: 500,  icon: '🔥',  check: p => p.bestStreak >= 7 },
    { id: 'streak_30',       name: '30-Day Streak',    desc: 'Play 30 days in a row',               reward: 2000, icon: '🌟',  check: p => p.bestStreak >= 30 },
    { id: 'powerup_master',  name: 'Power-up Master',  desc: 'Use 50 power-ups total',              reward: 300,  icon: '⚡',  check: p => p.totalPowerups >= 50 },
    { id: 'all_powerups',    name: 'All at Once',      desc: 'Use all 3 power-up types in one game',reward: 200,  icon: '💥',  check: p => p.allPowerupsGame },
    { id: 'lines_8',         name: 'Clean Sweep',      desc: 'Clear 8+ lines in one move',          reward: 500,  icon: '🧹',  check: p => p.bestSingleClear >= 8 },
    { id: 'coins_1000',      name: 'Coin Hoarder',     desc: 'Earn 1000 coins total',               reward: 200,  icon: '🪙',  check: p => p.totalCoinsEarned >= 1000 },
    { id: 'coins_10000',     name: 'Coin Tycoon',      desc: 'Earn 10000 coins total',              reward: 1000, icon: '💰',  check: p => p.totalCoinsEarned >= 10000 },
    { id: 'level_5',         name: 'Rising Star',      desc: 'Reach level 5',                       reward: 300,  icon: '⭐',  check: p => p.level >= 5 },
    { id: 'level_10',        name: 'Double Digits',    desc: 'Reach level 10',                      reward: 500,  icon: '🌟',  check: p => p.level >= 10 },
    { id: 'shopaholic',      name: 'Shopaholic',       desc: 'Buy 10 items from the shop',          reward: 400,  icon: '🛒',  check: p => p.totalPurchases >= 10 },
    { id: 'collector',       name: 'Collector',        desc: 'Unlock 5 themes',                     reward: 500,  icon: '🎨',  check: p => p.themesUnlocked >= 5 },
    { id: 'perfect_daily',   name: 'Perfect Daily',    desc: 'Use all 60 daily pieces without getting stuck', reward: 1000, icon: '✨', check: p => p.perfectDaily },
  ];

  // ─── Level thresholds ────────────────────────────────
  function xpForLevel(level) {
    return 100 + (level - 1) * 50; // 100, 150, 200, 250...
  }

  // ─── Progression Object ──────────────────────────────
  const P = {
    // State
    coins: 0,
    xp: 0,
    level: 1,
    totalCoinsEarned: 0,
    totalPlays: 0,
    totalClears: 0,
    bestScore: 0,
    bestSingleClear: 0,
    totalPowerups: 0,
    allPowerupsGame: false, // true if used all 3 in current game
    dailyCompletions: 0,
    perfectDaily: false,
    totalPurchases: 0,
    themesUnlocked: 1,
    bestStreak: 0,
    inventory: { themes: ['default'], pieceStyles: ['classic'], boosters: [] },
    activeTheme: 'default',
    activePieceStyle: 'classic',
    activeBoosters: [],
    powerupItems: { bomb: 0, hammer: 0, shuffle: 0 },
    achievements: {}, // { 'first_play': { claimed: false, done: false }, ... }
    lastPlayDate: null,
    streak: 0,
    adFreeUntil: null,

    // ── Initialization ──
    init() {
      this.load();
      // Ensure achievements object exists
      if (!this.achievements || typeof this.achievements !== 'object' || Array.isArray(this.achievements)) {
        this.achievements = {};
      }
      // Manually populate from window.ACHIEVEMENTS (safer than closure ref)
      const list = window.ACHIEVEMENTS || [];
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (!this.achievements[a.id] || typeof this.achievements[a.id] !== 'object') {
          this.achievements[a.id] = { claimed: false, done: false };
        }
      }
      this.save();
    },

    // ── Coin operations ──
    addCoins(amount, showEffect) {
      this.coins += amount;
      this.totalCoinsEarned += amount;
      this.save();
      if (showEffect && typeof window.showCoinEffect === 'function') {
        window.showCoinEffect(amount);
      }
      if (typeof window.updateCoinUI === 'function') window.updateCoinUI();
      return amount;
    },

    spendCoins(amount) {
      if (this.coins < amount) return false;
      this.coins -= amount;
      this.save();
      if (typeof window.updateCoinUI === 'function') window.updateCoinUI();
      return true;
    },

    // ── XP / Leveling ──
    addXP(amount) {
      this.xp += amount;
      const needed = xpForLevel(this.level);
      if (this.xp >= needed) {
        this.xp -= needed;
        this.level++;
        this.save();
        if (typeof window.showLevelUp === 'function') {
          window.showLevelUp(this.level);
        }
      }
      this.save();
    },

    getLevelProgress() {
      return { current: this.xp, max: xpForLevel(this.level), pct: this.xp / xpForLevel(this.level) };
    },

    // ── Achievements ──
    checkAchievements() {
      const newlyDone = [];
      ACHIEVEMENTS.forEach(a => {
        if (!this.achievements[a.id].done && a.check(this)) {
          this.achievements[a.id].done = true;
          newlyDone.push(a);
        }
      });
      this.save();
      if (newlyDone.length > 0 && typeof window.showAchievements === 'function') {
        window.showAchievements(newlyDone);
      }
      return newlyDone;
    },

    claimAchievement(id) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (!a || !this.achievements[id]?.done || this.achievements[id]?.claimed) return false;
      this.achievements[id].claimed = true;
      this.addCoins(a.reward, true);
      this.save();
      return true;
    },

    getAchievementProgress() {
      const total = ACHIEVEMENTS.length;
      const done = ACHIEVEMENTS.filter(a => this.achievements[a.id]?.done).length;
      const claimable = ACHIEVEMENTS.filter(a => this.achievements[a.id]?.done && !this.achievements[a.id]?.claimed).length;
      return { total, done, claimable, pct: done / total };
    },

    // ── Daily Bonus ──
    claimDailyBonus() {
      const today = new Date().toDateString();
      const last = localStorage.getItem(DAILY_KEY);
      
      // Check streak
      if (last === today) return null; // already claimed
      
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (last === yesterday) {
        this.streak++;
      } else {
        this.streak = 1;
      }
      
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      localStorage.setItem(DAILY_KEY, today);
      
      // Bonus amounts scale with streak
      const baseCoins = 50 + this.streak * 10;
      const baseXP = 20 + this.streak * 5;
      const bonusPowerup = this.streak % 5 === 0 ? { bomb: 1, hammer: 1, shuffle: 1 } : null;
      
      this.addCoins(baseCoins, false);
      this.addXP(baseXP);
      if (bonusPowerup) {
        this.powerupItems.bomb = (this.powerupItems.bomb || 0) + (bonusPowerup.bomb || 0);
        this.powerupItems.hammer = (this.powerupItems.hammer || 0) + (bonusPowerup.hammer || 0);
        this.powerupItems.shuffle = (this.powerupItems.shuffle || 0) + (bonusPowerup.shuffle || 0);
      }
      this.save();
      
      return { coins: baseCoins, xp: baseXP, streak: this.streak, bonus: bonusPowerup };
    },

    getDailyBonusInfo() {
      const today = new Date().toDateString();
      const last = localStorage.getItem(DAILY_KEY);
      if (last === today) return { claimed: true, streak: this.streak };
      return { claimed: false, streak: this.streak };
    },

    // ── Shop ──
    getCatalog() { return CATALOG; },

    isUnlocked(category, id) {
      if (category === 'themes') return this.inventory.themes.includes(id);
      if (category === 'pieceStyles') return this.inventory.pieceStyles.includes(id);
      return false;
    },

    purchaseItem(category, itemId) {
      let items;
      if (category === 'themes') items = CATALOG.themes;
      else if (category === 'pieceStyles') items = CATALOG.pieceStyles;
      else if (category === 'powerupPacks') items = CATALOG.powerupPacks;
      else if (category === 'boosters') items = CATALOG.boosters;
      else if (category === 'special') items = CATALOG.special;
      else return false;

      const item = items.find(i => i.id === itemId);
      if (!item) return false;
      if (this.coins < item.price) return false;

      // Check if already owned (for themes/pieceStyles)
      if (category === 'themes' && this.inventory.themes.includes(itemId)) return false;
      if (category === 'pieceStyles' && this.inventory.pieceStyles.includes(itemId)) return false;

      this.coins -= item.price;
      this.totalPurchases++;

      if (category === 'themes') {
        this.inventory.themes.push(itemId);
        this.themesUnlocked = this.inventory.themes.length;
      } else if (category === 'pieceStyles') {
        this.inventory.pieceStyles.push(itemId);
      } else if (category === 'powerupPacks') {
        const pack = item;
        if (pack.items) {
          this.powerupItems.bomb = (this.powerupItems.bomb || 0) + (pack.items.bomb || 0);
          this.powerupItems.hammer = (this.powerupItems.hammer || 0) + (pack.items.hammer || 0);
          this.powerupItems.shuffle = (this.powerupItems.shuffle || 0) + (pack.items.shuffle || 0);
        }
      } else if (category === 'boosters') {
        this.activeBoosters.push({ id: itemId, used: false });
      } else if (category === 'special') {
        if (itemId === 'ad_skip') {
          this.adFreeUntil = Date.now() + 86400000;
        }
      }

      this.save();
      this.checkAchievements();
      if (typeof window.updateCoinUI === 'function') window.updateCoinUI();
      return true;
    },

    applyTheme(id) {
      if (!this.inventory.themes.includes(id)) return false;
      this.activeTheme = id;
      this.save();
      if (typeof window.applyTheme === 'function') window.applyTheme(id);
      return true;
    },

    applyPieceStyle(id) {
      if (!this.inventory.pieceStyles.includes(id)) return false;
      this.activePieceStyle = id;
      this.save();
      if (typeof window.applyPieceStyle === 'function') window.applyPieceStyle(id);
      return true;
    },

    usePowerupItem(type) {
      if (!this.powerupItems[type] || this.powerupItems[type] <= 0) return false;
      this.powerupItems[type]--;
      this.save();
      if (typeof window.updatePowerupCounts === 'function') window.updatePowerupCounts();
      return true;
    },

    // ── Game Stats ──
    recordPlay(bestScore, totalClears, cleared8plus, usedAllPowerups, dailyCompleted, allUsed) {
      this.totalPlays++;
      this.totalClears += totalClears || 0;
      if (bestScore > this.bestScore) this.bestScore = bestScore;
      if ((cleared8plus || 0) > this.bestSingleClear) this.bestSingleClear = cleared8plus || 0;
      if (usedAllPowerups) this.allPowerupsGame = true;
      if (dailyCompleted) this.dailyCompletions = (this.dailyCompletions || 0) + 1;
      if (allUsed) this.perfectDaily = true;
      this.lastPlayDate = new Date().toISOString();
      this.save();
      this.checkAchievements();
    },

    recordPowerupUse() {
      this.totalPowerups++;
      this.save();
    },

    // ── Persistence ──
    save() {
      try {
        const data = {
          coins: this.coins,
          xp: this.xp,
          level: this.level,
          totalCoinsEarned: this.totalCoinsEarned,
          totalPlays: this.totalPlays,
          totalClears: this.totalClears,
          bestScore: this.bestScore,
          bestSingleClear: this.bestSingleClear,
          totalPowerups: this.totalPowerups,
          allPowerupsGame: this.allPowerupsGame,
          dailyCompletions: this.dailyCompletions,
          perfectDaily: this.perfectDaily,
          totalPurchases: this.totalPurchases,
          themesUnlocked: this.themesUnlocked,
          bestStreak: this.bestStreak,
          inventory: this.inventory,
          activeTheme: this.activeTheme,
          activePieceStyle: this.activePieceStyle,
          powerupItems: this.powerupItems,
          achievements: this.achievements,
          lastPlayDate: this.lastPlayDate,
          streak: this.streak,
          adFreeUntil: this.adFreeUntil,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch(e) { /* storage full or unavailable */ }
    },

    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.assign(this, data);
      } catch(e) { /* corrupt data, start fresh */ }
    },

    reset() {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(DAILY_KEY);
      location.reload();
    },
  };

  // ─── Expose globally ─────────────────────────────────
  window.GameProgression = P;
  window.ACHIEVEMENTS = ACHIEVEMENTS;
  window.CATALOG = CATALOG;

})();
