export function rgbToRgbw(
  Ri: number,
  Gi: number,
  Bi: number
): [number, number, number, number] {
  //Get the maximum between R, G, and B
  const tM = Math.max(Ri, Gi, Bi);

  //If the maximum value is 0, immediately return pure black.
  if (tM === 0) {
    return [0, 0, 0, 0];
  }

  //This section serves to figure out what the color with 100% hue is
  const multiplier = 255 / tM;
  const hR = Ri * multiplier;
  const hG = Gi * multiplier;
  const hB = Bi * multiplier;

  //This calculates the Whiteness (not strictly speaking Luminance) of the color
  const M = Math.max(hR, hG, hB);
  const m = Math.min(hR, hG, hB);
  const Luminance = (((M + m) / 2.0 - 127.5) * (255.0 / 127.5)) / multiplier;

  let Wo = Math.floor(Luminance);
  let Bo = Math.floor(Bi - Luminance);
  let Ro = Math.floor(Ri - Luminance);
  let Go = Math.floor(Gi - Luminance);

  //Trim them so that they are all between 0 and 255
  if (Wo < 0) Wo = 0;
  if (Bo < 0) Bo = 0;
  if (Ro < 0) Ro = 0;
  if (Go < 0) Go = 0;
  if (Wo > 255) Wo = 255;
  if (Bo > 255) Bo = 255;
  if (Ro > 255) Ro = 255;
  if (Go > 255) Go = 255;

  return [Ro, Go, Bo, Wo];
}

export function rgbwToRgb(
  r: number,
  g: number,
  b: number,
  w: number
): [number, number, number] {
  return [r + w, g + w, b + w];
}
