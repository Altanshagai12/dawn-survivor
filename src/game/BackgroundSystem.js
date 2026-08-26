import { cameraCompensatedViewport } from './deviceProfile.js?build=20260826d';

export function createCameraFittedBackground(scene, texture, zoom) {
  const fit = (width, height) => {
    const size = cameraCompensatedViewport(width, height, zoom);
    return { x: width / 2, y: height / 2, ...size };
  };
  const initial = fit(scene.scale.width, scene.scale.height);
  const sprite = scene.add.tileSprite(
    initial.x, initial.y, initial.width, initial.height, texture,
  ).setOrigin(.5).setScrollFactor(0).setDepth(0);
  const resize = ({ width, height }) => {
    const next = fit(width, height);
    sprite.setPosition(next.x, next.y).setSize(next.width, next.height);
  };
  return { sprite, resize };
}
