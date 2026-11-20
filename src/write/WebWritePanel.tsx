// The write on a browser without the card folder (iPhone and iPad Safari, Firefox). The four CAMPR files are shared, or
// downloaded as a ZIP, for the user to save into the card folder. The browser cannot read the card after that, so the
// write is recorded when the user finishes saving, and the next read compares the card with the record.
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { userMessage } from "@/card/session";
import { content } from "@/content";
import { makeZip } from "@/core/web/lib/zve10/zip";
import type { Family, PlannedFile } from "@/core/web/lib/app-core/transfer/plan";
import { recordFor } from "@/core/web/lib/app-core/transfer/state";
import { updateWriteState } from "@/storage/writeState";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { downloadFile } from "@/ui/download";
import { useTheme } from "@/ui/theme";
import { typeScale } from "@/ui/tokens";
import { fontFamily } from "@/ui/v21";

type Props = {
  files: PlannedFile[];
  family: Family;
  setId: string;
  uuid: string;
};

function basename(relPath: string): string {
  return relPath.slice(relPath.lastIndexOf("/") + 1);
}

/** The card folder the files go to, from their planned paths (PRIVATE/SONY/SETTING/E10/). */
function folderOf(relPath: string): string {
  return relPath.slice(0, relPath.lastIndexOf("/") + 1);
}

export function WebWritePanel({ files, family, setId, uuid }: Props) {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const remember = (startedAt: string) =>
    updateWriteState((s) => ({
      ...s,
      families: { ...s.families, [uuid]: family },
      lastWritten: { ...s.lastWritten, [uuid]: recordFor(setId, files, family, startedAt) },
    }))
      .then(() => setSaved(true))
      .catch((e: unknown) => setMessage(userMessage(e, content.write.stateFailed)));

  // The share sheet and the download must open inside the tap, so nothing is awaited before them.
  const share = () => {
    setMessage(null);
    const startedAt = new Date().toISOString();
    const shared = files.map(
      (f) => new File([new Uint8Array(f.bytes)], basename(f.relPath), { type: "application/octet-stream" }),
    );
    if (!navigator.canShare?.({ files: shared })) {
      downloadZip(startedAt);
      return;
    }
    navigator
      .share({ files: shared })
      .then(() => remember(startedAt))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setMessage(content.write.web.shareFailed);
      });
  };

  function downloadZip(startedAt: string) {
    const archive = makeZip(files.map((f) => ({ path: f.relPath, data: f.bytes })));
    downloadFile("alpha-console-set.zip", archive, "application/zip");
    void remember(startedAt);
  }

  const zip = () => {
    setMessage(null);
    downloadZip(new Date().toISOString());
  };

  return (
    <Card>
      <Text style={[typeScale.subhead, styles.strong, { color: theme.label }]}>
        {content.write.web.target(folderOf(files[0].relPath))}
      </Text>
      <Text style={[typeScale.subhead, { color: theme.secondary }]}>
        {content.write.web.names(files.map((f) => basename(f.relPath)).join(", "))}
      </Text>
      <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.write.web.shareHint}</Text>
      <Button label={content.write.web.shareButton} onPress={share} />
      <Button label={content.write.web.zip} onPress={zip} variant="secondary" />
      <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.write.web.zipNote}</Text>
      <Text style={[typeScale.subhead, { color: theme.secondary }]}>{content.write.web.verifyNote}</Text>
      {saved ? <Text style={[typeScale.subhead, styles.strong, { color: theme.label }]}>{content.write.web.shared}</Text> : null}
      {message ? <Text style={[typeScale.subhead, styles.strong, { color: theme.danger }]}>{message}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  strong: { fontFamily: fontFamily.semibold },
});
