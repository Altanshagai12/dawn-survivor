import { COMBAT_TREES } from './upgrades/combat.js';
import { DEFENSE_TREES } from './upgrades/defense.js';
import { GENERAL_TREES } from './upgrades/general.js';
import { STATUS_TREES } from './upgrades/status.js';
import { SUMMON_TREES } from './upgrades/summons.js';

const specs = [
  ...COMBAT_TREES,
  ...SUMMON_TREES,
  ...STATUS_TREES,
  ...DEFENSE_TREES,
  ...GENERAL_TREES,
];

function makeTree([id, label, labelMn, rows], treeIndex) {
  return rows.map(([name, nameMn, desc, descMn, mods = {}, set = {}], index) => ({
    id: `${id}-${index + 1}`,
    tree: id,
    treeLabel: label,
    treeLabelMn: labelMn,
    tier: index === 0 ? 1 : index === 3 ? 3 : 2,
    iconFrame: treeIndex * 4 + index,
    name,
    nameMn,
    desc,
    descMn,
    mods,
    set,
    requires: index === 0 ? [] : [`${id}-1`],
    requiresAny: index === 3 ? [`${id}-2`, `${id}-3`] : [],
  }));
}

export const UPGRADE_TREES = specs.map(makeTree);
export const UPGRADES = UPGRADE_TREES.flat();

export function eligibleUpgrades(owned) {
  return UPGRADES.filter((upgrade) => !owned.has(upgrade.id)
    && upgrade.requires.every((id) => owned.has(id))
    && (!upgrade.requiresAny.length || upgrade.requiresAny.some((id) => owned.has(id))));
}
