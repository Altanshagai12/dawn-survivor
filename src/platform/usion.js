const STORAGE_KEY = 'dawn-survivor-profile-v1';

function localAdapter() {
  return {
    embedded: false,
    config: { language: navigator.language?.startsWith('mn') ? 'mn' : 'en', theme: 'dark' },
    async loadProfile() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
    },
    async saveProfile(profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    },
    async submitScore(score) {
      const best = Math.max(score, Number(localStorage.getItem('dawn-best') || 0));
      localStorage.setItem('dawn-best', String(best));
      return { success: true, score, best, rank: null, updated: score >= best };
    },
    async friends() { return []; },
    releaseBack() {},
  };
}

export async function initPlatform() {
  if (!window.Usion?.init) return localAdapter();
  try {
    const config = await window.Usion.init({ timeout: 5000 });
    return {
      embedded: true,
      config,
      async loadProfile() {
        try { return await window.Usion.storage.get(STORAGE_KEY); } catch { return null; }
      },
      async saveProfile(profile) {
        try { await window.Usion.storage.set(STORAGE_KEY, profile); return true; } catch { return false; }
      },
      async submitScore(score, metadata) {
        try { return await window.Usion.leaderboard.submit(score, metadata); } catch { return null; }
      },
      async friends() {
        try { return await window.Usion.leaderboard.friends({ limit: 5 }); } catch { return []; }
      },
      releaseBack() { window.Usion.releaseBackButton?.(); },
    };
  } catch {
    return localAdapter();
  }
}

export function defaultProfile() {
  return {
    selectedHero: 'nyra', selectedWeapon: 'revolver', best: 0,
    runs: 0, wins: 0, totalKills: 0,
  };
}
