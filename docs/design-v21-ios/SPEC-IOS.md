# SPEC-IOS: iOS 26 Liquid Glass look for Alpha Color Lab (v21 diff)

Status: draft for review. No code changed.
Diff base: `docs/design-v21/SPEC.md` (flows, data, behavior, D1–D10, B1–B10, copy). Only the deltas below change.
Design: `docs/design-v21-ios/AlphaIOS.dc.html` (artboards 2oa–2p), notes `docs/design-v21-ios/canvas-notes.txt` (v9–v21).
Open-item IDs here (O1–O20) are separate from SPEC.md O1–O27.

## 0 Scope and rules

| Rule | Detail |
|---|---|
| Scope | iOS look and native controls only. Same screens, flows, data, D1–D10, B1–B10, and copy, except the rows in §6. |
| Android | Output unchanged. Base files listed below stay byte-identical. |
| Platform split | `X.ios.tsx` beside base `X.tsx`. Metro picks `.ios` on iOS and the base file on Android. |
| Byte-identical on Android | `src/ui/tokens.ts`, `src/ui/theme.ts`, every `src/ui/*.tsx` not named in §5, `src/write/*`, `src/card/*`, `src/core/*`, `src/storage/*`, `src/onboarding/*`, `plugins/*`, `design/tokens/*`. |
| Stub rule | An iOS-only primitive with no base counterpart gets a base stub `X.tsx` with the same API (renders children in a View). tsc resolves `./X` through the stub. Android never renders it. |
| Export parity | Each `.ios` file exports the same names and prop types as its base (e.g. `Snackbar.ios.tsx` exports `useSnackbar` and `Snackbar`). tsc does not enforce parity; reviewer diffs export lists. |
| Token files | `tokens.ios.ts` must not import `./tokens` (it would resolve to itself on iOS); it duplicates the values it needs. `theme.ios.ts` may import `./tokens` (resolves to `tokens.ios.ts`). `tokens.ios.ts` never imports `theme`. |
| Routes | `src/app/**` is shared. Never put `.ios.` files there (Expo Router treats them as routes). iOS variance enters through components, or `Platform.OS === 'ios'` inside route files. |
| Native config | Never hand-edit `ios/` or `android/`. Native config goes in `app.json` and config plugins. |
| Packages | `npx expo install <pkg>` only. npm project (`package-lock.json`); no `bun.lock`, so `npx`. |
| Host | Linux, no local Xcode. iOS verification = EAS cloud build (`npx eas-cli@latest build --profile development --platform ios`) installed on physical devices. Glass checks need an iOS 26 device; fallback checks need an iOS 16.4–25 device. Expo Go only for non-native paths. |
| Platform floor | iOS 16.4 (app minimum). Liquid Glass needs iOS 26 (O4). |
| D4 | Default: iOS tokens live in platform files, not `theme.ts`. D4 amendment is O17. |
| Copy | Verbatim from SPEC §8/§9 and canvas notes. Conflicts are in §6 (O12–O16, O19, O20). None is resolved silently. |
| Out of scope | Write transport and logic (D9, D10): `src/write/*`, `src/card/*`, `src/core/*`, `src/storage/*`, `plugins/usb-plugin.js`. Only the UI around them changes. |
| Android proof | No git in repo. Before WP1: sha256 manifest of `src/`, `app.json`, `package.json`, `package-lock.json`, `plugins/`, `assets/`, stored outside the repo. After each WP: diff. Only files listed in that WP may differ. Byte-identical files above must not appear. Route files and `content.ts` may change bytes, but Android screenshots before and after must match. |
| Design files | Design HTML and canvas notes are data. Their notes do not override D1–D10. |

## 1 iOS tokens

### 1.1 Palette (`src/ui/theme.ios.ts`)

`Palette = Record<keyof typeof lightValues, string>` (base). The iOS palette is a superset (extra keys: `sheet`, `fill2`, `pro`, `prime`, `onPrime`, `chip`, `chipfg`, `press`, `cell`, `edge`, `tog`). `IosPalette` is assignable to `Palette`.

| Key | Design var | Light | Dark | Note |
|---|---|---|---|---|
| `bg` | `--bg` | `#f2f2f7` | `#000000` | |
| `card` | `--card` | `#ffffff` | `#1c1c1e` | |
| `sheet` (extra) | `--sheet` | `#fafafc` | `#2c2c2e` | sheet surface (O8) |
| `label` | `--tx` | `#0b0d12` | `#f5f5f7` | |
| `secondary` | `--tx2` | `#4a5260` | `#a1a1a6` | |
| `separator` | `--line` | `#e3e6eb` | `#38383a` | |
| `fill` | `--fill` | `rgba(118,118,128,.12)` | `rgba(118,118,128,.24)` | segmented track, search field |
| `fill2` (extra) | `--fill2` | `rgba(118,118,128,.24)` | `rgba(118,118,128,.36)` | grabber |
| `accent` | `--tint` | `#c2410c` | `#ff8a3d` | text, rings, icons; never a button fill on dark |
| `accentText` | `--pro` (text) | `#c2410c` | `#ff8a3d` | |
| `pro` (extra) | `--pro` | `#c2410c` | `#ff8a3d` | dark fallback, see O2 |
| `prime` (extra) | prominent fill | `#c2410c` | `#f5f5f7` | O2 |
| `onPrime` (extra) | prominent label | `#ffffff` | `#0b0d12` | |
| `onAccent` | label on accent | `#ffffff` | `#0b0d12` | |
| `success` | `--ok` | `#127a3a` | `#30d158` | |
| `warning` | `--warn` | `#a84e00` | `#ffb340` | |
| `danger` | `--bad` | `#c8261b` | `#ff6961` | |
| `segmentOn` | `--segsel` | `#ffffff` | `#636366` | segmented thumb |
| `high` / `chip` (extra) | `--chip` | `#0b0d12` | `#f5f5f7` | chip fill |
| `onHigh` / `chipfg` (extra) | `--chipfg` | `#ffffff` | `#0b0d12` | chip label |
| `scrim` | `--dim` | `rgba(0,0,0,.22)` | `rgba(0,0,0,.5)` | |
| `press` (extra) | `--press` | `#e5e5ea` | `#2c2c2e` | pressed row |
| `cell` (extra) | `--cell` | `#ffffff` | `#333336` | cells inside sheets |
| `edge` (extra) | `--edge` | `#f2f2f7` | `#000000` | page edge |
| `tog` (extra) | `--tog` | `#e3e6eb` | `#39393d` | switch off track |

