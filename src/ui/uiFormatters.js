import { FIRING_MOVE_MULTIPLIER } from '../game/movement.js?build=20260825r';

const DAMAGE_SOURCE_LABELS = {
  'enemy-contact': { en: 'ENEMY CONTACT', mn: 'ДАЙСНЫ МӨРГӨЛТ' },
  'enemy-projectile': { en: 'ENEMY SHOT', mn: 'ДАЙСНЫ СУМ' },
  'bomber-contact': { en: 'BOMBER', mn: 'ТЭСРЭГЧ ДАЙСАН' },
  'tree-contact': { en: 'TREE ROOT', mn: 'МОДНЫ ҮНДЭС' },
  'barrier-contact': { en: 'ELECTRIC BARRIER', mn: 'ЦАХИЛГААН ХААЛТ' },
  unknown: { en: 'UNKNOWN', mn: 'ҮЛ МЭДЭГДЭХ' },
};

export function damageSourceLabel(source, language = 'en') {
  return (DAMAGE_SOURCE_LABELS[source] || DAMAGE_SOURCE_LABELS.unknown)[language === 'mn' ? 'mn' : 'en'];
}

export function savedOrDefault(collection, saved, fallback) {
  return collection[saved] ? saved : fallback;
}

export function heroPassiveCopy(hero, language = 'en') {
  const passive = language === 'mn' ? hero.passiveMn : hero.passiveText;
  return `${language === 'mn' ? 'ХУВИЙН ЧАДВАР' : 'PERSONAL SKILL'} · ${passive}`;
}

export function movementCopy(language = 'en') {
  const firingPercent = Math.round(FIRING_MOVE_MULTIPLIER * 100);
  return language === 'mn'
    ? `ХӨДӨЛГӨӨН · Энгийн гүйлт 100% · Буудаж гүйх ${firingPercent}% · Run and Gun авбал 100%`
    : `MOVEMENT · Running 100% · Running while firing ${firingPercent}% · Run and Gun restores 100%`;
}

export function formatSurvivalTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function leaderboardDurationMs(entry) {
  const metadata = entry?.metadata || {};
  const candidate = entry?.duration_ms ?? metadata.duration_ms ?? metadata.survivalMs
    ?? (metadata.metric === 'survival_ms' ? entry?.score : null);
  if (candidate == null || typeof candidate === 'boolean') return null;
  const value = Number(candidate);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export function survivalLeaderboardEntries(entries = []) {
  return entries.flatMap((entry) => {
    const durationMs = leaderboardDurationMs(entry);
    return durationMs == null ? [] : [{ entry, durationMs }];
  });
}
