// The set list moved to the preset home ("Của tôi" tab). This route stays so old links still open.
import { Redirect } from "expo-router";

export default function Sets() {
  return <Redirect href={{ pathname: "/", params: { tab: "mine" } }} />;
}
