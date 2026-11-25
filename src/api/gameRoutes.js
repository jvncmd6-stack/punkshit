import express from 'express';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { todayWib, formatUser, broadcastToTelegram, escHtml } from '../services/syncEngine.js';
import {
  DAILY_PSC_CAP,
  FISH_POOLS,
  ALL_FISH_COUNT,
  CLAW_BOX_POOLS,
  TRIVIA_BANK,
  PASS_MILESTONES,
  DAILY_QUESTS_DEF,
  getAuthUser,
  weightedPick,
  getOrCreateArcadeProfile,
  clampDailyPsc,
  updateArcadeProgress,
  getLeaderboards
} from './arena/arenaData.js';

export const gameRouter = express.Router();

// ==========================================
// 1. STATE & LEADERBOARD ARENA GABUT 2.0
// ==========================================
gameRouter.get('/arena/state', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const today = todayWib();
  const profile = getOrCreateArcadeProfile(user.id);

  const fourHoursMs = 4 * 3600 * 1000;
  let fishUsed = user.fish_date === today ? (user.fish_today || 0) : 0;
  if (fishUsed >= 6 && profile.lastFishBatchAt && (Date.now() - profile.lastFishBatchAt) >= fourHoursMs) {
    db.prepare('UPDATE users SET fish_today = 0 WHERE id = ?').run(user.id);
    fishUsed = 0;
  }

  const collections = db.prepare(`
    SELECT id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at
    FROM arcade_collections
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(user.id);

  const quests = DAILY_QUESTS_DEF.map(q => {
    const progress = Math.min(q.target, profile.dailyStats[q.statKey] || 0);
    return {
      ...q,
      progress,
      done: progress >= q.target,
      claimed: profile.claimedQuests.includes(q.id)
    };
  });

  res.json({
    profile,
    passMilestones: PASS_MILESTONES,
    quests,
    fishQuota: {
      used: fishUsed,
      max: 6,
      left: Math.max(0, 6 - fishUsed),
      cooldownEndsAt: fishUsed >= 6 ? (profile.lastFishBatchAt + fourHoursMs) : 0
    },
    scratchedToday: user.scratched_date === today,
    dailyPscEarned: Number(profile.dailyStats.pscEarnedToday || 0),
    dailyPscCap: DAILY_PSC_CAP,
    collections,
    fishdexTotal: ALL_FISH_COUNT,
    leaderboards: getLeaderboards()
  });
});

// ==========================================
// 2. MULAI SESI GAME
// ==========================================
gameRouter.post('/arena/session/start', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { game, mode = 'standard' } = req.body || {};
  const today = todayWib();
  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const profile = getOrCreateArcadeProfile(user.id);

  db.prepare('DELETE FROM arcade_sessions WHERE user_id = ? AND expires_at < ?').run(user.id, now);

  if (game === 'fish') {
    const fourHoursMs = 4 * 3600 * 1000;
    let fishUsed = user.fish_date === today ? (user.fish_today || 0) : 0;

    if (fishUsed >= 6) {
      if (profile.lastFishBatchAt && (now - profile.lastFishBatchAt) >= fourHoursMs) {
        db.prepare('UPDATE users SET fish_today = 0 WHERE id = ?').run(user.id);
        fishUsed = 0;
      } else {
        const minsLeft = Math.ceil((fourHoursMs - (now - profile.lastFishBatchAt)) / 60000);
        return res.status(400).json({ error: `Kail lagi istirahat cuy! Tunggu ${Math.max(1, minsLeft)} menit lagi.` });
      }
    }

    const spotKey = FISH_POOLS[mode] ? mode : 'pinggir';
    const pickedFish = weightedPick(FISH_POOLS[spotKey]);
    const weight = Number((pickedFish.minW + Math.random() * (pickedFish.maxW - pickedFish.minW)).toFixed(2));
    const biteDelayMs = 1400 + Math.floor(Math.random() * 2200);

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'fish', ?, ?, 'active', ?, ?)
    `).run(
      sessionId,
      user.id,
      spotKey,
      JSON.stringify({ fish: pickedFish, weight, spot: spotKey }),
      now,
      now + 3 * 60 * 1000
    );

    return res.json({
      sessionId,
      biteDelayMs,
      tensionDifficulty: pickedFish.tension,
      rarityHint: pickedFish.rarity === 'Mythic' || pickedFish.rarity === 'Legendary'
        ? 'Tarikan monster kedalaman!'
        : pickedFish.rarity === 'Epic'
          ? 'Tarikan berat banget!'
          : 'Pelampung mulai bergerak...'
    });
  }

  if (game === 'scratch') {
    if (user.scratched_date === today) {
      return res.status(400).json({ error: 'Kartu Gosok Nasib hari ini sudah dipakai. Balik lagi besok!' });
    }

    const roll = Math.random();
    let prize = { type: 'psc', psc: 6, xp: 20, label: '+6 PSC' };
    if (roll < 0.06) prize = { type: 'psc', psc: 40, xp: 65, label: 'JACKPOT +40 PSC!' };
    else if (roll < 0.24) prize = { type: 'psc', psc: 18, xp: 35, label: '+18 PSC' };
    else if (roll < 0.58) prize = { type: 'psc', psc: 10, xp: 25, label: '+10 PSC' };

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'scratch', 'daily', ?, 'active', ?, ?)
    `).run(sessionId, user.id, JSON.stringify({ prize }), now, now + 5 * 60 * 1000);

    return res.json({
      sessionId,
      prizePreview: prize.label
    });
  }

  if (game === 'claw') {
    const boxKey = CLAW_BOX_POOLS[mode] ? mode : 'rongsok';
    const pickedItem = weightedPick(CLAW_BOX_POOLS[boxKey]);

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'claw', ?, ?, 'active', ?, ?)
    `).run(
      sessionId,
      user.id,
      boxKey,
      JSON.stringify({ item: pickedItem, grabSuccessRate: pickedItem.rate, box: boxKey }),
      now,
      now + 3 * 60 * 1000
    );

    return res.json({
      sessionId,
      targetHint: pickedItem.name,
      rarity: pickedItem.rarity
    });
  }

  if (game === 'react') {
    const tierKey = ['classic', 'bo5', 'nightmare'].includes(mode) ? mode : 'classic';
    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'react', ?, '{}', 'active', ?, ?)
    `).run(sessionId, user.id, tierKey, now, now + 3 * 60 * 1000);

    return res.json({ sessionId, mode: tierKey });
  }

  if (game === 'trivia') {
    const tierKey = TRIVIA_BANK[mode] ? mode : 'medium';
    const count = tierKey === 'hard' ? 6 : 5;
    const shuffled = [...TRIVIA_BANK[tierKey]].sort(() => Math.random() - 0.5).slice(0, count);
    const answers = shuffled.map(q => q.ans);
    const clientQuestions = shuffled.map((q, idx) => ({
      index: idx,
      cat: q.cat,
      q: q.q,
      opts: q.opts
    }));

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'trivia', ?, ?, 'active', ?, ?)
    `).run(sessionId, user.id, tierKey, JSON.stringify({ answers, tier: tierKey }), now, now + 5 * 60 * 1000);

    return res.json({
      sessionId,
      questions: clientQuestions
    });
  }

  const expansionGames = ['whack', 'memory', 'runner', 'beat', 'paddle'];
  if (expansionGames.includes(game)) {
    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, '{}', 'active', ?, ?)
    `).run(sessionId, user.id, game, mode, now, now + 10 * 60 * 1000);

    return res.json({ sessionId, game, mode });
  }

  return res.status(400).json({ error: 'Jenis game tidak dikenali.' });
});

// ==========================================
// 3. SELESAIKAN SESI GAME
// ==========================================
gameRouter.post('/arena/session/finish', async (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { sessionId, result = {} } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Session ID wajib disertakan.' });

  const session = db.prepare('SELECT * FROM arcade_sessions WHERE id = ? AND user_id = ?').get(sessionId, user.id);
  if (!session) return res.status(404).json({ error: 'Sesi permainan tidak ditemukan.' });
  if (session.status !== 'active') return res.status(400).json({ error: 'Sesi ini sudah selesai atau sudah diklaim.' });

  const now = Date.now();
  if (now > session.expires_at) {
    db.prepare("UPDATE arcade_sessions SET status = 'expired' WHERE id = ?").run(sessionId);
    return res.status(400).json({ error: 'Sesi permainan sudah kedaluwarsa.' });
  }

  const elapsedMs = now - session.created_at;
  const payload = JSON.parse(session.payload || '{}');
  const today = todayWib();

  let pscEarned = 0;
  let xpEarned = 0;
  let resultText = '';
  let statsInc = { gamesPlayed: 1 };
  let newBest = null;
  let announceGroup = '';

  const runTx = db.transaction(() => {
    db.prepare("UPDATE arcade_sessions SET status = 'finished' WHERE id = ?").run(sessionId);

    if (session.game === 'fish') {
      const curFishToday = user.fish_date === today ? (user.fish_today || 0) : 0;
      const nextFishToday = curFishToday + 1;

      db.prepare(`
        UPDATE users
        SET fish_date = ?, fish_today = ?, fish_count = fish_count + 1
        WHERE id = ?
      `).run(today, nextFishToday, user.id);

      if (nextFishToday >= 6) {
        db.prepare('UPDATE arcade_profiles SET last_fish_batch_at = ? WHERE user_id = ?').run(now, user.id);
      }

      if (!result.caught) {
        xpEarned = 6;
        resultText = 'Yah, ikannya lepas! Tarikan kurang pas. (+6 Arcade XP)';
        return;
      }

      const { fish, weight } = payload;
      xpEarned = fish.xp;
      statsInc.itemsGot = 1;

      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'fish', ?, ?, ?, ?, ?, 0, ?)
      `).run(user.id, fish.key, fish.name, fish.rarity, weight, fish.price, now);

      resultText = `🎣 Dapat ${fish.name} [${fish.rarity}] seberat ${weight} kg! Nilai jual: ${fish.price} PSC (+${xpEarned} XP)`;

      if (fish.rarity === 'Legendary' || fish.rarity === 'Mythic') {
        announceGroup =
          `🎣 <b>TANGKAPAN ${fish.rarity.toUpperCase()}!</b>\n` +
          `<b>${escHtml(user.name)}</b> baru aja narik <b>${escHtml(fish.name)} (${weight} kg)</b> di Mancing Galatama!`;
      }
    }

    else if (session.game === 'scratch') {
      if (user.scratched_date === today) {
        throw new Error('Kartu hari ini sudah diklaim.');
      }
      const { prize } = payload;
      const capped = clampDailyPsc(user.id, prize.psc || 0);
      pscEarned = capped.awarded;
      xpEarned = prize.xp || 20;
      if (pscEarned > 0) statsInc.pscEarnedToday = pscEarned;

      db.prepare('UPDATE users SET scratched_date = ?, psc = psc + ? WHERE id = ?').run(today, pscEarned, user.id);
      resultText = `🎟️ Kartu terbuka: +${pscEarned} PSC (+${xpEarned} Arcade XP)` + (capped.capped ? ' [Limit harian tercapai]' : '');
    }

    else if (session.game === 'claw') {
      const targetCenter = Number(result.targetPos ?? 50);
      const accuracy = Math.max(0, 1 - (Math.abs(Number(result.dropPos ?? 50) - targetCenter) / 45));
      const success = accuracy >= 0.45 && Math.random() <= (payload.grabSuccessRate || 0.7);

      if (!success) {
        xpEarned = 8;
        resultText = '🕹️ Capit meleset! Barang jatuh lagi ke dalam kotak. (+8 XP)';
        return;
      }

      const { item } = payload;
      const capped = clampDailyPsc(user.id, item.price);
      const effectiveSellPrice = capped.awarded;
      xpEarned = item.xp;
      statsInc.itemsGot = 1;

      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'claw', ?, ?, ?, 0, ?, 0, ?)
      `).run(user.id, item.key, item.name, item.rarity, effectiveSellPrice, now);

      resultText = effectiveSellPrice > 0
        ? `🕹️ Mantap! Berhasil nyapit ${item.name} [${item.rarity}]! Nilai jual: ${effectiveSellPrice} PSC (+${xpEarned} XP)`
        : `🕹️ Dapat koleksi ${item.name} [${item.rarity}]! (+${xpEarned} XP · Kuota 120 PSC/hari sudah penuh)`;
    }

    else if (session.game === 'react') {
      const avgMs = Math.round(Number(result.avgMs) || 0);
      if (avgMs < 110 || avgMs > 5000) {
        throw new Error('Skor refleks tidak valid atau terdeteksi anomali.');
      }

      const tier = result.tier || session.mode || 'classic';
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, 'react', ?, ?, ?)
      `).run(user.id, user.name, tier, avgMs, now);

      newBest = { game: 'react', score: avgMs };
      const mult = tier === 'nightmare' ? 2.2 : tier === 'bo5' ? 1.5 : 1;
      xpEarned = Math.round((avgMs <= 260 ? 32 : avgMs <= 340 ? 22 : 14) * mult);
      const rawPsc = avgMs <= 250 ? Math.round(6 * mult) : avgMs <= 320 ? Math.round(3 * mult) : 1;
      const capped = clampDailyPsc(user.id, rawPsc);
      pscEarned = capped.awarded;
      if (pscEarned > 0) {
        statsInc.pscEarnedToday = pscEarned;
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }
      resultText = `⚡ Rata-rata refleks (${tier.toUpperCase()}): ${avgMs} ms! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }

    else if (session.game === 'trivia') {
      const userAnswers = Array.isArray(result.answers) ? result.answers : [];
      const correctAnswers = payload.answers || [];
      const tier = payload.tier || session.mode || 'medium';
      let correctCount = 0;
      let maxCombo = 0;
      let curCombo = 0;

      for (let i = 0; i < correctAnswers.length; i++) {
        if (Number(userAnswers[i]) === Number(correctAnswers[i])) {
          correctCount++;
          curCombo++;
          if (curCombo > maxCombo) maxCombo = curCombo;
        } else {
          curCombo = 0;
        }
      }

      statsInc.triviaCorrect = correctCount;
      const tierMult = tier === 'hard' ? 2.0 : tier === 'medium' ? 1.4 : 1.0;
      xpEarned = Math.round((correctCount * 12 + maxCombo * 5) * tierMult);
      const rawPsc = correctCount >= 4 ? Math.round(8 * tierMult) : correctCount >= 2 ? Math.round(4 * tierMult) : 0;
      const capped = clampDailyPsc(user.id, rawPsc);
      pscEarned = capped.awarded;

      if (pscEarned > 0) {
        statsInc.pscEarnedToday = pscEarned;
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }

      const finalScore = Math.round((correctCount * 100 + maxCombo * 20) * tierMult);
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, 'trivia', ?, ?, ?)
      `).run(user.id, user.name, tier, finalScore, now);

      newBest = { game: 'trivia', score: finalScore };
      resultText = `🧠 Benar ${correctCount}/${correctAnswers.length} soal [${tier.toUpperCase()}] (Combo ${maxCombo}x)! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }

    else {
      if (elapsedMs < 3000) {
        throw new Error('Durasi permainan terlalu singkat.');
      }
      const tier = result.tier || session.mode || 'medium';
      const tierMult = tier === 'hard' ? 1.8 : tier === 'medium' ? 1.3 : 1.0;
      const cleanScore = Math.max(0, Math.min(99999, Math.round(Number(result.score) || 0)));
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user.id, user.name, session.game, tier, cleanScore, now);

      newBest = { game: session.game, score: cleanScore };
      xpEarned = Math.min(70, Math.max(12, Math.round((cleanScore / 18) * tierMult)));
      const rawPsc = cleanScore >= 220 ? Math.round(8 * tierMult) : cleanScore >= 100 ? Math.round(4 * tierMult) : 1;
      const capped = clampDailyPsc(user.id, rawPsc);
      pscEarned = capped.awarded;

      if (pscEarned > 0) {
        statsInc.pscEarnedToday = pscEarned;
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }
      resultText = `🎮 Skor [${tier.toUpperCase()}]: ${cleanScore}! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }
  });

  try {
    runTx();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const updatedProfile = updateArcadeProgress(user.id, {
    addXp: xpEarned,
    statsInc,
    newBest
  });

  if (announceGroup) {
    broadcastToTelegram({
      target: 'group',
      text: announceGroup,
      buttonText: '🎣 IKUT MANCING',
      startParam: 'arena',
      feedText: `${user.name} narik tangkapan langka di Mancing Galatama!`
    }).catch(() => {});
  }

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    resultText,
    pscEarned,
    xpEarned,
    dailyPscEarned: Number(updatedProfile.dailyStats.pscEarnedToday || 0),
    dailyPscCap: DAILY_PSC_CAP,
    profile: updatedProfile,
    user: formatUser(freshUser)
  });
});

