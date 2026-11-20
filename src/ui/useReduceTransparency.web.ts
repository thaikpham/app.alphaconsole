/** The web has no Reduce Transparency signal (react-native-web does not implement it), so Glass keeps its translucent fill. */
export function useReduceTransparency(): boolean {
  return false;
}
