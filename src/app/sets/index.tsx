// The set list now lives on the preset home. This route stays so old links still open.
import { Redirect } from "expo-router";

export default function Sets() {
  return <Redirect href="/" />;
}