// ==========================================
// 4. JUAL ITEM KOLEKSI (TERIKAT KUOTA 120 PSC/HARI)
// ==========================================
gameRouter.post('/arena/fish/sell', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { collectionId } = req.body || {};
  const item = db.prepare(`
    SELECT * FROM arcade_collections
    WHERE id = ? AND user_id = ? AND is_sold = 0
  `).get(Number(collectionId), user.id);

  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan atau sudah dijual.' });
  if (!item.sell_price || item.sell_price <= 0) {
    return res.status(400).json({ error: 'Item koleksi spesial ini tidak bisa dijual.' });
  }

  const capped = clampDailyPsc(user.id, item.sell_price);
  if (capped.awarded <= 0) {
    return res.status(400).json({ error: `Limit harian ${DAILY_PSC_CAP} PSC sudah penuh! Simpan itemnya di tas & jual besok.` });
  }

  const payout = capped.awarded;
  const sellTx = db.transaction(() => {
    db.prepare('UPDATE arcade_collections SET is_sold = 1 WHERE id = ?').run(item.id);
    db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(payout, user.id);
  });
  sellTx();

  const updatedProfile = updateArcadeProgress(user.id, {
    statsInc: { pscEarnedToday: payout }
  });

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    message: capped.capped
      ? `Berhasil jual ${item.name} sebesar +${payout} PSC (menyesuaikan sisa kuota harian ${DAILY_PSC_CAP} PSC)!`
      : `Berhasil jual ${item.name} seharga +${payout} PSC!`,
    dailyPscEarned: Number(updatedProfile.dailyStats.pscEarnedToday || 0),
    dailyPscCap: DAILY_PSC_CAP,
    user: formatUser(freshUser)
  });
});