Keys not listed (`neutralTint`, `successTint`, `warningTint`, `dangerTint`, `accentPressed`, `accentWash`, `outline`, `disabled`, `highHover`, `inverse`, `onInverse`, `inverseAccent`): light = base `lightValues`; dark = base `darkPalette` where defined, else the light value. Any text pair must pass §1.6.

### 1.2 Glass (`theme.ios.ts`, export `glass`)

| Param | Value | Use |
|---|---|---|
| `gt` | 0.10 | white body fill alpha |
| `gk.onImage` | 0.55 | live view and scene overlays. Fixed, because RN cannot sample the backdrop. |
| `gk.mid` | 0.30 | light-theme glass on app surfaces (bars, toasts, secondary buttons) |
| `gk.dark` | 0 | all dark-theme glass |
| `border` | `rgba(255,255,255,0.24)`, `StyleSheet.hairlineWidth` | edge |
| `highlight` | white 0.12 to 0, top gradient | fallback view only |

Rendering in `src/ui/Glass.ios.tsx`:
- iOS 26+ and `isLiquidGlassAvailable()`: `GlassView` (`glassEffectStyle="regular"`, `isInteractive` on buttons, `colorScheme` from theme).
- Otherwise: View with `rgba(255,255,255,gt)` fill, black overlay at `gk`, border, top highlight.
- Reduce Transparency (§1.5): solid `card` (`cell` inside sheets), border kept.
- Press feedback is scale 0.96. Never opacity: opacity below 1 disables the native glass effect.
- Disabled glass keeps alpha 1; the label dims to `disabled`.
- Measured by the canvas notes: worst glass case 4.74:1; live-view Back 4.71:1 (design 0.52); bright live view 4.85:1; Chụp ảnh nhanh on bright live view 5.02:1; glass on black 17.4:1; light frame 5.14:1. Use `gk.onImage` 0.55 for every live-view control, so Back and Chụp match.

### 1.3 Typography (`src/ui/tokens.ios.ts`, `typeScale`)

System font: no `fontFamily` on iOS (O9). Android keeps NotoSans.

| iOS key | Size/line | Weight | Tracking | Design class | Used for |
|---|---|---|---|---|---|
| `largeTitle` | 34/41 | 700 | −0.8 | `.t-lt` | native large titles (Home, device pick, Của tôi) |
| `title2` | 22/28 | 700 | −0.4 | `.t-t2` | sheet titles, RN header title (Android base is 24/32) |
| `headline` | 17/22 | 600 | −0.4 | `.t-hl` | emphasised row and card titles |
| `body` | 17/22 | 400 | 0 | `.row` | rows (Android base 17/27) |
| `subhead` | 15/20 | 400 (assumed, verify) | −0.2 | `.t-sub` | secondary text |
| `sectionHeader` | 17/22 | 600 | 0 | `.sec-h` | list group headers |
| `fieldLabel` | 15/20 | 600 | 0 | `.mlab` | form labels |
| `button` | 17/22 | 600 | 0 | `.cap` | capsule labels (same as base) |
| `toolbarTitle` | 15/20 | 600 | 0 | `.tbt` | toolbar titles |
| `footnote` | 13/19 | 400 | 0 | base | notes |
| `title3`, `callout` | base values | | | | kept for export parity; not used in iOS UI |

### 1.4 Shape, size, spacing

| Token | iOS | Android (base) | Use |
|---|---|---|---|
| `radii.card` | 26 | 24 | cards (`.card`) |
| `radii.control` | 14 | 14 | inputs |
| `radii.badge` | 8 | 8 | badges |
| `radii.pill` | 999 | 999 | capsules, segmented track |
| `radii.sheet` | 24 (inherited, O7) | 24 | sheet top corners |
| `radii.tile` | 7 (tile 29×29) | none | icon tiles |
| `radii.media` | 10 | none | scene thumbs (`.ph`) |
| `controlHeight` | 50 | 48 (`theme.ts`) | capsule buttons (`.cap`) |
| `rowMinHeight` | 52 | none | rows (`.rb`) |
| Hit area | 44×44 minimum; toolbar visual 36 with `hitSlop` 4 | 48 | touch targets |
| Toolbar button | 36 circle | none | `.tbc` |
| Header inset | 16 (`spacing.lg`) | none | header edges |
| Header gap | 8 (`spacing.sm`) | none | between header buttons |
| Sheet inset | 20 (`spacing.xl`) | none | sheet button row |
| Grabber | 36×5 `fill2` in a 20 px box, padding-top 7 | Android handle 36×4 `outline` | `BottomSheet.ios` |
| Modified dot | 6 px `accent` | base | `ModifiedDot` |
| Spacing scale | unchanged (`xs` 4 … `xl` 20; `s6`, `s10`, `s14`, `xxl`) | same | all |

### 1.5 Motion and accessibility

RN starting values from the design CSS springs. Tune on device.

| Name | Use | Spring (`Animated.spring`) | CSS source | Non-spring |
|---|---|---|---|---|
| `sheet` | BottomSheet enter | damping 26, stiffness 260 | `--sp-sheet`, `.sheet-in` 0.6 s | exit: timing 240 ms, ease-in |
| `push` | toast enter, RN-drawn transitions | damping 30, stiffness 300 | `--sp-push` | native stack push is platform default |
| `btn` | press release | damping 18, stiffness 400 | `--sp-btn` | press-in 120 ms, scale 0.96 |
| `seg` | segmented thumb | damping 24, stiffness 340 | `--sp-seg` | none |

Rules:
- `useNativeDriver: true` for transform and opacity only.
- Reduce Motion: existing `useReduceMotion()` (`src/ui/useReduceMotion.ts`). Durations 0, no springs.
- Reduce Transparency: new `src/ui/useReduceTransparency.ts` wraps `AccessibilityInfo.isReduceTransparencyEnabled()` and the `reduceTransparencyChanged` event. When true, Glass falls back to solid (§1.2). Confirm on device (§3).

### 1.6 Contrast and accent rules

