import {
  LinearSRGBColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

export const LIVE_TEXTURE = {
  grassColor: "/textures/grass/Grass001_2K-JPG_Color.jpg",
  grassNormal: "/textures/grass/Grass001_2K-JPG_NormalGL.jpg",
  grassRoughness: "/textures/grass/Grass001_2K-JPG_Roughness.jpg",
  dirtColor: "/textures/dirt/Ground037_2K-JPG_Color.jpg",
  dirtNormal: "/textures/dirt/Ground037_2K-JPG_NormalGL.jpg",
  dirtRoughness: "/textures/dirt/Ground037_2K-JPG_Roughness.jpg",
  rockColor: "/textures/rock/Rock023_2K-JPG_Color.jpg",
  rockNormal: "/textures/rock/Rock023_2K-JPG_NormalGL.jpg",
  rockRoughness: "/textures/rock/Rock023_2K-JPG_Roughness.jpg",
  barkColor: "/textures/bark/Bark005_2K-JPG_Color.jpg",
  barkNormal: "/textures/bark/Bark005_2K-JPG_NormalGL.jpg",
  barkRoughness: "/textures/bark/Bark005_2K-JPG_Roughness.jpg",
} as const;

export function prepareLiveTexture(
  texture: Texture,
  repeat: number,
  isColor: boolean,
): void {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  texture.colorSpace = isColor ? SRGBColorSpace : LinearSRGBColorSpace;
  texture.needsUpdate = true;
}
