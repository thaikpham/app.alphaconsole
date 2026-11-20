import { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl";

type Props<T extends string> = Omit<SegmentedControlProps<T>, "emphasizeSelected">;

/** Single-select track (SPEC-IOS §2). Every label is subhead. Thin wrapper over SegmentedControl. */
export function Segmented<T extends string>(props: Props<T>) {
  return <SegmentedControl {...props} />;
}