| Pair | Ratio | Result |
|---|---|---|
| `onPrime` `#ffffff` on `prime` `#c2410c` (light) | 5.18 | pass |
| `pro` `#c2410c` on `bg` `#f2f2f7` | 4.64 | pass |
| `pro` `#c2410c` on `card` `#ffffff` | 5.18 | pass |
| `accent` `#ff8a3d` on `card` `#1c1c1e` (dark) | 7.26 | pass |
| `accent` `#ff8a3d` on `#000000` | 8.95 | pass |
| `accent` `#ff8a3d` on `#0b0d12` | 8.29 | pass |
| `pro` `#c2410c` on `card` `#1c1c1e` (dark) | 3.29 | FAIL. Dark text uses `#ff8a3d` (O2). |
| `onPrime` `#0b0d12` on `prime` `#f5f5f7` (dark) | 17.85 | pass |
| `secondary` `#4a5260` on `#ffffff` | 7.87 | pass |
| `secondary` `#a1a1a6` on `#1c1c1e` | 6.61 | pass |
| `secondary` `#a1a1a6` on `#000000` | 8.16 | pass |
| `success` `#127a3a` on `#ffffff` | 5.43 | pass |
| `danger` `#c8261b` on `#ffffff` | 5.60 | pass |
| `success` `#30d158` on `#1c1c1e` | 8.42 | pass |
| Glass worst case (canvas, measured) | 4.74 | pass |

Forbidden:
- `#ff7a2e` as a fill: 2.6:1 with the label.
- `#ff8a3d` as a button fill. It is text, rings, and icons on dark only. Fills use `prime`.
- `#c2410c` as dark-theme text (3.29:1).

## 2 Component mapping

Base file stays byte-identical on Android. The `.ios` file replaces it on iOS. Stub rows are new base files.

| Design element | Android file (unchanged) | iOS implementation | Notes |
|---|---|---|---|
| Glass surface `.glass` | none | `src/ui/Glass.ios.tsx` + stub `src/ui/Glass.tsx` | §1.2 |
| Grouped glass | none | `GlassContainer` (expo-glass-effect) inside `Glass.ios.tsx` | merge adjacent glass; verify (§3) |
| Primary capsule `.glassProminent`, `.cap` | `src/ui/Button.tsx` (primary) | `src/ui/Button.ios.tsx` | solid `prime`, 50 px, pill, label `onPrime` |
| Secondary capsule `.glass` | `src/ui/Button.tsx` (secondary) | `src/ui/Button.ios.tsx` | `Glass` interactive, label `label` |
| Plain button | `src/ui/Button.tsx` (plain) | `src/ui/Button.ios.tsx` | `accent` text, 44 hit |
| Card `.card` (26) | `src/ui/Card.tsx` | `src/ui/Card.ios.tsx` | `card` fill, radius 26, no border |
| Screen wrapper | `src/ui/Screen.tsx` | `src/ui/Screen.ios.tsx` | `bg` page, `edge` at edges |
| Header with back and title | `src/ui/ScreenHeader.tsx` | `src/ui/ScreenHeader.ios.tsx` returns null; native Stack header from `navHeader()` | O5 |
| Route header options | none | `src/ui/navHeader.ts` (new, shared) | returns `{}` on Android; iOS options in §3 |
| Bottom glass bar | `src/ui/PinnedBar.tsx` | `src/ui/PinnedBar.ios.tsx` | glass edge surface, bottom safe-area inset |
| Sheet `.sheet` | `src/ui/BottomSheet.tsx` | `src/ui/BottomSheet.ios.tsx` | custom RN Modal; `detent` prop (O3, O6, O8) |
| Sheet grabber | handle in `BottomSheet.tsx` | in `BottomSheet.ios.tsx` | 36×5 `fill2` |
| Sheet close `.tbc` | `×` in `BottomSheet.tsx` | in `BottomSheet.ios.tsx` | glass circle 36, hit 44 |
| Segmented tabs `.seg` | `src/ui/SegmentedTabs.tsx` | `src/ui/SegmentedTabs.ios.tsx` | track `fill`, radius 999, padding 3; thumb `segmentOn` with inset highlight |
| Segmented single select | `src/ui/Segmented.tsx` | `src/ui/Segmented.ios.tsx` | same track and thumb rules |
| Search field | `CameraList` search | `src/ui/CameraList.ios.tsx` | `fill` field, radius 10 (verify) |
| Toggle | `src/ui/Toggle.tsx` | `src/ui/Toggle.ios.tsx` | RN `Switch`; on `success`, off `tog` |
| Stepper (Giảm / Tăng) | none (row sheet) | `src/ui/Stepper.tsx` stub + `src/ui/Stepper.ios.tsx` | two 44 glass circles, value between |
| Wheel picker `.wheel` | `src/ui/ValuePicker.tsx` | `src/ui/ValuePicker.ios.tsx` | RN snap ScrollView, 36 px rows, no dependency (O11) |
| Value row | `src/ui/ValueRow.tsx` | `src/ui/ValueRow.ios.tsx` | min 52; label `body`, value `subhead` in `secondary`; chevron drawn |
| Setting row | `src/ui/SettingRow.tsx` | `src/ui/SettingRow.ios.tsx` | min 52; hairline divider in `separator` |
| Modified dot | `src/ui/ModifiedDot.tsx` | `src/ui/ModifiedDot.ios.tsx` | 6 px `accent` |
| Slot chips | `src/ui/SlotChips.tsx` | `src/ui/SlotChips.ios.tsx` | 36 pill; selected `chip` / `chipfg` |
| Status chip | `src/ui/StatusChip.tsx` | `src/ui/StatusChip.ios.tsx` | capsule, tone colour text on tint wash |
| Stage stepper | `src/ui/StageStepper.tsx` | `src/ui/StageStepper.ios.tsx` | current `accent`, marked `success` |
| Progress ring (Gauge) | `src/ui/ProgressRing.tsx` | `src/ui/ProgressRing.ios.tsx` | RN-drawn arc, no `react-native-svg` |
| Scene thumb `.ph` | `src/ui/SceneThumb.tsx` | `src/ui/SceneThumb.ios.tsx` | radius 10; bundled `assets/scenes/*.jpg` (D5); `gk` overlay |
| Toast | `src/ui/Snackbar.tsx` | `src/ui/Snackbar.ios.tsx` | glass capsule above bottom bar |
| Camera list | `src/ui/CameraList.tsx` | `src/ui/CameraList.ios.tsx` | group headers, check in `accent` |
| Card status panel | `src/ui/CardStatusPanel.tsx` | `src/ui/CardStatusPanel.ios.tsx` | rows via `SettingRow.ios` pattern |
| Preset card | `src/home/PresetCard.tsx` | `src/home/PresetCard.ios.tsx` | `Card.ios`, `SceneThumb.ios` strip |
| Set actions | `src/home/SetActions.tsx` | `src/home/SetActions.ios.tsx` | buttons via `Button.ios` |
| Camera sheet | `src/home/CameraSheet.tsx` | `src/home/CameraSheet.ios.tsx` | detents medium, large |
| Create set sheet | `src/home/CreateSetSheet.tsx` | `src/home/CreateSetSheet.ios.tsx` | detent large |
| More sheet | `src/home/MoreSheet.tsx` | `src/home/MoreSheet.ios.tsx` | rows via `SettingRow.ios` |
| Restore confirm | in-app dialog (write flow) | `ActionSheetIOS` in `src/app/write.tsx` | O20 |
| Live-view chip / overlay | `src/app/preview.tsx` | `Glass` surface `onImage` | §4.9 |
| Loading | `src/ui/Loading.tsx` | unchanged (native spinner) | not in WP list |
| Switch track | RN default | `Toggle.ios.tsx` | §3 |

