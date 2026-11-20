import { V21Switch } from "./V21Switch";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/** Web switch for the Toggle row: the AlphaApp switch, drawn the same as on Android. */
export function ToggleSwitch({ value }: Props) {
  return <V21Switch value={value} />;
}
