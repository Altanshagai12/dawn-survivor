export function handleSpecialKill(scene, definition, source = {}) {
  if (definition.boss) return;
  const state = scene.state;
  if (state.flags.killClip) state.killClipStacks += 1;
  if (source.burn) {
    state.burnKills += 1;
    const threshold = state.hero.id === 'sola' ? 60 : 80;
    if (state.flags.burnHeal && state.burnKills % threshold === 0) {
      state.heal(1);
      scene.flashEffect(scene.player.x, scene.player.y, 5, .8);
    }
  }
  if (source.curse) {
    state.curseKills += 1;
    if (state.flags.ritual && state.curseKills % 10 === 0) state.ritualDamageMul = (state.ritualDamageMul || 0) + .01;
  }
  if (source.smite) {
    state.smiteKills += 1;
    if (state.smiteKills % 500 === 0) {
      if (state.flags.smiteMaxHp && (state.smiteMaxHpGains || 0) < 3) {
        state.smiteMaxHpGains = (state.smiteMaxHpGains || 0) + 1;
        state.maxHp += 1;
        state.hp += 1;
      }
      if (state.flags.smiteHeal) state.heal(1);
    }
  }
  if (source.summon) {
    state.summonKills += 1;
    if (state.summonKills % 500 === 0) {
      if (state.flags.summonSoulDrain) state.addSoulHeart();
      if (state.flags.summonHeal) state.heal(1);
    }
  }
}