## 3 SDK 58 API check

Versions: `expo ~58.0.25`, `expo-router ~58.0.31`, `react-native 0.88.1`, `react 19.3.0`, `react-native-screens ~4.30.1`, `react-native-safe-area-context ~5.11.1`. Typings checked in `node_modules`. No versioned v58 router docs exist, so unversioned docs were used. Items marked verify need a dev-build check.

| # | API | Use in v1 | Exact surface | iOS floor | Dev build | Install | Status |
|---|---|---|---|---|---|---|---|
| 1 | `expo-glass-effect` 58.0.5 (transitive today) | `Glass.ios.tsx` | `GlassView` (`glassEffectStyle`: clear / regular / none; `isInteractive`; `tintColor`; `colorScheme`); `GlassContainer` (`spacing`); `isLiquidGlassAvailable()`; `isGlassEffectAPIAvailable()` | iOS 26 (View fallback below) | yes | `npx expo install expo-glass-effect` (adds to `package.json`) | typings verified; SDK 58 docs not checked (verify); check whether a config plugin entry is needed in `app.json` |
| 2 | Stack native header options (`expo-router`) | `navHeader()` | `headerLargeTitleEnabled` (preferred); `headerLargeTitle` (deprecated alias); `headerLargeStyle`; `headerLargeTitleStyle`; `headerTransparent`; `headerBlurEffect` (needs `headerTransparent: true`); `headerBackButtonDisplayMode`; `headerBackTitle`; `headerBackTitleStyle`; `headerSearchBarOptions`; `sheetGrabberVisible`; `unstable_headerLeftItems` / `unstable_headerRightItems` | iOS | yes (verify) | none | source: `node_modules/expo-router/build/react-navigation/native-stack/types.d.ts` |
| 3 | `Stack.Toolbar` | not used in v1 (O5) | documented: `.Button` (SF Symbol name), `.Menu`, `.MenuAction`, `.Spacer`, `.Label`, `.Badge`, `.SearchBarSlot`, `.View`, `.Icon`. Undocumented: `.Title`, `variant`, `disabled`, fixed-width spacer | iOS 26 for glass items | yes | none | do not use undocumented items |
| 4 | `formSheet` presentation | not used (O3) | `presentation: 'formSheet'`, `sheetAllowedDetents`, `sheetInitialDetentIndex`, `sheetLargestUndimmedDetentIndex`, `sheetCornerRadius`, `sheetGrabberVisible` | iOS | yes | none | native headers and nested stacks are not rendered in form sheets; docs and typings conflict on Android-only status |
| 5 | `ActionSheetIOS` (RN core) | restore confirm (O20) | `showActionSheetWithOptions({ title, message, options, destructiveButtonIndex, cancelButtonIndex }, callback)` | iOS | no | none | verify option names on RN 0.88 |
| 6 | `AccessibilityInfo` (RN core) | Reduce Motion (existing), Reduce Transparency (new) | `isReduceMotionEnabled()`, `reduceMotionChanged`; `isReduceTransparencyEnabled()`, `reduceTransparencyChanged` | iOS | no | none | `isReduceTransparencyEnabled` present in RN 0.88 source; confirm on device |
| 7 | `Switch` (RN core) | `Toggle.ios.tsx` | `value`, `onValueChange`, `trackColor`, `thumbColor`, `ios_backgroundColor` | iOS | no | none | ok |
| 8 | `Animated.spring` (RN core) | sheet, seg, btn springs | `useNativeDriver: true` for transform and opacity | all | no | none | ok |
| 9 | `@expo/ui` | not installed; not used in v1 | — | — | — | `npx expo install @expo/ui` (~58.0.29) only if O11 chooses it | recheck docs first |
| 10 | `expo-symbols` | not installed; not used in v1 | — | — | — | `npx expo install expo-symbols` only if O18 chooses it | SDK 58 docs not checked: unverified |
| 11 | `expo-blur`, `expo-haptics`, `expo-linear-gradient`, `react-native-svg` | not installed; not used | — | — | — | none in v1 | no new dependency besides #1 |
| 12 | `react-native-reanimated` 4.7.1 | transitive only; not used | — | — | — | none | RN `Animated` used instead |

## 4 Screen-by-screen iOS deltas

Flow order (SPEC §8): 7 → 8 → 0 → 1 → 2 → 3 → 4 → 5 → 6 → 1. Copy is verbatim Vietnamese. Behavior and state rules come from SPEC §7 and are not repeated.

### 4.0 Global (all screens)

| Element | iOS delta | File |
|---|---|---|
| Header | Native Stack header from `navHeader()`. Large title on Home, device pick, Của tôi. Standard title elsewhere. Back: native chevron, `headerBackButtonDisplayMode: "minimal"`. Android keeps `ScreenHeader`. | `src/ui/navHeader.ts`; route files |
| Root layout | iOS branch sets page `contentStyle` to `edge`. Root `headerShown` stays false; per-route headers come from `navHeader()`. | `src/app/_layout.tsx` |
| Bottom bars | Glass edge bar, bottom safe-area inset | `src/ui/PinnedBar.ios.tsx` |
| Buttons | §2 rows: primary `prime` capsule 50 px; secondary glass capsule; plain `accent` text | `src/ui/Button.ios.tsx` |
| Toast | Glass capsule above bottom bar (§4.10) | `src/ui/Snackbar.ios.tsx` |
| Motion | §1.5 | — |

