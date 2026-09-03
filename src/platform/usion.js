const STORAGE_KEY = 'dawn-survivor-profile-v1';
const LOCAL_RECORD_KEY = 'dawn-best-survival-ms-v1';

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
      const previous = Number(localStorage.getItem(LOCAL_RECORD_KEY) || 0);
      const best = Math.max(score, previous);
      localStorage.setItem(LOCAL_RECORD_KEY, String(best));
      return { success: true, score, best, rank: null, updated: score > previous };
    },
    async friends() { return []; },
    async hasCredits() { return false; },
    getAuthToken() { return null; },
    async requestPayment() { throw new Error('Usion wallet is unavailable outside the host'); },
    releaseBack() {},
  };
}

export async function initPlatform() {
  if (!window.Usion?.init) return localAdapter();
  const local = localAdapter();
  let config = null;
  // A slow host can deliver its first INIT after the promise times out.
  // Keep this adapter alive; the SDK still invokes the callback on late INIT.
  try { await window.Usion.init((next) => { config = next; }, { timeout: 5000 }); } catch {}
  return {
    get embedded() { return Boolean(config?.serviceId); },
    get config() { return config || local.config; },
    awaitingHost: window.parent !== window || Boolean(window.ReactNativeWebView),
    getAuthToken() { return window.Usion.user?.getToken?.() || window.Usion.config?.authToken || null; },
    async loadProfile() {
      if (!this.embedded) return local.loadProfile();
      try { return await window.Usion.storage.get(STORAGE_KEY); } catch { return null; }
    },
    async saveProfile(profile) {
      if (!this.embedded) return local.saveProfile(profile);
      try { await window.Usion.storage.set(STORAGE_KEY, profile); return true; } catch { return false; }
    },
    async submitScore(score, metadata) {
      if (!this.embedded) return local.submitScore(score);
      try { return await window.Usion.leaderboard.submit(score, metadata); } catch { return null; }
    },
    async friends() {
      if (!this.embedded) return local.friends();
      try { return await window.Usion.leaderboard.friends({ limit: 5 }); } catch { return []; }
    },
    async hasCredits(amount) {
      try { return await window.Usion.wallet.hasCredits(amount); } catch { return false; }
    },
    async requestPayment(amount, reason, options) {
      return window.Usion.wallet.requestPayment(amount, reason, options);
    },
    releaseBack() { window.Usion.releaseBackButton?.(); },
  };
}

export function defaultProfile() {
  return {
    selectedHero: 'shana', selectedWeapon: 'revolver', best: 0, bestSurvivalMs: 0,
    runs: 0, wins: 0, totalKills: 0, ownedSkins: [], equippedSkins: {}, pendingSkinPurchase: null,
  };
}
