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

const WEAPON_ICONS = {
  revolver: '<path d="M4 10h18v5H4zm8 5h10l5 4h-9l-1 7h-6z"/>',
  shotgun: '<path d="M3 8h25v4H3zm1 6h23v4H4zm15 4 7 6h-7l-6-6z"/>',
  crossbow: '<path d="M4 16h24M16 5v22M7 9q9 13 18 0M7 9q9-7 18 0" fill="none" stroke="currentColor" stroke-width="3"/>',
  flame: '<path d="M4 12h18v9H4zm18 2h6v5h-6zM8 21h11v5H8zM3 8c3-5 7-3 6 1-2-2-3 1-6-1z"/>',
};

export function weaponIconSvg(id) {
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${WEAPON_ICONS[id] || WEAPON_ICONS.revolver}</svg>`;
}

export function upgradeIconHtml(card) {
  if (!Number.isInteger(card.iconFrame)) {
    return `<b class="choice-card__icon" aria-hidden="true">${card.icon || '✦'}</b>`;
  }
  const x = card.iconFrame % 10 / 9 * 100;
  const y = Math.floor(card.iconFrame / 10) / 9 * 100;
  return `<b class="choice-card__icon choice-card__icon--atlas" aria-hidden="true" style="background-position:${x}% ${y}%"></b>`;
}

export function upgradePathHtml(card, owned = new Set()) {
  if (!Number.isInteger(card.iconFrame) || !card.tree) return '';
  const nodeIds = card.treeNodes || [];
  if (!nodeIds.length) return '';
  const firstFrame = card.iconFrame - nodeIds.indexOf(card.id);
  const icons = nodeIds.map((nodeId, index) => {
    const frame = firstFrame + index;
    const x = frame % 10 / 9 * 100;
    const y = Math.floor(frame / 10) / 9 * 100;
    const status = nodeId === card.id ? ' current' : owned.has(nodeId) ? ' owned' : '';
    return `<i class="choice-card__path-icon${status}" style="background-position:${x}% ${y}%"></i>`;
  }).join('');
  return `<span class="choice-card__path" aria-hidden="true">${icons}</span>`;
}

export class UIController {
  constructor({ heroes, weapons, i18n, profile }) {
    this.heroes = heroes;
    this.weapons = weapons;
    this.i18n = i18n;
    this.profile = profile;
    this.selectedHero = savedOrDefault(heroes, profile.selectedHero, 'shana');
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
      'hero-list','weapon-list','hero-stat','hero-description','weapon-stat','weapon-description','movement-description','start-button','pause-button',
      'resume-button','quit-button','again-button','menu-button','choice-list','choice-kicker',
      'choice-title','choice-detail','choice-detail-icon','choice-detail-tree','choice-detail-name',
      'choice-detail-description','choice-detail-path','choice-confirm','reroll-button','hearts','timer','boss-bar','boss-name','boss-fill',
      'xp-fill','level','ammo','result-kicker','result-title','result-score',
      'result-kills','result-level','result-cause','friends-board','damage-source','toast',
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
    this.el['hero-description'].textContent = heroPassiveCopy(hero, this.i18n.lang);
    this.el['weapon-stat'].textContent = `DMG ${weapon.damage} · RATE ${weapon.fireRate.toFixed(1)} · ${weapon.projectiles}× · ${weapon.magazine} RDS · ${weapon.reload.toFixed(1)}s`;
    this.el['weapon-description'].textContent = this.i18n.lang === 'mn'
      ? weapon.descriptionMn : weapon.description;
    this.el['movement-description'].textContent = movementCopy(this.i18n.lang);
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
    this.el['damage-source'].classList.add('hidden');
    if (matchMedia('(pointer: coarse)').matches) this.el['touch-controls'].classList.remove('hidden');
  }

  updateHud(state, remaining) {
    const hearts = [];
    for (let index = 0; index < state.maxHp; index += 1) hearts.push(index < state.hp ? '♥' : '♡');
    for (let index = 0; index < (state.soulHearts || 0); index += 1) hearts.push('♦');
    if (state.shieldReady) hearts.push('◈');
    this.el.hearts.textContent = hearts.join('');
    const seconds = Math.max(0, Math.ceil(remaining));
    this.el.timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    this.el['xp-fill'].style.width = `${Math.min(100, state.xp / state.xpNext * 100)}%`;
    this.el.level.textContent = `LV ${state.level}`;
    this.el.ammo.textContent = `${state.ammo} / ${state.magazine}`;
  }

  showBoss(boss) {
    if (!boss) { this.el['boss-bar'].classList.add('hidden'); return; }
    this.el['boss-bar'].classList.remove('hidden');
    this.el['boss-name'].textContent = (boss.enemyDef?.name || boss.name || 'BOSS').toUpperCase();
    this.el['boss-fill'].style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`;
  }

  choose(cards, { rewardType = 'level', canReroll = false, owned = new Set() } = {}) {
    const chest = rewardType === 'chest';
    const tome = rewardType === 'tome';
    this.el['choice-kicker'].textContent = tome ? 'BOSS TOME' : chest ? 'BOSS CHEST' : 'LEVEL UP';
    this.el['choice-title'].textContent = tome ? 'Choose a forbidden Tome'
      : chest ? 'Claim one eligible upgrade' : this.i18n.t('chooseUpgrade');
    let selectedIndex = 0;
    const copyFor = (card) => ({
      name: this.i18n.lang === 'mn' && card.nameMn ? card.nameMn : card.name,
      desc: this.i18n.lang === 'mn' && card.descMn ? card.descMn : card.desc,
      tree: this.i18n.lang === 'mn' && card.treeLabelMn ? card.treeLabelMn : card.treeLabel,
    });
    const tabs = cards.map((card, index) => {
      const button = document.createElement('button');
      const { name, desc } = copyFor(card);
      button.type = 'button';
      button.className = `choice-tab${index === 0 ? ' selected' : ''}`;
      button.innerHTML = `${upgradeIconHtml(card)}<span>${name}</span>`;
      button.setAttribute('aria-label', `${name}. ${desc}`);
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      button.setAttribute('aria-posinset', String(index + 1));
      button.setAttribute('aria-setsize', String(cards.length));
      return button;
    });
    const renderSelection = (index) => {
      selectedIndex = index;
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.classList.toggle('selected', selected);
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      const card = cards[index];
      const { name, desc, tree } = copyFor(card);
      this.el['choice-detail-icon'].innerHTML = upgradeIconHtml(card);
      this.el['choice-detail-tree'].textContent = tree || (tome ? 'TOME' : chest ? 'BOSS REWARD' : 'UPGRADE');
      this.el['choice-detail-name'].textContent = name;
      this.el['choice-detail-description'].textContent = desc;
      this.el['choice-detail-path'].innerHTML = upgradePathHtml(card, owned);
    };
    tabs.forEach((tab, index) => tab.addEventListener('click', () => renderSelection(index)));
    this.el['choice-list'].style?.setProperty('--choice-count', String(Math.max(1, Math.min(5, cards.length))));
    this.el['choice-list'].replaceChildren(...tabs);
    renderSelection(0);
    this.el['choice-modal'].classList.remove('hidden');
    this.el['reroll-button'].classList.toggle('hidden', !canReroll);
    this.el['choice-confirm'].textContent = rewardType === 'level'
      ? (this.i18n.lang === 'mn' ? 'СОНГОХ' : 'CHOOSE') : 'CLAIM';
    return new Promise((resolve) => {
      this.el['choice-confirm'].onclick = () => {
        this.el['choice-modal'].classList.add('hidden');
        resolve({ card: cards[selectedIndex], reroll: false });
      };
      this.el['reroll-button'].onclick = () => {
        this.el['choice-modal'].classList.add('hidden');
        resolve({ card: null, reroll: true });
      };
    });
  }

  showPause() { this.el['pause-modal'].classList.remove('hidden'); }
  hidePause() { this.el['pause-modal'].classList.add('hidden'); }

  showDamageSource(source) {
    const prefix = this.i18n.lang === 'mn' ? 'ОНОГДЛОО' : 'HIT';
    this.el['damage-source'].textContent = `${prefix} · ${damageSourceLabel(source, this.i18n.lang)}`;
    this.el['damage-source'].classList.remove('hidden');
    clearTimeout(this.damageSourceTimer);
    this.damageSourceTimer = setTimeout(() => this.el['damage-source'].classList.add('hidden'), 1100);
  }

  showResult(result, friends = []) {
    this.hideAll();
    this.el['result-modal'].classList.remove('hidden');
    this.el['result-kicker'].textContent = result.won ? 'DAWN REACHED' : 'THE NIGHT CLAIMED YOU';
    this.el['result-title'].textContent = result.won ? 'You survived.' : 'Rise again.';
    this.el['result-score'].textContent = result.score.toLocaleString();
    this.el['result-kills'].textContent = result.kills.toLocaleString();
    this.el['result-level'].textContent = result.level;
    const causePrefix = this.i18n.lang === 'mn' ? 'ЯЛАГДСАН ШАЛТГААН' : 'DEFEATED BY';
    this.el['result-cause'].textContent = !result.won && result.damageSource
      ? `${causePrefix} · ${damageSourceLabel(result.damageSource, this.i18n.lang)}` : '';
    this.el['result-cause'].classList.toggle('hidden', !this.el['result-cause'].textContent);
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