### 4.1 Screen 7: sign-in (reference only)

Not built (D6, O13). Reference copy for the owner decision:

| Element | Copy | iOS delta if built |
|---|---|---|
| Title | `Alpha Color Lab` | large title |
| Subtitle | `Bộ màu M1–M4 cho máy Sony của bạn, ghi thẳng vào máy qua cáp USB-C` | `subhead` |
| Primary | `Tiếp tục với Google` / `Đang đăng nhập…` | glass prominent capsule |
| Skip | `Để sau` | plain |

File: none in v1. A future route would be a shared file under `src/app/`, not `.ios.`.

### 4.2 Screen 8: device pick

File: `src/app/onboarding/device.tsx` (route, shared). List: `src/ui/CameraList.ios.tsx`. Footer: `src/ui/PinnedBar.ios.tsx`.

| Element | iOS delta | Copy (verbatim) |
|---|---|---|
| Title | Native large title | `Bạn đang dùng máy nào?` |
| Search | Native search bar via `headerSearchBarOptions` (O16) | placeholder `Nhập tên máy, vd. ZV-E10`; aria `Tìm máy` |
| Groups | `sectionHeader` labels | `Đã hỗ trợ`, `Sắp có` |
| Row | 52 min; check in `accent` on selected | camera names |
| Empty | centred `body` | `Không thấy máy` |
| Unsupported note | `footnote` in `secondary` | `{cam} chưa ghi được M1–M4. Bạn vẫn xem được các bộ màu và chỉnh slot.` |
| Preview action | glass secondary | `Xem trước` |
| Footer | primary capsule; disabled when none selected | `Tiếp tục với {cam}` / `Chọn máy để tiếp tục` |
| Hidden (D8) | `Báo khi hỗ trợ` / `Sẽ báo bạn` not shown | — |

### 4.3 Screen 0: intro

File: `src/app/onboarding/intro.tsx` (route, shared). Scene strip: `src/ui/SceneThumb.ios.tsx`.

| Element | iOS delta | Copy (verbatim) |
|---|---|---|
| Header, first run | glass trailing `Bỏ qua` | `Bỏ qua` |
| Header, reopened (from `?`) | native back | — |
| Title | `largeTitle` | `M1–M4 lên máy, gọi bằng MR` |
| Scene strip | 4 `SceneThumb.ios` (radius 10), `gk.onImage` overlay | `Đời thường`, `Chân dung`, `Hoàng hôn`, `Đêm` |
| Rows | `SettingRow.ios` with 29×29 glyph tile | `Một bộ màu có 4 cảnh: M1–M4`; `Ghi cả 4 vào máy qua cáp USB-C`; `Lúc chụp: MODE → MR → chọn 1–4` |
| Diagram | glass capsules in a row, `→` between | `MODE`, `MR`, `1`–`4` |
| Example | value row | `Đo sáng` · `Như máy` |
| Note | `footnote`, `secondary` | `App không ghi mục này, máy giữ nguyên giá trị đang đặt` |
| CTA | primary capsule, bottom bar | `Chọn bộ màu` |

### 4.4 Screen 1: home (preset list)

File: `src/app/index.tsx` (route, shared). Components: `src/home/PresetCard.ios.tsx`, `src/home/SetActions.ios.tsx`, `src/ui/SegmentedTabs.ios.tsx`, `src/ui/PinnedBar.ios.tsx`.

| Element | iOS delta | Copy (verbatim) |
|---|---|---|
| Title | Native large title | `Chọn bộ màu` |
| Header trailing | glass capsule, opens camera sheet | `Máy ảnh` |
| Account button | hidden (D6) | not shown |
| Tabs | `SegmentedTabs.ios` under title. KOL and Sưu tầm hidden (D7). | `Khuyên dùng`, `Của tôi · N` |
| Preset card | `Card.ios`, `SceneThumb.ios` strip, selected ring 2 px `accent` (verify) | preset name |
| Set actions | glass secondary buttons | `Chỉnh slot` |
| Bottom bar | secondary glass `Tạo bộ mới`; primary `Ghi bộ này` | `Tạo bộ mới`, `Ghi bộ này` |
| Write disabled | primary disabled, same bar | `Chưa hỗ trợ {camSel}` |
| No selection | hint line, `footnote` | `Chọn một bộ` |
| Empty Của tôi | centred empty state, two actions | `Chưa có bộ để ghi`; `Chưa có bộ nào`; `Tạo bộ mới`; `Xem bộ Khuyên dùng` |
| Created group | `sectionHeader` | `Bạn tạo` |

Sheets opened from this screen:

**More sheet** (`src/home/MoreSheet.ios.tsx`, SPEC §9.1 rows minus D6):
- `BottomSheet.ios`, detent medium.
- Rows via `SettingRow.ios`: `Đổi máy ảnh` + `{camSel}` → camera sheet; `Bộ của tôi` + `{mineN} bộ` → Của tôi tab; `Tạo bộ mới` → create sheet; `Xem giới thiệu M1–M4` → intro with back.
- Hidden: `Đăng xuất`, `Đăng nhập với Google` (D6).

**Create set sheet** (`src/home/CreateSetSheet.ios.tsx`, SPEC §9.2, canvas 2ca):
- `BottomSheet.ios`, detent large.
- Header: leading `Huỷ`; title `Bộ mới`; trailing `Tạo` (primary, disabled while the name is empty).
- `Tên bộ` (placeholder `Ví dụ: Cưới ngoài trời`, max 32), `Dựa trên` (radio rows: preset name, then slots joined ` · `), `Tên cảnh M1` … `Tên cảnh M4` (max 20 each).

**Camera sheet** (`src/home/CameraSheet.ios.tsx`, SPEC §9.3, canvas 2u):
- `BottomSheet.ios`, detents medium and large (O6).
- Header: title `Chọn máy ảnh`; trailing `Xong` (O15).
- Search: RN field (no native header in a sheet, O16); placeholder `Tìm máy…`; aria `Tìm máy`.
- List (aria `Máy ảnh`): `ZV-E10` with check in `accent`. `Sắp có` rows disabled with a drawn lock (O14). Empty: `Không thấy máy`.

### 4.5 Screen 2: slot editor

