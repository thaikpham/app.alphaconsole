// Camera sheet (SPEC 9.3, D8). Saves the chosen camera; the next card read uses it as the first guess.
import { useState } from "react";
import { Text } from "react-native";

import type { ModelId } from "@/core/models";
import { content } from "@/content";
import { saveCameraSelection } from "@/storage/cameraFile";
import { BottomSheet } from "@/ui/BottomSheet";
import { CameraList } from "@/ui/CameraList";
import { typeScale } from "@/ui/tokens";
import { useTheme } from "@/ui/theme";

type Props = {
  visible: boolean;
  selected: ModelId | null;
  onClose: () => void;
  onChanged: (id: ModelId) => void;
};

export function CameraSheet({ visible, selected, onClose, onChanged }: Props) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  const close = () => {
    setFailed(false);
    onClose();
  };

  const choose = async (id: ModelId) => {
    setFailed(false);
    try {
      await saveCameraSelection(id);
    } catch {
      setFailed(true);
      return;
    }
    onChanged(id);
    close();
  };

  return (
    <BottomSheet visible={visible} title={content.camera.sheetTitle} onClose={close}>
      <CameraList selected={selected} onSelect={(id) => void choose(id)} searchPlaceholder={content.camera.sheetSearchPlaceholder} />
      {failed ? <Text style={[typeScale.subhead, { color: theme.danger }]}>{content.camera.saveFailed}</Text> : null}
    </BottomSheet>
  );
}
