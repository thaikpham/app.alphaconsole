import { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl";

type Props<T extends string> = Omit<SegmentedControlProps<T>, "emphasizeSelected">;

/** Tabs for the home preset list (SPEC-IOS §2, `.seg`). The selected label is fieldLabel. Thin wrapper over SegmentedControl. */
export function SegmentedTabs<T extends string>(props: Props<T>) {
  return <SegmentedControl {...props} emphasizeSelected />;
}
