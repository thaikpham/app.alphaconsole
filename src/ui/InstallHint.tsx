// First-run hint on iOS Safari: the web app is added to the home screen from the Share sheet. Dismissed once, kept in
// localStorage as install-hint.json. The home screen renders it on the web only.
import { useState } from "react";
import { Text } from "react-native";

import { content } from "@/content";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";

const KEY = "install-hint.json";

/** iOS Safari only. The other iOS browsers cannot add a home screen app. */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && safari;
}

/** Already opened from the home screen (the iOS flag, or the standalone display mode). */
function isInstalled(): boolean {
  const iosFlag = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosFlag || window.matchMedia("(display-mode: standalone)").matches;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function InstallHint() {
  const theme = useTheme();
  const [open, setOpen] = useState(() => isIosSafari() && !isInstalled() && !wasDismissed());

  if (!open) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ dismissed: true }));
    } catch {
      // Storage is off: the hint comes back on the next visit.
    }
    setOpen(false);
  };

  return (
    <Card>
      <Text style={[typeScale.subhead, { color: theme.label }]}>{content.home.installHint.text}</Text>
      <Button label={content.home.installHint.dismiss} onPress={dismiss} variant="secondary" />
    </Card>
  );
}
