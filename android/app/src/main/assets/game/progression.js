/* ===== Block Crush Daily — Full Progression System =====
   Coins, XP, Levels, Achievements, Case/Outfit/Weapon Upgrades, Premium Gems
*/
(function() {
  'use strict';

  const SAVE_KEY = 'bcd_progress';
  const DAILY_KEY = 'bcd_daily_bonus';

  // ─── Upgrade Tiers: Weapon / Case / Outfit ──────────
  // Each tier gives bonus stats AND changes visual appearance
  const UPGRADE_TIERS = {
    weapon: {
      name: 'Weapon',
      icon: '⚔️',
      maxLevel: 5,
      baseCost: 1000,   // coins to reach level 1
      costMultiplier: 2, // each level costs 2x previous
      gemCost: 50,       // gem shortcut cost (always same)
      levels: [
        { level: 0, name: 'Wooden Mallet',    bonus: { scoreMult: 1.0, clearBonus: 0 },   gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Stone Hammer',     bonus: { scoreMult: 1.1, clearBonus: 10 },  gemReq: 50,  coinsReq: 1000 },
        { level: 2, name: 'Iron Sledge',      bonus: { scoreMult: 1.2, clearBonus: 25 },  gemReq: 80,  coinsReq: 2000 },
        { level: 3, name: 'Steel Crusher',    bonus: { scoreMult: 1.35, clearBonus: 50 }, gemReq: 120, coinsReq: 4000 },
        { level: 4, name: 'Neon Laser Blade', bonus: { scoreMult: 1.5, clearBonus: 80 },  gemReq: 200, coinsReq: 8000 },
        { level: 5, name: '⚡ Void Devourer', bonus: { scoreMult: 2.0, clearBonus: 150 }, gemReq: 500, coinsReq: 20000 },
      ]
    },
    case: {
      name: 'Case',
      icon: '🛡️',
      maxLevel: 5,
      baseCost: 800,
      costMultiplier: 2,
      gemCost: 50,
      levels: [
        { level: 0, name: 'Basic Cardboard',  bonus: { startEnergy: 0, shieldChance: 0 },     gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Wooden Chest',     bonus: { startEnergy: 1, shieldChance: 0.05 },  gemReq: 40,  coinsReq: 800 },
        { level: 2, name: 'Iron Vault',       bonus: { startEnergy: 2, shieldChance: 0.10 },  gemReq: 70,  coinsReq: 1600 },
        { level: 3, name: 'Silver Guardian',  bonus: { startEnergy: 3, shieldChance: 0.15 },  gemReq: 100, coinsReq: 3200 },
        { level: 4, name: 'Golden Fortress',  bonus: { startEnergy: 4, shieldChance: 0.20 },  gemReq: 180, coinsReq: 6400 },
        { level: 5, name: '💎 Diamond Aegis', bonus: { startEnergy: 5, shieldChance: 0.30 },  gemReq: 400, coinsReq: 16000 },
      ]
    },
    outfit: {
      name: 'Outfit',
      icon: '👕',
      maxLevel: 5,
      baseCost: 600,
      costMultiplier: 2,
      gemCost: 40,
      levels: [
        { level: 0, name: 'Rags',            bonus: { extraLife: 0, comboBonus: 0 },      gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Leather Vest',    bonus: { extraLife: 1, comboBonus: 5 },      gemReq: 30,  coinsReq: 600 },
        { level: 2, name: 'Chainmail',       bonus: { extraLife: 1, comboBonus: 10 },     gemReq: 60,  coinsReq: 1200 },
        { level: 3, name: 'Phantom Cloak',   bonus: { extraLife: 2, comboBonus: 15 },     gemReq: 90,  coinsReq: 2400 },
        { level: 4, name: 'Crystal Armor',   bonus: { extraLife: 2, comboBonus: 25 },     gemReq: 150, coinsReq: 4800 },
        { level: 5, name: '🔥 Phoenix Robe', bonus: { extraLife: 3, comboBonus: 40 },     gemReq: 350, coinsReq: 12000 },
      ]
    }
  };

  // ─── Premium Items (REAL MONEY ONLY — no coin purchase) ──
  const PREMIUM_ITEMS = {
    // Legendary weapon skins (cosmetic only — prestige)
    legendarySkins: [
      { id: 'lg_void',       name: 'Void Walker',    desc: 'Dark matter weapon skin',         price: 4.99,  gemPrice: 0,    tier: 'legendary', type: 'weapon_skin' },
      { id: 'lg_cosmic',     name: 'Cosmic Edge',    desc: 'Galaxy-themed blade',             price: 6.99,  gemPrice: 0,    tier: 'legendary', type: 'weapon_skin' },
      { id: 'lg_flame',      name: 'Inferno Fury',   desc: 'Living flame weapon',             price: 8.99,  gemPrice: 0,    tier: 'legendary', type: 'weapon_skin' },
    ],
    // Premium cases
    premiumCases: [
      { id: 'pc_royal',      name: 'Royal Pass',     desc: '7 days: 2x coins + 50 gems/day',  price: 4.99,  gemPrice: 0,    type: 'subscription', duration: '7d' },
      { id: 'pc_vip',        name: 'VIP Status',     desc: '30 days: 3x coins + 100 gems/day + exclusive skin', price: 12.99,  gemPrice: 0, type: 'subscription', duration: '30d' },
    ],
    // Limited bundles
    bundles: [
      { id: 'bundle_starter',  name: 'Starter Bundle',   desc: '200 gems + 5 bombs + 5 hammers + exclusive skin',         price: 2.99,  gemPrice: 0,    type: 'one_time' },
      { id: 'bundle_mega',     name: 'Mega Power Pack',  desc: '500 gems + 20 bombs + 20 hammers + neon theme',           price: 7.99,  gemPrice: 0,    type: 'one_time' },
      { id: 'bundle_ultimate', name: 'Ultimate Bundle',  desc: '2000 gems + 50 all power-ups + all themes + legendary skin', price: 19.99, gemPrice: 0, type: 'one_time' },
    ],
    // Remove ads
    removeAds: { id: 'remove_ads', name: 'Remove Ads', desc: 'Permanently remove all ads', price: 2.99, gemPrice: 0, type: 'one_time' },
  };

  // ─── Gem Packs (real money <-> gems) ────────────────
  const GEM_PACKS = [
    { id: 'gems_small',  name: 'Small Gem Pack',         gems: 100,  price: 0.99,  bonus: 0,    popular: false },
    { id: 'gems_medium', name: 'Standard Gem Pack',      gems: 500,  price: 3.99,  bonus: 50,   popular: true  },
    { id: 'gems_large',  name: 'Large Gem Pack',         gems: 1200, price: 7.99,  bonus: 200,  popular: false },
    { id: 'gems_mega',   name: 'Mega Gem Pack',          gems: 4000, price: 19.99, bonus: 1000, popular: false },
    { id: 'gems_ultra',  name: '🐳 Whale Pack',          gems: 10000,price: 39.99, bonus: 5000, popular: false },
  ];

  // ─── Shop Catalog (coin-based) ──────────────────────
  const CATALOG = {
    themes: [
      { id: 'default',   name: 'Classic Dark',   price: 0,    desc: 'The original dark theme',          colors: { bg: '#0f1020', accent: '#1a1a2e' } },
      { id: 'ocean',     name: 'Ocean Blue',     price: 500,  desc: 'Calming ocean blues',              colors: { bg: '#023047', accent: '#0a4a6e' } },
      { id: 'sunset',    name: 'Sunset Glow',    price: 800,  desc: 'Warm sunset orange & pink',        colors: { bg: '#2d1b3d', accent: '#4a1a3a' } },
      { id: 'forest',    name: 'Forest Green',   price: 1000, desc: 'Lush forest greens',              colors: { bg: '#1a3a2a', accent: '#2a4a3a' } },
      { id: 'neon',      name: 'Neon Nights',    price: 1500, desc: 'Bright neon on dark purple',       colors: { bg: '#1a0030', accent: '#2a0050' } },
      { id: 'royal',     name: 'Royal Gold',     price: 2000, desc: 'Gold & royal purple',             colors: { bg: '#1a0030', accent: '#3a1050' } },
      { id: 'midnight',  name: 'Midnight Sky',   price: 3000, desc: 'Deep navy with starry accents',    colors: { bg: '#000a1a', accent: '#001a30' } },
      { id: 'cherry',    name: 'Cherry Blossom', price: 5000, desc: 'Soft pink cherry blossoms',        colors: { bg: '#2a0a1a', accent: '#3a1525' } },
    ],
    pieceStyles: [
      { id: 'classic',    name: 'Classic Blocks', price: 0,    desc: 'Original block style',        borderRadius: 0, glow: false },
      { id: 'rounded',    name: 'Rounded Gems',   price: 600,  desc: 'Smooth rounded blocks',       borderRadius: 6, glow: false },
      { id: 'glow',       name: 'Glow Effect',    price: 1200, desc: 'Blocks with subtle glow',    borderRadius: 3, glow: true },
      { id: 'glass',      name: 'Glass Panels',   price: 2000, desc: 'Semi-transparent glass look', borderRadius: 4, glow: true },
      { id: 'neon_edge',  name: 'Neon Edge',      price: 3500, desc: 'Neon-outlined blocks',        borderRadius: 2, glow: true },
    ],
    powerupPacks: [
      { id: 'starter',   name: 'Starter Pack',   price: 200,  items: { bomb: 3, hammer: 3, shuffle: 3 },   desc: '3 of each power-up' },
      { id: 'bomber',    name: 'Bomb Bundle',    price: 300,  items: { bomb: 8 },                         desc: '8 bombs' },
      { id: 'hammer',    name: 'Hammer Pack',    price: 200,  items: { hammer: 8 },                       desc: '8 hammers' },
      { id: 'shuffler',  name: 'Shuffle Pack',   price: 400,  items: { shuffle: 8 },                      desc: '8 shuffles' },
      { id: 'mega',      name: 'Mega Bundle',    price: 1000, items: { bomb: 10, hammer: 10, shuffle: 10 }, desc: '10 of each power-up' },
    ],
    boosters: [
      { id: 'score_x2',   name: 'Score Booster',   price: 500,  desc: '2x score for next game',      effect: 'scoreMultiplier:2' },
      { id: 'energy_boost', name: 'Energy Boost',   price: 400,  desc: 'Start with +3 energy',        effect: 'bonusEnergy:3' },
      { id: 'extra_row',  name: 'Extra Row Clear',  price: 800,  desc: 'Auto-clear bottom row once', effect: 'autoClear:row_8' },
    ],
  };

  // ─── Achievements (now with gem rewards at higher tiers) ──
  const ACHIEVEMENTS = [
    { id: 'first_play',      name: 'First Steps',      desc: 'Play your first game',                reward: { coins: 50, gems: 0 },    icon: '🎮',  check: p => p.totalPlays >= 1 },
    { id: 'score_100',       name: 'Century',          desc: 'Score 100 in one game',               reward: { coins: 100, gems: 0 },   icon: '💯',  check: p => p.bestScore >= 100 },
    { id: 'score_500',       name: 'High Roller',      desc: 'Score 500 in one game',               reward: { coins: 250, gems: 0 },   icon: '🎯',  check: p => p.bestScore >= 500 },
    { id: 'score_1000',      name: 'Four Digits',      desc: 'Score 1000 in one game',              reward: { coins: 500, gems: 5 },   icon: '🏆',  check: p => p.bestScore >= 1000 },
    { id: 'score_2000',      name: 'Block Master',     desc: 'Score 2000 in one game',              reward: { coins: 1000, gems: 10 }, icon: '👑',  check: p => p.bestScore >= 2000 },
    { id: 'score_5000',      name: 'Grandmaster',      desc: 'Score 5000 in one game',              reward: { coins: 2000, gems: 25 }, icon: '🌟',  check: p => p.bestScore >= 5000 },
    { id: 'score_10000',     name: 'Legend',           desc: 'Score 10000 in one game',             reward: { coins: 5000, gems: 50 }, icon: '🏅',  check: p => p.bestScore >= 10000 },
    { id: 'lines_10',        name: 'Line Dancer',      desc: 'Clear 10 lines total',                reward: { coins: 100, gems: 0 },   icon: '📏',  check: p => p.totalLines >= 10 },
    { id: 'lines_100',       name: 'Line Runner',      desc: 'Clear 100 lines total',               reward: { coins: 300, gems: 5 },   icon: '📐',  check: p => p.totalLines >= 100 },
    { id: 'lines_500',       name: 'Line Master',      desc: 'Clear 500 lines total',               reward: { coins: 800, gems: 15 },  icon: '📊',  check: p => p.totalLines >= 500 },
    { id: 'lines_1000',      name: 'Block Legend',     desc: 'Clear 1000 lines total',              reward: { coins: 2000, gems: 30 }, icon: '💠',  check: p => p.totalLines >= 1000 },
    { id: 'combo_2',         name: 'Double Clear',     desc: 'Clear 2+ lines at once',              reward: { coins: 100, gems: 0 },   icon: '2️⃣',  check: p => p.bestCombo >= 2 },
    { id: 'combo_3',         name: 'Triple Threat',    desc: 'Clear 3 lines at once',               reward: { coins: 300, gems: 5 },   icon: '3️⃣',  check: p => p.bestCombo >= 3 },
    { id: 'combo_4',         name: 'Perfect Line',     desc: 'Clear 4 lines at once',               reward: { coins: 1000, gems: 15 }, icon: '4️⃣',  check: p => p.bestCombo >= 4 },
    { id: 'combo_5',         name: 'Line Storm',       desc: 'Clear 5+ lines at once',              reward: { coins: 2000, gems: 25 }, icon: '💥',  check: p => p.bestCombo >= 5 },
    { id: 'streak_3',        name: '3-Day Streak',     desc: 'Play 3 days in a row',                reward: { coins: 200, gems: 0 },   icon: '🔥',  check: p => p.bestStreak >= 3 },
    { id: 'streak_7',        name: 'Week Warrior',     desc: 'Play 7 days in a row',                reward: { coins: 500, gems: 10 },  icon: '📅',  check: p => p.bestStreak >= 7 },
    { id: 'streak_14',       name: 'Fortnight Champion', desc: 'Play 14 days in a row',              reward: { coins: 1500, gems: 25 }, icon: '⏰',  check: p => p.bestStreak >= 14 },
    { id: 'streak_30',       name: 'Month Master',     desc: 'Play 30 days in a row',               reward: { coins: 5000, gems: 100 },icon: '👑',  check: p => p.bestStreak >= 30 },
    { id: 'weapon_1',        name: 'Armed',            desc: 'Upgrade weapon to level 1',           reward: { coins: 200, gems: 0 },   icon: '🔨',  check: p => (p.upgrades?.weapon || 0) >= 1 },
    { id: 'weapon_3',        name: 'Heavy Hitter',     desc: 'Upgrade weapon to level 3',           reward: { coins: 500, gems: 10 },  icon: '⚒️',  check: p => (p.upgrades?.weapon || 0) >= 3 },
    { id: 'weapon_5',        name: 'Weapon Master',    desc: 'Reach max weapon level',              reward: { coins: 2000, gems: 50 }, icon: '🗡️',  check: p => (p.upgrades?.weapon || 0) >= 5 },
    { id: 'case_1',          name: 'Shielded',         desc: 'Upgrade case to level 1',             reward: { coins: 200, gems: 0 },   icon: '🛡️',  check: p => (p.upgrades?.case || 0) >= 1 },
    { id: 'case_3',          name: 'Fortified',        desc: 'Upgrade case to level 3',             reward: { coins: 500, gems: 10 },  icon: '🏰',  check: p => (p.upgrades?.case || 0) >= 3 },
    { id: 'case_5',          name: 'Impregnable',      desc: 'Reach max case level',                reward: { coins: 2000, gems: 50 }, icon: '💎',  check: p => (p.upgrades?.case || 0) >= 5 },
    { id: 'outfit_1',        name: 'Dressed Up',       desc: 'Upgrade outfit to level 1',           reward: { coins: 200, gems: 0 },   icon: '👔',  check: p => (p.upgrades?.outfit || 0) >= 1 },
    { id: 'outfit_3',        name: 'Fashionable',      desc: 'Upgrade outfit to level 3',           reward: { coins: 500, gems: 10 },  icon: '👗',  check: p => (p.upgrades?.outfit || 0) >= 3 },
    { id: 'outfit_5',        name: 'Fashion Legend',   desc: 'Reach max outfit level',              reward: { coins: 2000, gems: 50 }, icon: '👘',  check: p => (p.upgrades?.outfit || 0) >= 5 },
    { id: 'gems_100',        name: 'Gem Collector',    desc: 'Earn 100 total gems',                 reward: { coins: 500, gems: 20 },  icon: '💎',  check: p => p.totalGems >= 100 },
    { id: 'gems_500',        name: 'Gem Hoarder',      desc: 'Earn 500 total gems',                 reward: { coins: 1000, gems: 50 }, icon: '💠',  check: p => p.totalGems >= 500 },
    { id: 'all_achievements', name: 'Completionist',   desc: 'Unlock all other achievements',       reward: { coins: 10000, gems: 200 }, icon: '🏅', check: p => false }, // special
  ];

  // ─── Player State ──────────────────────────────────
  function defaultState() {
    return {
      coins: 100,
      gems: 0,
      totalGems: 0,         // lifetime gems earned (for achievements)
      xp: 0,
      level: 1,
      bestScore: 0,
      bestCombo: 0,
      totalPlays: 0,
      totalLines: 0,
      bestStreak: 0,
      upgrades: { weapon: 0, case: 0, outfit: 0 },
      ownedThemes: ['default'],
      ownedPieceStyles: ['classic'],
      activeTheme: 'default',
      activePieceStyle: 'classic',
      powerups: { bomb: 5, hammer: 5, shuffle: 5 },
      activeBoosters: {},
      inventory: {},         // premium items owned { id: true }
      achievements: {},
      lastSaveDate: null,
      adFree: false,
      subscriptions: {},
    };
  }

  let state = null;

  // ─── Save / Load ────────────────────────────────────
  function save() {
    state.lastSaveDate = new Date().toISOString();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch(e) { /* storage full */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        state = { ...defaultState(), ...JSON.parse(raw) };
        // Ensure new fields exist
        if (!state.upgrades) state.upgrades = { weapon: 0, case: 0, outfit: 0 };
        if (!state.gems && state.gems !== 0) state.gems = 0;
        if (!state.totalGems) state.totalGems = 0;
        if (!state.inventory) state.inventory = {};
        if (!state.subscriptions) state.subscriptions = {};
        if (!state.adFree) state.adFree = false;
        save();
        return true;
      }
    } catch(e) {}
    reset();
    return false;
  }

  function reset() {
    state = defaultState();
    save();
  }

  // ─── Experience / Leveling ──────────────────────────
  function xpForLevel(lvl) {
    return Math.floor(100 * Math.pow(1.2, lvl - 1));
  }

  function addXp(amount) {
    if (!state) return;
    state.xp += amount;
    let leveled = false;
    while (state.xp >= xpForLevel(state.level)) {
      state.xp -= xpForLevel(state.level);
      state.level++;
      leveled = true;
    }
    save();
    return leveled;
  }

  // ─── Coins ──────────────────────────────────────────
  function addCoins(amount) {
    if (!state) return 0;
    state.coins += amount;
    save();
    return state.coins;
  }

  function spendCoins(amount) {
    if (!state || state.coins < amount) return false;
    state.coins -= amount;
    save();
    return true;
  }

  // ─── Premium Gems ──────────────────────────────────
  function addGems(amount) {
    if (!state) return 0;
    state.gems += amount;
    state.totalGems += amount;
    save();
    return state.gems;
  }

  function spendGems(amount) {
    if (!state || state.gems < amount) return false;
    state.gems -= amount;
    save();
    return true;
  }

  // ─── Upgrade System ─────────────────────────────────
  function getUpgradeCost(category, currentLevel) {
    const tier = UPGRADE_TIERS[category];
    if (!tier) return null;
    const nextLevel = currentLevel + 1;
    const levelData = tier.levels.find(l => l.level === nextLevel);
    if (!levelData) return null;
    return { coins: levelData.coinsReq, gems: levelData.gemReq };
  }

  function upgradeItem(category, useGems = false) {
    if (!state) return { success: false, reason: 'no_state' };
    const tier = UPGRADE_TIERS[category];
    if (!tier) return { success: false, reason: 'invalid_category' };

    const current = state.upgrades[category] || 0;
    if (current >= tier.maxLevel) return { success: false, reason: 'max_level' };

    const costs = getUpgradeCost(category, current);
    if (!costs) return { success: false, reason: 'no_level_data' };

    if (useGems) {
      if (state.gems < costs.gems) return { success: false, reason: 'not_enough_gems' };
      spendGems(costs.gems);
    } else {
      if (state.coins < costs.coins) return { success: false, reason: 'not_enough_coins' };
      spendCoins(costs.coins);
    }

    state.upgrades[category]++;
    save();
    return { success: true, newLevel: state.upgrades[category] };
  }

  // ─── Calculate Active Bonuses ──────────────────────
  function getActiveBonuses() {
    if (!state) return { scoreMult: 1, clearBonus: 0, startEnergy: 0, shieldChance: 0, extraLife: 0, comboBonus: 0 };

    const bonuses = { scoreMult: 1, clearBonus: 0, startEnergy: 0, shieldChance: 0, extraLife: 0, comboBonus: 0 };

    // Weapon bonus
    const wLevel = state.upgrades.weapon || 0;
    const wData = UPGRADE_TIERS.weapon.levels[wLevel];
    if (wData) {
      bonuses.scoreMult += (wData.bonus.scoreMult - 1);
      bonuses.clearBonus += wData.bonus.clearBonus;
    }

    // Case bonus
    const cLevel = state.upgrades.case || 0;
    const cData = UPGRADE_TIERS.case.levels[cLevel];
    if (cData) {
      bonuses.startEnergy += cData.bonus.startEnergy;
      bonuses.shieldChance += cData.bonus.shieldChance;
    }

    // Outfit bonus
    const oLevel = state.upgrades.outfit || 0;
    const oData = UPGRADE_TIERS.outfit.levels[oLevel];
    if (oData) {
      bonuses.extraLife += oData.bonus.extraLife;
      bonuses.comboBonus += oData.bonus.comboBonus;
    }

    return bonuses;
  }

  // ─── Inventory / Premium Items ─────────────────────
  function ownsPremiumItem(itemId) {
    return state && state.inventory && state.inventory[itemId] === true;
  }

  function purchasePremiumItem(itemId) {
    if (!state) return false;
    const allPremium = { ...PREMIUM_ITEMS.legendarySkins, ...PREMIUM_ITEMS.premiumCases, ...PREMIUM_ITEMS.bundles, removeAds: PREMIUM_ITEMS.removeAds };
    // For premium items (real money), we mark as owned
    // Real payment processing would happen through Google Play Billing
    state.inventory[itemId] = true;
    if (itemId === 'remove_ads') {
      state.adFree = true;
      if (window.AdsManager) AdsManager.onAdsRemoved();
    }

    // Bundle items also give gems
    const bundleGems = { bundle_starter: 200, bundle_mega: 500, bundle_ultimate: 2000 };
    if (bundleGems[itemId]) addGems(bundleGems[itemId]);

    // Notify collectibles
    if (window.CollectiblesSystem) {
      CollectiblesSystem.setTracker('madePurchase', true);
      CollectiblesSystem.checkUnlocks();
    }

    save();
    return true;
  }

  // ─── Achievements ──────────────────────────────────
  function checkAchievements() {
    if (!state) return [];
    const unlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (state.achievements[ach.id]) continue;
      if (ach.check(state)) {
        state.achievements[ach.id] = true;
        addCoins(ach.reward.coins);
        if (ach.reward.gems) addGems(ach.reward.gems);
        unlocked.push(ach);
      }
    }
    if (unlocked.length > 0) save();
    return unlocked;
  }

  // ─── Daily Bonus (streak-based) ────────────────────
  function claimDailyBonus() {
    if (!state) return null;
    const now = new Date();
    const today = now.toDateString();

    try {
      const lastClaim = localStorage.getItem(DAILY_KEY);
      if (lastClaim === today) return null; // already claimed

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      let streak = 0;
      if (lastClaim === yesterdayStr) {
        streak = (state.dailyStreak || 0) + 1;
      } else {
        streak = 1;
      }
      state.dailyStreak = streak;
      if (streak > state.bestStreak) state.bestStreak = streak;

      const coins = Math.min(100 + (streak - 1) * 20, 1000);
      const gems = streak >= 7 ? 5 : streak >= 3 ? 2 : 0;
      addCoins(coins);
      if (gems) addGems(gems);

      localStorage.setItem(DAILY_KEY, today);
      save();
      return { streak, coins, gems };
    } catch(e) {
      return null;
    }
  }

  // ─── Game Callbacks (called at end of game) ────────
  function endOfGame(result) {
    if (!state) return;

    state.totalPlays++;
    if (result.score > state.bestScore) state.bestScore = result.score;
    if (result.bestCombo > state.bestCombo) state.bestCombo = result.bestCombo;
    if (result.linesCleared) state.totalLines += result.linesCleared;

    // XP earned from game
    const xpGain = Math.floor(result.score / 10) + result.linesCleared * 5 + 20;
    addXp(xpGain);

    // Coins earned
    const coinGain = Math.floor(result.score / 20) + result.linesCleared * 2 + 5;
    addCoins(coinGain);

    save();
  }

  // ─── Getters ────────────────────────────────────────
  function getState() { return state; }
  function getUpgradeTiers() { return UPGRADE_TIERS; }
  function getPremiumItems() { return PREMIUM_ITEMS; }
  function getGemPacks() { return GEM_PACKS; }
  function getCatalog() { return CATALOG; }
  function getAchievements() { return ACHIEVEMENTS; }
  function getCoinBalance() { return state ? state.coins : 0; }
  function getGemBalance() { return state ? state.gems : 0; }

  // ─── Export ──────────────────────────────────────────
  window.ProgressionSystem = {
    load, save, reset,
    addCoins, spendCoins, getCoinBalance,
    addGems, spendGems, getGemBalance,
    addXp, xpForLevel,
    upgradeItem, getUpgradeCost, getActiveBonuses,
    getUpgradeTiers, UPGRADE_TIERS,
    getPremiumItems, PREMIUM_ITEMS,
    getGemPacks, GEM_PACKS,
    ownsPremiumItem, purchasePremiumItem,
    getCatalog, CATALOG,
    getAchievements, ACHIEVEMENTS,
    checkAchievements, endOfGame,
    claimDailyBonus,
    getState, defaultState,
  };
})();