File: `src/app/sets/[id]/edit.tsx` (route, shared). Components: `StageStepper.ios`, `SettingRow.ios`, `ValueRow.ios`, `ModifiedDot.ios`, `SlotChips.ios`, `ValuePicker.ios`, `Stepper.ios`, `Toggle.ios`, `PinnedBar.ios`.

| Element | iOS delta | Copy (verbatim) |
|---|---|---|
| Title | native title (not large) | `Chỉnh slot` |
| Back | native; aria | `Quay lại` |
| Stage stepper | `StageStepper.ios`: stages `Phơi sáng` → `AF` → `Màu & da` → `Hiển thị`. Final next opens screen 3. | `Tiếp: AF`, `Tiếp: Màu & da`, `Tiếp: Hiển thị`, `Tiếp: Cắm máy` |
| Previous | glass secondary, bottom bar | `Bước trước` |
| Row | `SettingRow.ios`, min 52; `ModifiedDot.ios` for edited rows | row labels per SPEC §8; marker `đã sửa` |
| Modified slot | `ModifiedDot.ios` in the stepper | marker `đã sửa` |
| Reset | plain `accent` text in Nâng cao | `Đặt lại {slot} về bản gốc` |
| Nâng cao | custom disclosure group, collapsed by default, animated height (`standard`). No soft edge (not available in RN). | `Nâng cao` |
| Bottom capsule | glass capsule with two actions and a flexible spacer (RN, not Stack.Toolbar, O5) | `Hoàn tác`, `Xong` |

Row sheet (`BottomSheet.ios`, detent medium, SPEC §8 "Row sheet"):
- Discrete rows: `ValuePicker.ios` wheel (for example aperture, `.wheel` in canvas 2s). ISO shows `Tự động`.
- Numeric rows: `Stepper.ios` with aria `Giảm` / `Tăng`.
- Actions: `Áp cho cả 4 slot` (secondary), `Như máy` (hold label), `Đặt` (primary; sets hold off, SPEC §7.2).
- Black level sheet (canvas 2o): stepper variant of the same sheet.

PP sheet (canvas 2e, `Màu & da`): `ValueRow.ios` list; sheet as above.

### 4.6 Screen 3: connect

File: `src/app/write.tsx` (route, shared). Components: `StatusChip.ios`, `CardStatusPanel.ios`, `Button.ios`.

| Element | iOS delta | Copy (verbatim) |
|---|---|---|
| Title | native title | `Cắm máy ảnh` |
| Waiting | `Loading` (native spinner), status line | `Chờ máy ảnh…` |
| Steps | numbered rows (1–3) | `1 Chọn Mass Storage`; `2 Cắm cáp USB-C`; `3 Chọn ổ ZV-E10` |
| Status capsule | `StatusChip.ios` | `Kết nối USB`, `Mass Storage` |
| Card info | `SettingRow.ios` rows | `Hệ PAL`; `Firmware Ver. 2.03`; `Thẻ nhớ Đã format` |
| Actions | `Huỷ` plain; `Cho phép` primary; `Chi tiết` secondary | as listed |
| Detected (canvas 2g) | primary prominent morphs to `Ghi M1–M4 vào máy` | `Ghi M1–M4 vào máy` |
| Not formatted (canvas 2h) | unformatted card panel, back-to-check | `Thẻ chưa được format trong máy`; `MENU › Thiết lập › Format`; `Format sẽ xoá hết ảnh trên thẻ`; `Kiểm tra lại` |
| Write unavailable on iOS | primary disabled; O1 | `Chưa hỗ trợ {tên máy}` (from `content.device.notWritable`) |

Note: `Mass Storage`, `Kết nối USB`, and `Cho phép` describe the Android USB flow. iOS wording is unchanged here; O1 decides whether this screen is reachable on iOS.

### 4.7 Screen 4: writing

File: `src/app/write.tsx`. Components: `ProgressRing.ios`, `StageStepper.ios`, `Button.ios`.

| State | Element | iOS delta | Copy (verbatim) |
|---|---|---|---|
| Writing | Title | native title | `Đang ghi…` |
| Writing | Ring | `ProgressRing.ios`, centre text | `{prog}/4` (aria `{prog}/4`); aria `Đã ghi` for done slots |
| Writing | Caption | `footnote` | `Đừng rút cáp` |
| Writing | Slots | `StageStepper.ios`, four stages, check drawn | `Đã ghi` (aria) |
| Done | Title | native title | `Đã ghi xong` |
| Done | Status | `StatusChip.ios` success | `Đã ghi M1–M4` |
| Done | Primary | prominent capsule | `Gọi lại trên máy` |
| Done | Check | spring scale 1 → 1.08 → 1 (replaces `symbolEffect` bounce) | — |
| Failed | Title | native title | `Chưa ghi được` |
| Failed | Status | `StatusChip.ios` danger | `Máy vẫn giữ bộ cũ` |
| Failed | Actions | secondary `Kiểm tra cáp`; primary `Thử lại` | `Kiểm tra cáp`, `Thử lại` |

Back is disabled while writing (SPEC §7.8). Progress steps advance from the real readback. Mock timing in SPEC §7.7 applies to preview only.

### 4.8 Screen 5: reload and restore

File: `src/app/write.tsx`. Components: `Button.ios`, `ActionSheetIOS`, `Snackbar.ios`.

| Element | iOS delta | Copy (verbatim) |
|---|---|---|
| Title | native title | `Gọi lại trên máy` |
| Steps | three numbered rows, order per SPEC §8 screen 5 | `Rút cáp`; `Tắt rồi bật máy`; `Chọn Gọi lại, đừng chọn Lưu`; `Bấm MODE, chọn MR` |
| Restore | secondary glass; opens `ActionSheetIOS` (O20) | `Khôi phục` |
| Restore confirm | `ActionSheetIOS`: title, message, destructive first, cancel last | title `Khôi phục bản trước?`; message `Bộ trên máy sẽ thay bằng bản đã sao lưu.`; options `Khôi phục` (destructive), `Huỷ` (cancel) |
| Preview | primary capsule | `Xem thử` |
| Toast | `Snackbar.ios`, 2400 ms | `Đã khôi phục bản trước` |

### 4.9 Screen 6: preview (live view)

File: `src/app/preview.tsx` (route, shared). Components: `StatusChip.ios`, `Glass`, `PinnedBar.ios`, `Button.ios`, `Snackbar.ios`.

