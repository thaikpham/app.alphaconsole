import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** True while the OS asks for reduced transparency. Glass then uses a solid fill. */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((on) => {
      if (mounted) setReduce(on);
    });
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
