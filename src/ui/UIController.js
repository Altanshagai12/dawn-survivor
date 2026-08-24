export function savedOrDefault(collection, saved, fallback) {
  return collection[saved] ? saved : fallback;
}

const WEAPON_ICONS = {
  revolver: '<path d="M4 10h18v5H4zm8 5h10l5 4h-9l-1 7h-6z"/>',
  shotgun: '<path d="M3 8h25v4H3zm1 6h23v4H4zm15 4 7 6h-7l-6-6z"/>',
  crossbow: '<path d="M4 16h24M16 5v22M7 9q9 13 18 0M7 9q9-7 18 0" fill="none" stroke="currentColor" stroke-width="3"/>',
  flame: '<path d="M4 12h18v9H4zm18 2h6v5h-6zM8 21h11v5H8zM3 8c3-5 7-3 6 1-2-2-3 1-6-1z"/>',
};

export function weaponIconSvg(id) {
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${WEAPON_ICONS[id] || WEAPON_ICONS.revolver}</svg>`;
}

export class UIController {
  constructor({ heroes, weapons, i18n, profile }) {
    this.heroes = heroes;
    this.weapons = weapons;
    this.i18n = i18n;
    this.profile = profile;
    this.selectedHero = savedOrDefault(heroes, profile.selectedHero, 'nyra');
    this.selectedWeapon = savedOrDefault(weapons, profile.selectedWeapon, 'revolver');
    this.onStart = null;
    this.onPause = null;
    this.onResume = null;
    this.onQuit = null;
    this.cacheElements();
    this.bindButtons();
    this.renderLoadout();
  }

  cacheElements() {
    const ids = [
      'boot','menu','hud','choice-modal','pause-modal','result-modal','touch-controls',
      'hero-list','weapon-list','hero-stat','weapon-stat','weapon-description','start-button','pause-button',
      'resume-button','quit-button','again-button','menu-button','choice-list','choice-kicker',
      'choice-title','reroll-button','hearts','timer','boss-bar','boss-name','boss-fill',
      'xp-fill','level','ammo','reload-fill','reload-state','result-kicker','result-title','result-score',
      'result-kills','result-level','friends-board','toast',
    ];
    this.el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  }

  bindButtons() {
    this.el['start-button'].addEventListener('click', () => this.onStart?.(this.selection()));
    this.el['pause-button'].addEventListener('click', () => this.onPause?.());
    this.el['resume-button'].addEventListener('click', () => this.onResume?.());
    this.el['quit-button'].addEventListener('click', () => this.onQuit?.());
    this.el['again-button'].addEventListener('click', () => this.onStart?.(this.selection()));
    this.el['menu-button'].addEventListener('click', () => this.showMenu());
  }

  selection() {
    return { heroId: this.selectedHero, weaponId: this.selectedWeapon };
  }

  renderLoadout() {
    this.el['hero-list'].replaceChildren(...Object.values(this.heroes).map((hero) => {
      const button = document.createElement('button');
      button.className = `select-card${hero.id === this.selectedHero ? ' selected' : ''}`;
      button.innerHTML = `<img src="${hero.portrait}" alt=""/><span>${this.i18n.lang === 'mn' ? hero.nameMn : hero.name}</span>`;
      button.addEventListener('click', () => {
        this.selectedHero = hero.id;
        this.renderLoadout();
      });
      return button;
    }));
    this.el['weapon-list'].replaceChildren(...Object.values(this.weapons).map((weapon) => {
      const button = document.createElement('button');
      button.className = `select-card${weapon.id === this.selectedWeapon ? ' selected' : ''}`;
      button.dataset.weapon = weapon.id;
      button.title = weapon.description;
      button.innerHTML = `<b>${weaponIconSvg(weapon.id)}</b><span>${this.i18n.lang === 'mn' ? weapon.nameMn : weapon.name}</span>`;
      button.addEventListener('click', () => {
        this.selectedWeapon = weapon.id;
        this.renderLoadout();
      });
      return button;
    }));
    const hero = this.heroes[this.selectedHero];
    const weapon = this.weapons[this.selectedWeapon];
    this.el['hero-stat'].textContent = `♥ ${hero.hp} · SPD ${hero.speed}`;
    this.el['weapon-stat'].textContent = `DMG ${weapon.damage} · RATE ${weapon.fireRate.toFixed(1)} · ${weapon.projectiles}× · ${weapon.magazine} RDS · ${weapon.reload.toFixed(1)}s`;
    this.el['weapon-description'].textContent = this.i18n.lang === 'mn'
      ? weapon.descriptionMn : weapon.description;
  }

  hideAll() {
    ['boot','menu','hud','choice-modal','pause-modal','result-modal','touch-controls']
      .forEach((id) => this.el[id].classList.add('hidden'));
  }

  showMenu() {
    this.hideAll();
    this.el.menu.classList.remove('hidden');
    this.renderLoadout();
  }

  showGame() {
    this.hideAll();
    this.el.hud.classList.remove('hidden');
    if (matchMedia('(pointer: coarse)').matches) this.el['touch-controls'].classList.remove('hidden');
  }

  updateHud(state, remaining) {
    const hearts = [];
    for (let index = 0; index < state.maxHp; index += 1) hearts.push(index < state.hp ? '♥' : '♡');
    if (state.shieldReady) hearts.push('◈');
    this.el.hearts.textContent = hearts.join('');
    const seconds = Math.max(0, Math.ceil(remaining));
    this.el.timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    this.el['xp-fill'].style.width = `${Math.min(100, state.xp / state.xpNext * 100)}%`;
    this.el.level.textContent = `LV ${state.level}`;
    this.el.ammo.textContent = `${state.ammo} / ${state.magazine}`;
    const reloadProgress = state.reloading
      ? Math.min(1, state.reloadProgress / Math.max(1, state.reloadMs)) : 0;
    const chargeProgress = state.weapon.chargeSeconds ? state.weaponCharge : 0;
    const meterProgress = state.reloading ? reloadProgress : chargeProgress;
    this.el['reload-fill'].style.width = `${meterProgress * 100}%`;
    this.el['reload-fill'].classList.toggle('charged', !state.reloading && chargeProgress >= 1);
    this.el['reload-state'].textContent = state.reloading
      ? `RELOADING ${Math.round(reloadProgress * 100)}%`
      : state.weapon.chargeSeconds ? `AIM CHARGE ${Math.round(chargeProgress * 100)}%` : '';
  }

  showBoss(boss) {
    if (!boss) { this.el['boss-bar'].classList.add('hidden'); return; }
    this.el['boss-bar'].classList.remove('hidden');
    this.el['boss-name'].textContent = (boss.enemyDef?.name || boss.name || 'BOSS').toUpperCase();
    this.el['boss-fill'].style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`;
  }

  choose(cards, { chest = false, canReroll = false } = {}) {
    this.el['choice-kicker'].textContent = chest ? 'BOSS CHEST' : 'LEVEL UP';
    this.el['choice-title'].textContent = chest ? 'Claim a hunter gift' : this.i18n.t('chooseUpgrade');
    this.el['choice-list'].replaceChildren(...cards.map((card) => {
      const button = document.createElement('button');
      button.className = 'choice-card';
      const name = this.i18n.lang === 'mn' && card.nameMn ? card.nameMn : card.name;
      const desc = this.i18n.lang === 'mn' && card.descMn ? card.descMn : card.desc;
      const treeLabel = this.i18n.lang === 'mn' && card.treeLabelMn ? card.treeLabelMn : card.treeLabel;
      button.innerHTML = `<b class="choice-card__icon" aria-hidden="true">${card.icon || '✦'}</b><em>${treeLabel || (chest ? 'HUNTER GIFT' : '')}</em><strong>${name}</strong><span class="choice-card__desc">${desc}</span>`;
      return button;
    }));
    this.el['choice-modal'].classList.remove('hidden');
    this.el['reroll-button'].classList.toggle('hidden', !canReroll);
    return new Promise((resolve) => {
      [...this.el['choice-list'].children].forEach((button, index) => {
        button.addEventListener('click', () => {
          this.el['choice-modal'].classList.add('hidden');
          resolve({ card: cards[index], reroll: false });
        }, { once: true });
      });
      this.el['reroll-button'].onclick = () => {
        this.el['choice-modal'].classList.add('hidden');
        resolve({ card: null, reroll: true });
      };
    });
  }

  showPause() { this.el['pause-modal'].classList.remove('hidden'); }
  hidePause() { this.el['pause-modal'].classList.add('hidden'); }

  showResult(result, friends = []) {
    this.hideAll();
    this.el['result-modal'].classList.remove('hidden');
    this.el['result-kicker'].textContent = result.won ? 'DAWN REACHED' : 'THE NIGHT CLAIMED YOU';
    this.el['result-title'].textContent = result.won ? 'You survived.' : 'Rise again.';
    this.el['result-score'].textContent = result.score.toLocaleString();
    this.el['result-kills'].textContent = result.kills.toLocaleString();
    this.el['result-level'].textContent = result.level;
    this.el['friends-board'].replaceChildren(...friends.map((entry) => {
      const row = document.createElement('div');
      row.className = 'friend-row';
      row.innerHTML = `<span>${entry.rank || '—'} · ${entry.name || 'Hunter'}</span><strong>${Number(entry.score || 0).toLocaleString()}</strong>`;
      return row;
    }));
  }

  toast(message, duration = 1700) {
    this.el.toast.textContent = message;
    this.el.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.el.toast.classList.add('hidden'), duration);
  }
}
