/**
 * scripts/test-cloud-sync.js
 * Test mergeProgress logic for counters, collections, completion maps, and timestamps.
 */

const { mergeProgress } = await import('../js/cloud-sync.js');

console.log('--- Testing mergeProgress ---');

const deviceA = {
  v: 1,
  xp: 120,
  stars: 5,
  streak: 2,
  cards: ['card_orion', 'card_pleiades'],
  done: { 'quest_1': true, 'quest_2': true },
  achievements: { 'star_gazer': true },
  avatar: 'owl',
  _ts: 1000
};

const deviceB = {
  v: 1,
  xp: 180,
  stars: 8,
  streak: 4,
  cards: ['card_orion', 'card_sirius'],
  done: { 'quest_2': true, 'quest_3': true },
  achievements: { 'night_owl': true },
  avatar: 'fox',
  _ts: 2000
};

const merged = mergeProgress(deviceA, deviceB);
console.log('Merged output:', merged);

// 1. Max for counters
if (merged.xp !== 180 || merged.stars !== 8 || merged.streak !== 4) {
  console.error('FAIL: Counter max merge failed');
  process.exit(1);
}

// 2. Union for collections
const expectedCards = ['card_orion', 'card_pleiades', 'card_sirius'];
if (merged.cards.length !== 3 || !expectedCards.every(c => merged.cards.includes(c))) {
  console.error('FAIL: Collection union merge failed');
  process.exit(1);
}

// 3. Union/merge for done and achievements
if (!merged.done['quest_1'] || !merged.done['quest_2'] || !merged.done['quest_3']) {
  console.error('FAIL: Done quests map merge failed');
  process.exit(1);
}
if (!merged.achievements['star_gazer'] || !merged.achievements['night_owl']) {
  console.error('FAIL: Achievements map merge failed');
  process.exit(1);
}

// 4. Newer write wins for avatar
if (merged.avatar !== 'fox') {
  console.error('FAIL: Newer write avatar failed');
  process.exit(1);
}

// 5. Timestamp updated
if (!merged._ts || merged._ts < 2000) {
  console.error('FAIL: Timestamp update failed');
  process.exit(1);
}

console.log('✔ All mergeProgress tests passed successfully.');
