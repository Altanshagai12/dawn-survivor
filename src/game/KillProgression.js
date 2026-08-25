export function handleSpecialKill(scene, definition) {
  if (!definition.boss && scene.state.flags.killClip) scene.state.killClipStacks += 1;
}