// ==========================================
// 5. ARCADE PASS & DAILY QUEST CLAIM
// ==========================================
gameRouter.post('/arena/pass/claim', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const targetLevel = Number(req.body?.level);
  const milestone = PASS_MILESTONES.find(m => m.level === targetLevel);
  if (!milestone) return res.status(400).json({ error: 'Milestone level tidak valid.' });

  const profile = getOrCreateArcadeProfile(user.id);
  if (profile.level < targetLevel) {
    return res.status(400).json({ error: `Level Arcade kamu belum mencapai Level ${targetLevel}.` });
  }
  if (profile.claimedPass.includes(targetLevel)) {
    return res.status(400).json({ error: 'Hadiah level ini sudah pernah diklaim.' });
  }

  const nextClaimed = [...profile.claimedPass, targetLevel];
  const passTx = db.transaction(() => {
    db.prepare('UPDATE arcade_profiles SET claimed_pass = ? WHERE user_id = ?')
      .run(JSON.stringify(nextClaimed), user.id);

    if (milestone.type === 'psc') {
      db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(milestone.amount, user.id);
    } else if (milestone.type === 'collectible') {
      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'pass', ?, ?, ?, 0, 0, 0, ?)
      `).run(user.id, milestone.key, milestone.name, milestone.rarity, Date.now());
    }
  });
  passTx();

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    message: `Hadiah Arcade Pass Lv.${targetLevel} (${milestone.label}) berhasil diklaim!`,
    profile: getOrCreateArcadeProfile(user.id),
    user: formatUser(freshUser)
  });
});

gameRouter.post('/arena/quest/claim', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { questId } = req.body || {};
  const quest = DAILY_QUESTS_DEF.find(q => q.id === questId);
  if (!quest) return res.status(400).json({ error: 'Quest tidak ditemukan.' });

  const profile = getOrCreateArcadeProfile(user.id);
  const progress = profile.dailyStats[quest.statKey] || 0;
  if (progress < quest.target) {
    return res.status(400).json({ error: 'Syarat quest belum selesai.' });
  }
  if (profile.claimedQuests.includes(quest.id)) {
    return res.status(400).json({ error: 'Quest ini sudah diklaim hari ini.' });
  }

  const nextClaimed = [...profile.claimedQuests, quest.id];
  const questTx = db.transaction(() => {
    db.prepare('UPDATE arcade_profiles SET claimed_quests = ? WHERE user_id = ?')
      .run(JSON.stringify(nextClaimed), user.id);
    db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(quest.psc, user.id);
  });
  questTx();

  const updatedProfile = updateArcadeProgress(user.id, { addXp: quest.xp });
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

  res.json({
    ok: true,
    message: `Quest "${quest.title}" selesai! +${quest.psc} PSC & +${quest.xp} Arcade XP.`,
    profile: updatedProfile,
    user: formatUser(freshUser)
  });
});

gameRouter.post('/game/play', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.status(400).json({ error: 'Silakan refresh Mini App untuk menggunakan Arena Gabut 2.0!' });
});

gameRouter.post('/game/score', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.status(400).json({ error: 'Silakan refresh Mini App untuk menggunakan Arena Gabut 2.0!' });
});

export default gameRouter;