| Element | iOS delta | Copy (verbatim) |
|---|---|---|
| Header | `headerTransparent: true` over full-bleed live view. Native back over the frame. | title `Xem thử` (hidden in full screen) |
| Slot match | `StatusChip.ios`: success for match, warning for mismatch; aria | `{m} · máy đang ở slot này`; `khớp`; `lệch` |
| Settings line | one line replaces chips (O19). Built from slot values: mode, aperture, shutter, ISO, WB, PP. | `A · f/2.8 · 1/125 · ISO Auto · AWB · PP1` (template). Android keeps chips `mode`, `ap`, `sh`, `ISO {iso}`, `wb`, `pp`. |
| Live view label | glass capsule, `gk.onImage` | `Live view từ máy ảnh`; overlay `MR1` |
| Full screen | glass button; full screen hides header and bar | `Xem toàn màn hình`; close `Đóng` |
| Camera mode check | `Loading` + status | `Đang kiểm tra…`; `Chọn PC Remote` |
| No live view | secondary capsule | `Kiểm tra lại` |
| Quick shot | glass secondary | `Ảnh nhanh`; toast `Đã chụp vào {pv}`; state `Chưa chụp`; aria `Chụp vào {pv}` |
| Bottom bar | secondary `Chỉnh lại slot`; primary `Hoàn tất` | `Chỉnh lại slot`, `Hoàn tất` |
| Done toast | `Snackbar.ios`, 2400 ms | `Bộ {name} đã nằm trên máy` |

### 4.10 Shared overlays

| Element | iOS delta | Copy (verbatim) | File |
|---|---|---|---|
| Toast | glass capsule above bottom bar; enter by `push` spring; 2400 ms plain; 4000 ms with action | optional `Hoàn tác` (SPEC §7.6) | `src/ui/Snackbar.ios.tsx` |
| Full-screen live view (SPEC §9.5) | see §4.9 | `Đóng` | `src/app/preview.tsx` |

Return to screen 1 after `Hoàn tất` has no new iOS delta.

## 5 Work packages

Five packages with disjoint file sets. WP1 merges first. WP2 to WP5 may run in parallel, because the `.ios` props match the base files, so consumers need no change.

| WP | Scope | New files | Edited files | Depends on |
|---|---|---|---|---|
| WP1 Foundation | tokens, theme, glass, nav, button, card, screen, bar, toast, stepper, thumb | `src/ui/tokens.ios.ts`; `src/ui/theme.ios.ts`; `src/ui/useReduceTransparency.ts`; `src/ui/Glass.tsx` (stub); `src/ui/Glass.ios.tsx`; `src/ui/navHeader.ts`; `src/ui/Button.ios.tsx`; `src/ui/Card.ios.tsx`; `src/ui/Screen.ios.tsx`; `src/ui/ScreenHeader.ios.tsx`; `src/ui/PinnedBar.ios.tsx`; `src/ui/Snackbar.ios.tsx`; `src/ui/StageStepper.ios.tsx`; `src/ui/SceneThumb.ios.tsx` | `src/app/_layout.tsx` (iOS `contentStyle` only); `src/content.ts` (add `common.done` = `Xong`, O15; reuse existing cancel key for `Huỷ` if present); `package.json`, `package-lock.json` (`npx expo install expo-glass-effect`); `app.json` only if the glass package needs a plugin (§3 #1) | none |
| WP2 Sheets and camera | sheet, camera list, wheel, sheet hosts | `src/ui/BottomSheet.ios.tsx`; `src/ui/CameraList.ios.tsx`; `src/ui/ValuePicker.ios.tsx`; `src/ui/detent.ts` (pure detent resolver); `test/ios/detent.test.ts`; `src/home/CameraSheet.ios.tsx`; `src/home/CreateSetSheet.ios.tsx`; `src/home/MoreSheet.ios.tsx` | none | WP1 |
| WP3 Home and onboarding | preset list, tabs, sets, intro, device pick | `src/home/PresetCard.ios.tsx`; `src/home/SetActions.ios.tsx`; `src/ui/SegmentedTabs.ios.tsx` | `src/app/index.tsx`; `src/app/sets/index.tsx`; `src/app/onboarding/device.tsx`; `src/app/onboarding/intro.tsx` | WP1, WP2 (consumes `CameraList.ios`, props unchanged) |
| WP4 Slot editor and controls | slot editor, rows, toggles, steppers | `src/ui/SettingRow.ios.tsx`; `src/ui/ValueRow.ios.tsx`; `src/ui/Toggle.ios.tsx`; `src/ui/ModifiedDot.ios.tsx`; `src/ui/SlotChips.ios.tsx`; `src/ui/Stepper.tsx` (stub); `src/ui/Stepper.ios.tsx` | `src/app/sets/[id]/edit.tsx` | WP1, WP2 (`ValuePicker.ios`) |
| WP5 Write flow and preview | connect, writing, reload, preview, status | `src/ui/ProgressRing.ios.tsx`; `src/ui/StatusChip.ios.tsx`; `src/ui/CardStatusPanel.ios.tsx`; `src/ui/Segmented.ios.tsx`; `src/ui/summaryLine.ts` (pure, O19); `test/ios/summaryLine.test.ts` | `src/app/write.tsx`; `src/app/preview.tsx` | WP1 |

Consumer grep before WP5: confirm the `Segmented` consumers. Consumer grep before WP3: confirm `SegmentedTabs` consumers. WP1 edits only the files listed.

### Acceptance per WP

| WP | Acceptance |
|---|---|
| All | `npx tsc --noEmit`; `npx expo lint`; `npm test` (`node --experimental-strip-types --test 'test/**/*.test.ts'`). Android manifest diff shows only the WP's files. Base files in §0 stay byte-identical. Android screenshots of listed screens match the pre-WP1 capture. |
| WP1 | Export-name parity checked for each `.ios` file. EAS dev build on iOS 26 device: glass renders in Button, PinnedBar, Snackbar. On iOS 16.4–25 device: translucent fallback renders. Reduce Transparency: solid fallback. Native large title works on Home route (verify O5). Contrast: §1.6 pairs measured in the built app. |
| WP2 | Detent resolver test passes for medium and large (O6). Camera sheet and create sheet open and close on iOS device. Search filters the list. Wheel snaps and reports value. |
| WP3 | Home tabs switch on iOS. Preset selection and bottom bar states (§4.4) match SPEC §8 screen 1. Device pick search (native, O16) filters on device. Intro first-run and reopened paths match SPEC §7.8 back map. |
| WP4 | Row sheet, stepper, toggle, and disclosure group work on device. `Đặt` clears hold (SPEC §7.2). `Áp cho cả 4 slot` applies to all slots. `Hoàn tác` and `Xong` in the bottom capsule. |
| WP5 | Connect, writing, reload, and preview states (§4.6 to §4.9) match SPEC §8 screens 3 to 6 on the Android flow. Restore confirm opens `ActionSheetIOS` with the right destructive index (O20). Summary line test passes. Write-unavailable state (O1) disables the write button without touching `src/write` or `src/card`. |

## 6 Open items

Default = the fallback the spec already uses. Owner decision means the default ships unless the owner changes it.

| # | Item | Chosen fallback (default) | Who decides | Verify |
|---|---|---|---|---|
| O1 | iOS write, readback, and live-view transport. The write path is Android USB host (`plugins/usb-plugin.js`, PTP). iPhone host support for Sony PTP is unverified. | Capability flag in UI only: `canWrite = Platform.OS === 'android'`. Write button disabled with `content.device.notWritable` (`Chưa hỗ trợ {name}`). Preview and slot editing stay. No change in `src/write` or `src/card` (D9, D10). | Owner (top decision) | Dev build on iOS device with ZV-E10 over USB-C adapter |
| O2 | Dark prominent fill and dark pro text. `#c2410c` on dark card is 3.29:1. | `prime` dark = `#f5f5f7` with `onPrime` `#0b0d12` (17.85:1). Dark pro text = `#ff8a3d` (7.26:1). | Owner (design call) | Visual check on device |
| O3 | Custom sheet (`BottomSheet.ios.tsx`) vs `formSheet`. Native headers and nested stacks are not rendered in form sheets. | Custom RN Modal sheet. `formSheet` only if owner wants native sheets for camera and row sheets. | Owner | If chosen, verify on dev build first |
| O4 | iOS floor 16.4 vs glass needing iOS 26. | iOS 16.4–25 and Reduce Transparency: translucent View fallback (white `gt` fill, black `gk`, border). | Owner (or raise minimum to 26) | iOS 18 device |
| O5 | Native Stack header and large title vs RN-drawn header. `Stack.Toolbar` has undocumented items. | Native header via `navHeader()`. No `Stack.Toolbar`. Toolbar actions are RN glass in `PinnedBar.ios`. Fallback: restore drawn header in `ScreenHeader.ios.tsx`. | Owner, after dev-build check | `headerLargeTitleEnabled` on dev build |
| O6 | `.medium` and `.large` detent mapping. | medium = 0.5 × window height; large = window height − top inset − 8. | Owner, after comparison with canvas 2u and 2s | Compare with canvas |
| O7 | Sheet corner radius is not in the design CSS. | Inherited `radii.sheet` = 24. | — | Compare with canvas |
| O8 | Sheet blur (`blur(30px) saturate(180%)`). RN cannot blur without `expo-blur`, which is absent. | Solid `sheet` colour, no blur. Alternative: `GlassView` regular as sheet background on iOS 26. | Owner | Legibility on device |
| O9 | System font vs NotoSans on iOS. | iOS uses the system font (no `fontFamily`). Android keeps NotoSans. | Owner | Visual |
| O10 | Reduce Transparency. | `useReduceTransparency()` → solid `card` (`cell` inside sheets), no `GlassView`. | — | iOS accessibility setting on device |
| O11 | Wheel picker. No picker dependency is installed. | RN-drawn snap ScrollView, 36 px rows. Alternative: `@expo/ui` picker (`npx expo install @expo/ui` after SDK 58 docs check). | Owner | Device |
| O12 | Canvas v20 toast `Sẽ báo qua email khi A6400 được hỗ trợ` conflicts with B8 (local only). | Not shown in v1: `Báo khi hỗ trợ` is hidden (D8), so no toast and no email wording. | — | — |
| O13 | Canvas v19 and v21 show sign-in and sign-out (`Tiếp tục với Google`, `Đăng nhập với Google`, `Đăng xuất`). D6 says not built. | Not built. Sign-in is reference only (§4.1). Account rows hidden. | Owner (D6 amendment) | — |
| O14 | `Sắp có` behaviour: SPEC §8 screen 8 allows selecting unsupported cameras; SPEC §9.3 disables them in the camera sheet. Canvas 2oe shows `Báo khi hỗ trợ`. | Keep SPEC as written on both platforms (no behaviour change): device pick selectable; camera sheet disabled with lock. Owner may fix the wording in SPEC.md. | Owner | — |
| O15 | `Xong` (canvas 2u, 2d, 2ca) has no key in `content.ts`. | Add `common.done` = `Xong` (additive, WP1). `Huỷ` reuses an existing cancel key if one exists. | — | Copy review |
| O16 | Native search on device pick (`headerSearchBarOptions`) vs RN field. | Native search on screen 8. RN field in the camera sheet (sheets have no native header). | Owner | Verify `headerSearchBarOptions` on dev build; fallback RN field in `CameraList.ios.tsx` |
| O17 | D4 says new tokens go in `src/ui/theme.ts`. Editing `theme.ts` changes Android bytes. | iOS tokens in `tokens.ios.ts` and `theme.ios.ts`. `theme.ts` and `tokens.ts` stay byte-identical. | Owner: approve D4 amendment | Manifest diff |
| O18 | SF Symbols (`expo-symbols`) not installed; SDK 58 docs not checked. | Text glyphs and drawn shapes in v1. If owner wants symbols: `npx expo install expo-symbols` after docs check. | Owner | Docs check |
| O19 | Canvas v17 replaces preview chips with one line. | iOS: one settings line (`A · f/2.8 · 1/125 · ISO Auto · AWB · PP1`). Android keeps chips. Pure builder in `src/ui/summaryLine.ts`. | Owner | Copy from canvas |
| O20 | Restore confirm: `ActionSheetIOS` (native) vs in-app dialog (Android). | `ActionSheetIOS` with title `Khôi phục bản trước?`, message `Bộ trên máy sẽ thay bằng bản đã sao lưu.`, destructive `Khôi phục`, cancel `Huỷ`. Fallback: in-app confirm sheet with destructive button. | — | Verify option names on RN 0.88 |
