# AlphaColorLab App v21 - Implementation Spec

Source of truth: owner-approved design export v21 (`design/v21/AlphaApp.dc.html` Android, `design/v21/AlphaIOS.dc.html` iOS, `design/v21/iOS SwiftUI.dc.html`). Stripped working copies used for this spec: `/tmp/v21work/AlphaApp.stripped.html`, `/tmp/v21work/AlphaIOS.stripped.html`. Original exports are not re-read (base64 bloat).

Asset paths below are relative to the app root `App.Alphacolorlab/`.

Status: COMPLETE. Sections 0-4 written. Ambiguities A-M are open for owner review.

## 0. Document map

1. Tokens
2. Screens (flow + per-screen layout)
3. Device frame chrome
4. Gap map vs current app code


## 1. Tokens

Android = `AlphaApp.dc.html` (412x915). iOS = `AlphaIOS.dc.html` (393x852). Values are verbatim from the stripped copies. Where the two platforms differ, the delta is listed under the table.

### 1.1 Font families

| Item | Android | iOS |
|---|---|---|
| Family | `'Noto Sans', system-ui, sans-serif`, loaded from Google Fonts css2 with weights 400;500;600;700 only | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, system-ui, sans-serif` |
| Root size/line | 17px / 26px | 17px / 22px |
| Root tracking | none | letter-spacing -0.4px |
| Weights used | 400 (1), 600 (76), 700 (29), 800 (1, the "G" glyph at 13px) | 400 default, 600 and 700 per role table |

Conflict (owner decision): Android weight 800 is used once but Noto Sans is loaded only up to 700. Platform families also differ (Noto Sans vs SF). Proposed: bundle Noto Sans 400/500/600/700 (and 800 if the "G" glyph must stay bold) with expo-font on Android, and use the system font on iOS. Hardcoded `-webkit-font-smoothing` has no React Native equivalent and is dropped.

### 1.2 Colour tokens, Android

Light is the `.acl` block. Dark is `.acl.dk`. Both set `color-scheme`.

| Token | Light | Dark |
|---|---|---|
| `--bg` | #f2f2f7 | #0f1115 |
| `--sf` | #ffffff | #1b1e24 |
| `--sh` | #ffffff | #23262d |
| `--sf2` | #f2f2f7 | #2b2f37 |
| `--sfh` | #fafafb | #24282f |
| `--tx` | #0b0d12 | #eceef2 |
| `--tx2` | #4a5260 | #a9b0bb |
| `--ln` | #e3e6eb | #30343c |
| `--segon` | #ffffff | #4a505c |
| `--ol` | #c9ced6 | #6b7280 |
| `--dis` | #b8bec7 | #626975 |
| `--hi` | #0b0d12 | #eceef2 |
| `--hitx` | #ffffff | #0b0d12 |
| `--hih` | #2a2f38 | #c9ced6 |
| `--acx` | #a8380a | #ff8a3d |
| `--acw` | #f7e4dc | rgba(255,138,61,.16) |
| `--aci` | #c2410c | #ff8a3d |
| `--ok` | #127a3a | #5cc98a |
| `--warn` | #a84e00 | #f2a54a |
| `--err` | #c8261b | #ff7b6e |
| `--inv` | #0b0d12 | #e3e6eb |
| `--invtx` | #ffffff | #0b0d12 |
| `--invac` | #ff8a3d | #a8380a |
| `--scrim` | rgba(11,13,18,.45) | rgba(0,0,0,.6) |

Android hardcoded colours (not tokenised, counts are occurrences in the markup and script): `#ffffff` 45, `#c2410c` 18 (primary button fill, also used in dark), `#0b0d12` 16, `#a8380a` 14 (primary hover), `#9a3412` 12 (primary active), `#127a3a` 5, `#2a2f38` 4 (placeholder), `#c8261b` 3, `#ff8a3d` 3, `#5a55d6` 3 (disp tile). Implementation should map these to `--aci`, `--ok`, `--err`, `--tx` and `--hi`. `#9a3412` has no token: add `--aci-active` or accept it as a constant.

### 1.3 Colour tokens, iOS

Light is the `.ios` block. Dark is `.ios.dark`. `.ios.blur` overrides only `--sheet` to `rgba(44,44,46,.8)`.

| Token | Light | Dark (`.ios.dark`) | Dark note |
|---|---|---|---|
| `--bg` | #f2f2f7 | #000000 | |
| `--card` | #ffffff | #1c1c1e | |
| `--sheet` | #fafafc | #2c2c2e | blur variant #2c2c2e at .8 alpha |
| `--tx` | #0b0d12 | #f5f5f7 | |
| `--tx2` | #4a5260 | #a1a1a6 | |
| `--line` | #e3e6eb | #38383a | |
| `--tint` | #c2410c | #ff8a3d | |
| `--pro` | #c2410c | #c2410c (inherited, not overridden) | Dark primary stays the light accent |
| `--ok` | #127a3a | #30d158 | |
| `--warn` | #a84e00 | #ffb340 | |
| `--bad` | #c8261b | #ff6961 | |
| `--fill` | rgba(118,118,128,.12) | rgba(118,118,128,.24) | |
| `--fill2` | rgba(118,118,128,.24) | rgba(118,118,128,.36) | |
| `--segsel` | #ffffff | #636366 | |
| `--dim` | rgba(0,0,0,.22) | rgba(0,0,0,.5) | |
| `--tog` | #e3e6eb | #39393d | |
| `--chip` | #0b0d12 | #f5f5f7 | |
| `--chipfg` | #ffffff | #0b0d12 | |
| `--press` | #e5e5ea | #2c2c2e | |
| `--cell` | #ffffff | #333336 | |
| `--edge` | #f2f2f7 | #000000 | |
| `--gt` | .1 | .1 (inherited) | glass tint |
| `--gk0` | .55 | 0 | |

Cross-platform deltas:
- Status colours differ in dark. Android `--ok` #5cc98a, `--warn` #f2a54a, `--err` #ff7b6e. iOS `--ok` #30d158, `--warn` #ffb340, `--bad` #ff6961. Owner decision: one set or two.
- Dark accent. Android dark uses `--acx`/`--aci` #ff8a3d and keeps primary-button fill `#c2410c` hardcoded. iOS dark sets `--tint` #ff8a3d and keeps `--pro` #c2410c. Both keep the primary button fill at #c2410c in dark. Owner decision: keep, or switch the dark primary to #ff8a3d.
- Light dim is `.22` on iOS and `--scrim` .45 on Android. Dark dim is `.5` on iOS and `.6` on Android.

Hardcoded colours in iOS (not tokenised): `#000` 25 (stroke and mask), `#ffffff` 28, `#c2410c` 13, `#0b0d12` 9, `#5a55d6` 5 (disp tile), `#0789b0` 5 (col tile), `#2c2c2e` 3 (`.ph` and dark sheet), `#a84e00` 2, `#5b6270` 2 (exp tile), `#ff6961` 2 (logout in dark), `#0b9468` 1 (af tile), `#1f1f1f` 1 (Google button label on `#ffffff`). Logout is `#d70015` in light.

Tile colour map (iOS `const C`): `cam #c2410c`, `exp #5b6270`, `af #0b9468`, `wb #a84e00`, `col #0789b0`, `disp #5a55d6`. Android tile colours are set per tile in markup, not in a shared map, and the values match the iOS map.

### 1.4 Motion

Four iOS spring curves are `linear()` strings. Verbatim from `AlphaIOS.stripped.html` lines 26-29. In React Native, implement with Reanimated `withTiming` or `withSpring` after sampling, or accept a close approximation (note: these are not cubic-bezier).

```css
--sp-push:linear(0, 0.04, 0.13, 0.24, 0.354, 0.462, 0.558, 0.641, 0.711, 0.77, 0.818, 0.856, 0.887, 0.912, 0.932, 0.947, 0.959, 0.969, 0.976, 0.981, 0.986, 0.989, 0.992, 0.994, 1);
--sp-sheet:linear(0, 0.038, 0.129, 0.246, 0.37, 0.49, 0.6, 0.695, 0.775, 0.839, 0.89, 0.929, 0.958, 0.978, 0.992, 1.002, 1.007, 1.01, 1.011, 1.011, 1.01, 1.009, 1.007, 1.006, 1.005, 1.004, 1.003, 1.002, 1);
--sp-btn:linear(0, 0.061, 0.207, 0.394, 0.587, 0.761, 0.904, 1.009, 1.078, 1.115, 1.126, 1.119, 1.101, 1.078, 1.054, 1.031, 1.013, 0.999, 0.991, 0.986, 0.984, 0.985, 0.987, 0.99, 1);
--sp-seg:linear(0, 0.05, 0.165, 0.308, 0.455, 0.59, 0.706, 0.801, 0.874, 0.929, 0.967, 0.992, 1.008, 1.016, 1.019, 1.02, 1.018, 1.015, 1.013, 1.01, 1.007, 1.005, 1.003, 1.002, 1);
```

Durations and curves.

Android (CSS transitions and keyframes):
- `background .3s cubic-bezier(0.16,1,0.3,1)`
- `left .3s` and `transform .3s` with the same curve
- `background-color .2s`
- `stroke-dashoffset .4s cubic-bezier(0.16,1,0.3,1)` (progress ring)
- `flex-grow .4s cubic-bezier(.2,0,0,1)`
- `acl-spin .8s linear infinite` (spinner)
- `acl-pulse 1.4s ease-in-out infinite` (opacity 1 to .35 to 1)
- `acl-pop .6s cubic-bezier(0.16,1,0.3,1) both` (scale .6/opacity 0 to 1.06/opacity 1 at 60% to none at 100%)

iOS (CSS transitions and keyframes):
- `.stage` transform and border-radius `.55s var(--sp-sheet)`. Back state is `translateY(14px) scale(.94)` with radius 42px.
- `.pr` (press) `transform .5s var(--sp-btn)`; `:active` scale on the button is removed under reduced motion.
- `.mo` (morph) flex-grow, flex-basis, max-width, margin, padding `.45s var(--sp-seg)`; opacity `.25s`; background-color and color `.3s`; transform `.5s var(--sp-btn)`.
- `.seg-t` (segment thumb) `transform .5s var(--sp-seg)`.
- `ios-push-in/out` `.5s var(--sp-push)`.
- `ios-pop-in/out` `.5s var(--sp-push)`.
- `ios-dim-in/out` `.5s` (curve not set).
- `ios-fade-in` `.35s ease-out`; `ios-fade-out` `.24s ease-in`; `.navt` opacity `.2s`.
- `ios-sheet-in` `.6s var(--sp-sheet) backwards`; `ios-sheet-out` `.24s cubic-bezier(.4,0,1,1)`.
- `ios-bounce` `.75s ease-out both`.
- `ios-spin` `.9s steps(8) infinite` (not a smooth spinner; 8 steps per turn).
- `ios-pulse` `1.4s ease-in-out infinite`.

Reduced motion:
- Android: `@media (prefers-reduced-motion:reduce)` sets `animation:none!important; transition:none!important` on all descendants of `.acl`.
- iOS CSS: animations removed on `.scr`, `.sheet-in`, `.sheet-out`, `.dim-in`, `.dim-out`, `.bounce`, `.pulse`, `.navt.fade`. Transitions removed on `.stage`, `.seg-t`, `.sgx`, `.pr`, `.cs`, `.mo`. `.pr:active` transform is set to none.
- iOS JS: `rm()` reads `matchMedia('(prefers-reduced-motion: reduce)')` (line 984). In React Native use `AccessibilityInfo.isReduceMotionEnabled()` and its change listener, then disable the same animations.

### 1.5 Type roles

Android (size/line/weight, uses in markup). Role names are proposals, and TBD means unresolved in this pass.

| Size/line/weight | Uses | Proposed role |
|---|---|---|
| 17/24/600 | 35 | `title` |
| 17/24/400 | 17 | `body` |
| 15/20/600 | 15 | `caption-strong` |
| 15/20/400 | 14 | `caption` |
| 17/26/400 | 7 (root) | `body` (line 26 at root, 24 in content: owner check) |
| 16/24/600 | 7 | `label` |
| 20/28/700 | 7 | `h3` |
| 24/32/700 | 5 | `h2` |
| 16/22/600 | 5 | `label-sm` |
| 17/26/600 | 5 | `title` (line 26 variant) |
| 17/48/600 | 4 | TBD (48px-high row, likely button label) |
| 16/32/700 | 3 | TBD |
| 28/36/700 | 2 | `h1` |
| 15/22 (weight unset) | 2 | TBD |
| 22/28/700 | 2 | `h3` |
| 17/24/700 | 2 | `title-bold` |
| 32/40/700 | 1 | `display` |
| 16/48/600 | 1 | TBD |
| 30/40/700 | 1 | `display-sm` |
| 16/24 | 1 | `body-sm` |
| 44/52/700 | 1 | `progress-num` (progress readout) |
| 16/24/700 | 1 | `label-bold` |

Android font-size totals: 17px×72, 15px×32, 16px×19, 20px×7, 24px×5, 28px×2, 22px×2, 32px×1, 13px×1 (the "G" glyph), 30px×1, 44px×1.

iOS roles (defined by class, not by frequency):

| Class | Size/line | Weight | Tracking | Uses |
|---|---|---|---|---|
| `.t-lt` large title | 34/41 | 700 | -0.8 | 1 |
| `.t-t2` title 2 | 22/28 | 700 | -0.4 | 1 |
| `.t-hl` headline | 17/22 | 600 | -0.4 | 4 |
| `.t-sub` subhead | 15/20 | inherits | -0.2 | 26 (frequency leader) |
| `.sec-h` section header | 17/22 | 600 | -0.4 | |
| `.num` numeric | 40/48 | 700 | -0.8 | 1 |
| body (default) | 17/22 | inherits (400) | -0.4 (8 uses), inherits (4 uses) | 12 |
| `.cap` button label | 17/22 | 600 | -0.4 | 50px-high button |
| (other) | 44/52 | 700 | inherits | 1 (`progText`) |
| (other) | 16/21 | inherits | -0.3 | 1 |
| (other) | 20/25 | inherits | inherits | 2 |

iOS font-size totals: 15px×27, 17px×20, 20px×2, 34px×1, 22px×1, 13px×1, 44px×1, 16px×1, 40px×1.

Mapping gap: Android 16/24 and 16/22 (`label`, `label-sm`) have no iOS equivalent. iOS `.t-sub` 15/20 is the most used text role, and Android `caption` 15/20 is the matching role.

### 1.6 Radii

Android: `999px`×61 (pill), `50%`×25 (circle), `24px`×21, `14px`×20 (toast), `8px`×12, `2px`×6, `16px`×3 (account menu), `12px`×3, `4px`×3, `24px 24px 0 0`×4 (create and camera sheets), `3px`, `1px`, `0`, `18px`, `6px`.

iOS: `999px`×19, `50%`×11, `8px`×7, `26px`×5 (card), `3px`×4, `14px`×4, `12px`×3, `2px`×2, `16px`×2, `30px`×2, `42px`×1 (stage back state), `38px 38px 0 0` (full sheet), `38px 38px 47px 47px` (floating adjust sheet), `7px`, `10px` (`.ph` placeholder), `9px`, `28px`, `6px`, `0`.

### 1.7 Spacing

Android gap: 12px×40, 8px×23, 16px×15, 6px×12, 14px×9, 4px×8, 10px×8.
Android padding: `12px 16px`×8, `4px 16px 24px`×6, `4px 16px`×6, `16px`×5, `12px`×5.

iOS gap: 12px×20, 8px×20, 10px×7, 6px×6, 14px×5, 20px×4, 5px×4, 4px×3, 24px×3, 2px×3.
iOS page offsets: top 98px and bottom 124px (×3 each), plus 110px, 116px, and 232px variants. The top and bottom offsets are the content inset under the status bar and above the bottom bar. Use them as safe-area constants.

### 1.8 Control heights and touch targets

Android heights: 48px×52, 32px×12, 40px×6, 56px×5, 72px×5, 38px×4, 44px×2. Min-heights: 56px×13, 52px×7, 96px×3, 24px, 64px, 48px. The Google sign-in button is 52px pill. The "Để sau" ghost button is 48px.

iOS heights: 44px×18 (rows and inputs), 52px×5, 36px×7 (`.tb` and `.tbc` top bar buttons), 50px×3 (`.cap` capsule button), 40px×3, 48px×2, 57px×2, 38px×2 (`.seg-b` segment button), 20px×2 (`.grab` sheet grabber), 86px×3, 114px×11 (not explained, see the ambiguities list). `.tbc` width 36px×8.

Touch targets (below platform minimums):
- iOS `.tbc` is 36px. HIG minimum is 44pt. Proposed: a 44x44 hit slop around the 36px visual.
- Android icon buttons are 32px with `.hit::after` extending top and bottom by 4px, which is about 40px. Material minimum is 48dp. Proposed: 48dp hit slop (`hitSlop` 8 on a 32dp visual).

### 1.9 Shadows and elevation

Android: toast `0 6px 18px rgba(0,0,0,.25)`; menu `0 8px 28px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.16)`; small `0 1px 3px rgba(0,0,0,.2)`; ring `inset 0 0 0 1px rgba(255,255,255,.08)`; focus `inset 0 0 0 2px var(--tx)`. Two dynamic shadows come from the data (`{{ o.sh }}` for option cards and `{{ t.ring }}` for tile rings).

iOS: sheet `inset 0 1px 0 rgba(255,255,255,.16), 0 -6px 30px rgba(0,0,0,.3)`; out-push `-10px 0 30px rgba(0,0,0,.3)`; edge `inset 0 1px 0 rgba(255,255,255,.3), inset 0 -1px 0 rgba(0,0,0,.25), 0 8px 24px rgba(0,0,0,.3)` (variants at .45/.2); `0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.08)`; `0 3px 8px rgba(0,0,0,.12), 0 1px 1px rgba(0,0,0,.04)`; `0 4px 12px rgba(0,0,0,.08)`; `0 8px 24px rgba(0,0,0,.18)`; `0 16px 48px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12)`; rings `inset 0 0 0 1px rgba(255,255,255,.08)` (dark) and `inset 0 0 0 1px rgba(0,0,0,.14)` (light).

RN mapping: iOS shadows use `shadowColor/Offset/Opacity/Radius`. Android uses `elevation`, which does not match the blur or offset values. Proposed: keep the iOS values on iOS, and map Android menu and toast to `elevation` 8 and 6 with the shadow colour.

### 1.10 Focus and selection

- Android: `.acl-q:focus-within` adds `inset 0 0 0 2px var(--tx)` to the field wrapper. Placeholder colour is `var(--tx2)` at opacity 1.
- iOS: no focus style is defined. Use the system default.

### 1.11 Icons and tiles

Icons are 28 SVG files in `App.Alphacolorlab/assets/v21/icons/`. The Android progress ring uses a `RING` constant of 565.49 (ring circumference), animated with `stroke-dashoffset`.

### 1.12 iOS glass knockout (`gk`)

iOS only. Android has no glass material.

- `.ios .glass` sets `--gk: var(--gk0)`, then paints a black overlay `rgba(0,0,0,var(--gk))` over the translucent fill `rgba(255,255,255,var(--gt))`. `--gk0` is `.55` in the light token block and `0` in the dark one. `--gt` is the glass tint token.
- Static classes: `.gk30` = .30, `.gk46` = .46, `.gk52` = .52, `.gk55` and `.onimg` = .55. None of these rules use `!important`.
- `@property --gk` is registered as `<number>`, `inherits: false`, `initial-value: 0`, so the `--gk .18s linear` transition animates.
- Live adaptation runs only when the `proto` prop is true. `proto` arms the rAF loop (collapsed file line 937) and adds the `blur` class to the root, which sets `--sheet` to `rgba(44,44,46,.8)`. When `proto` is false, the static classes and `--gk0` apply.
- `adapt()` samples a 3x2 grid per `[data-g]` element (x at 18/50/82% of width, y at 30/70% of height). It takes the brightest sample's luminance and computes `k = min(.55, max(0, 1 - 115 / (0.9 * gray + 25.5)))`, where `gray` is the sRGB value scaled to 0-255. It writes inline `--gk` only when the value moves by more than .01.
- Precedence (confirmed from source, not assumed): inline style beats class rules. With `proto` on, the adapted value replaces the `.gk*` class value after the first frame. The class values remain the fallback before that frame and whenever `proto` is off.
- Screen 6 class map (`TBK`). Applied only when `screen === 6 && top6 && live === 'ok'`. Otherwise the class is empty and `--gk0` applies.

| Variant | Back (`tbB`) | Shoot (`tbC`) | Fullscreen (`tbF`) |
|---|---|---|---|
| bright | `gk52` | `gk55` | none |
| dim | none | none | none |
| default | `gk30` | `gk46` | none |

- The fullscreen button never gets a class, so it uses `--gk0` (light .55, dark 0) unless `proto` is on.
- The `onimg` class (.55) is used on the preset collect button over the preset image (collapsed file line 267).

## 2. Screens

Nine screens share one id space on both platforms (0 intro through 8 device pick). Default screen is 1 (Android state init line 667; iOS line 921). Sheets and dialogs sit on top of a screen and do not change its id (section 2.5). Line refs: Android `/tmp/v21work/AlphaApp.stripped.html`, iOS `/tmp/v21work/AlphaIOS.collapsed.html`.

### 2.1 Screen inventory

| Id | Name | Android header title (line 724) | iOS nav title (lines 1072-1074) | Back | Notes |
|---|---|---|---|---|---|
| 0 | Intro | none | none | Only when entered from menu (`introBack`); otherwise skip "Bỏ qua" top-right | Re-entrant from menu |
| 1 | Presets | "Chọn bộ màu" | "Chọn bộ màu" (inline) | none | Home; menu opens here only |
| 2 | Slot edit | "Chỉnh slot" | "Chỉnh slot" | to 1, `sh:null` | iOS adds undo and "Xong" (ambiguity I) |
| 3 | Camera connect | "Cắm máy ảnh" | "Cắm máy ảnh" | direct: to 1; edit: to 2 stage 4 | 2200 ms wait, then `cam:'ok'` |
| 4 | Write | T4 (line 723) | T4 (line 1071) | none | Title: "Đang ghi…" / "Đã ghi xong" / "Chưa ghi được" |
| 5 | Recall checklist | "Gọi lại trên máy" | "Gọi lại trên máy" | none | Restore entry point |
| 6 | Preview | "Xem thử" | none (`''`) | to 5, `full:false` | Live view (ambiguity D) |
| 7 | Sign-in | hidden (`hdShow` false) | no top bar | none | Ambiguity A |
| 8 | Device pick | none | none | to 7, `signing:false` | Camera list, "Xem trước" |

### 2.2 Flow and transitions

Both platforms implement the same graph. Android uses `go(n)` (lines 688-693) and `setState`; iOS uses `go(n)` (line 1038) and `nav(n, opts)`. Timers are listed in section 1.4.

| From | Trigger (Android / iOS handler) | To | Effect |
|---|---|---|---|
| 7 | "Tiếp tục với Google" (`signIn`) | 8 | Spinner 900 ms, then sets a placeholder account and `signing:false` |
| 7 | "Để sau" (`signLater`) | 8 | `acct:''` |
| 8 | "Xem trước" (`obPreview`) | 0 | `camSel: obCam` |
| 8 | "Tiếp tục với {cam}" (`obNext`) | 0 | Needs a camera (`obCam`); disabled otherwise |
| 0 | "Chọn bộ màu" (`toStart`) | 1 | Clears `introBack` if set |
| 1 | Edit slot M1 (`toEdit`) | 2 | `slot:'M1'`, `stage:1` |
| 1 | "Ghi bộ này" (`toPlug`) | 3 | `via:'direct'` |
| 1 | Menu "Xem giới thiệu M1–M4" (`mIntro`) | 0 | `introBack:true`, closes camera sheet |
| 2 | Stage next (`next`) | 2 or 3 | Stages 1 to 3 advance by one; stage 4 sets `via:'edit'` and calls `go(3)` |
| 2 | Stage prev (`prev`) | 2 or 1 | At stage 1 goes to screen 1 |
| 3 | Back (`back3` / `back`) | 1 or 2 | direct: 1; edit: 2 at stage 4. Clears camera timer |
| 3 | "Ghi M1–M4 vào máy" (`toWrite`) | 4 | Only when `cam` is `ok` |
| 3 | "Kiểm tra lại" (`recheck`) | 3 | Calls `go(3)`; restarts the wait |
| 4 | Runs `runWrite` | 4 | 4 steps x 600 ms; `prog` 0 to 4 |
| 4 | "Gọi lại trên máy" (`toLoad`) | 5 | Done footer only |
| 4 | "Thử lại" (`retry`) | 4 | Fail footer; calls `runWrite` again |
| 4 | "Kiểm tra cáp" (`back3`) | 3 | Fail footer |
| 5 | "Xem thử" (`toPreview`) | 6 | `live:'none'`; iOS also sets `top6:true` |
| 5 | "Khôi phục" | dialog | Section 2.5(e) |
| 6 | Back | 5 | `full:false` |
| 6 | "Chỉnh lại slot" (`reEdit`) | 2 | `slot:pv`, `stage:1` |
| 6 | "Hoàn tất" (`finish`) | 1 | `checks` reset; toast (section 2.6) |

Verified: moving from 5 to 6 has no checklist gate on either platform. The camera error card (`cam:'error'`) is reachable only from the initial variant; `go(3)` always resolves to `ok` after 2200 ms. The "Chỉnh lại slot" label on screen 6 is the same on both platforms (Android line 589; iOS within lines 532-600). No difference.

### 2.3 Slot edit stages (screen 2)

Four stages. Labels come from `NEXT` (line 638), identical on both platforms: "Tiếp: AF", "Tiếp: Màu & da", "Tiếp: Hiển thị", "Tiếp: Cắm máy". The stage-4 label is the design's; the repo has three labels (ambiguity J).

- Stage 1 (AF): rows with a "đã sửa" (edited) marker per row, bound to `r.label` / `r.val`.
- Stage 2 (Màu & da): skin rows (`sk.label` / `sk.val`) and a Picture Profile card (`icPP` on iOS). Android has a "Nâng cao" disclosure (`advOpen`); iOS has the same as `icSliders` (`Nâng cao`).
- Stage 3 (Hiển thị): iOS has a Profile row (`icFilm`, `ppSum`); the stage-to-content mapping was not traced for Android.
- Footer: `resetLabel` = "Đặt lại {slot} về bản gốc" (Android line 680 toast; iOS `resetLabel` line 1167) and `nextLabel` (`NEXT[stage-1]`).

### 2.4 Per-screen layout

Shared chrome: Android top bar is the header row (`hdShow`, `hdBack`, `hdSkip`, `hdHelp`, lines 17-22). iOS top bar is `inlineNav` (absolute, top 54px, height 44px, lines 611-629; see section 3.3).

**2.4.1 Screen 0 Intro.** Headline "M1–M4 lên máy, gọi bằng MR" with a sample slot card (slot `s.m`, mode `MR`). Sample metering row "Đo sáng" / "Như máy" and footnote "App không ghi mục này, máy giữ nguyên giá trị đang đặt". Three intro rows (iOS `introRows`, line 1079): "Một bộ màu có 4 cảnh: M1–M4", "Ghi cả 4 vào máy qua cáp USB-C", "Lúc chụp: MODE → MR → chọn 1–4". Primary button "Chọn bộ màu" (`toStart`). Android rows use `x.n` / `x.t` data; the strings are not extracted in this pass.

**2.4.2 Screen 1 Presets.** Tabs: "Khuyên dùng" | "KOL" | "Của tôi" with count (`nMine`, `' · '+nMine`), Android lines 736-739; iOS uses the same `tab` keys (`rec`, `kol`, `mine`). Camera row: label "Máy ảnh", value `camSel`, action "Đổi máy ảnh" opens the camera sheet. Preset cards: name `p.name`, author `p.by`, four slot chips (`s.m`, `s.name`), collect label `p.collectLabel`. Empty "Của tôi" tab: "Chưa có bộ nào" with "Tạo bộ mới" (plus icon, `icPlus`) and "Xem bộ Khuyên dùng". Footer: `pickHint` and one of "Ghi bộ này" or disabled "Chưa hỗ trợ {camSel}" (Android lines 186-187; iOS `b2Label`, line 1105). Help or avatar opens the menu (Android `hdHelp` line 22; iOS `tb1` line 1077).

Preset data: design uses presets p1 "Alpha Cơ bản" (Khuyên dùng), p2 "Vlog ngoài trời" (Khuyên dùng), k1 "Film Sài Gòn" by Minh Quay (KOL), k2 "Da ấm" by Linh Vlog (KOL) (lines 630-633). The repo has no KOL tab and different ids (gap 2).

**2.4.3 Screen 2 Slot edit.** Header title "Chỉnh slot". Slot chips for M1–M4 (`s.m`). Stage content per 2.3. Android has no "Xong" control; back returns to screen 1 (ambiguity I). iOS top bar: undo (`tb2`, `undoOp` 1 or 0.35 when `histN` is 0, label "Hoàn tác") and "Xong" (`doneEdit`, line 623) which goes to screen 1 with `sh:null`.

**2.4.4 Screen 3 Camera connect.** Spinner row "Chờ máy ảnh…" with model "ZV-E10" (`icDrive` on iOS). Disclosure "Chi tiết" (`detOpen`) shows "Thẻ chưa được format trong máy", "MENU › Thiết lập › Format", "Format sẽ xoá hết ảnh trên thẻ". Steps:
- Step 1: "Chọn Mass Storage" (Android lines 376-463; iOS lines 363-465).
- Step 2: "Kết nối USB" / "Mass Storage" / "Cắm cáp USB-C".
- Step 3 (wording differs, ambiguity C): Android "Chọn ổ ZV-E10", followed by the system permission dialog with "Huỷ" and "Cho phép" (system UI, not app UI, Android line 442); iOS "Chọn thẻ trong Tệp" with the Files picker, aria "App Tệp: chọn ổ ZV-E10 rồi nhấn Mở", button "Mở" (iOS lines 412-419).
- Footer by state: waiting → disabled "Chờ máy ảnh…" (Android background `var(--ln)`, line 457); ok → "Ghi M1–M4 vào máy" (`toWrite`); error → "Kiểm tra lại" (`recheck`). Error card shows "Không thấy máy" (Android line 277).

**2.4.5 Screen 4 Write.** Progress ring: circumference `RING` 565.49; stroke offset `RING*(1-prog/4)`, animated with `stroke-dashoffset`; centre text `progText` (`prog+'/4'`). Caption "Đừng rút cáp" while running. Done: "Đã ghi M1–M4" with footer "Gọi lại trên máy" (`toLoad`). Fail: "Máy vẫn giữ bộ cũ" with footer "Kiểm tra cáp" (`back3`) and "Thử lại" (`retry`). Footer hidden while running (`wHasFoot`). Done-tick animation: Android `acl-pop .6s cubic-bezier(0.16,1,0.3,1) both` (`tickAnim`); iOS class `bounce` (`tickCls`). `runWrite` has no failure branch; the fail state is only reachable from the initial variant. iOS footer: done → single "Gọi lại trên máy" (`b4F:'0 0 0px'`); other → two buttons, "Kiểm tra cáp" and `b4Label` = "Thử lại" (`b4F:'1 1 0px'`).

**2.4.6 Screen 5 Recall checklist.** Title "Gọi lại trên máy", no back. Three checklist items from the repo's `recallChecklist` copy, matching the design: "Rút cáp", "Tắt rồi bật máy", "Chọn Gọi lại, đừng chọn Lưu". Mode instruction: "MR" / "Bấm MODE, chọn MR". Checkboxes state in `checks` (3 booleans); they do not gate navigation. Buttons: "Khôi phục" (outline pill, 48px Android, opens restore dialog) and "Xem thử" (`toPreview`).

**2.4.7 Screen 6 Preview.** Header "Xem thử" on Android; no title on iOS (ambiguity D). Body: slot label (`o.label`), connection guide "Chọn PC Remote" → "Kết nối USB" → "PC Remote" (repo `guideTitle` "Chọn PC Remote"), live state:
- `none`: guide shown with live view off copy. Android key `liveViewOff` was not located in this pass.
- `checking`: spinner row with `recheckLabel`. Recheck handler sets `checking` and then `ok` after 1100 ms (both platforms).
- `ok`: live image; iOS top bar tints via `TBK` only when `top6 && live==='ok'` (section 3.3).

Snapshot strip "Ảnh nhanh" with per-slot cells ("Chưa chụp" when empty), shoot button "Chụp vào M{n}" (`shootLabel`). Shoot toast "Đã chụp vào {pv}". iOS shoot is gated on `live==='ok'`; Android gating is not verified (ambiguity M). Full-screen (`full`): Android close "Đóng" 48px at top 44px, right 16px (line 595); iOS `openFull` only when live is ok, `closeFull` on the top bar. Footer: "Chỉnh lại slot" (`reEdit`) and "Hoàn tất" (`finish`).

**2.4.8 Screen 7 Sign-in.** No top bar. Brand "Alpha Color Lab". Subtitle "Bộ màu M1–M4 cho máy Sony của bạn, ghi thẳng vào máy qua cáp USB-C". Primary "Tiếp tục với Google" (`gLabel`, Android line 749); while signing shows "Đang đăng nhập…" with a spinner (Android `acl-spin .8s linear infinite`, iOS `ios-spin .9s steps(8) infinite`); `aria-busy` on Android. Secondary "Để sau" (`signLater`). Menu item labels are different (section 2.5(a)).

**2.4.9 Screen 8 Device pick.** Title "Bạn đang dùng máy nào?". Camera list grouped into "Đã hỗ trợ" (CAM_OK: ZV-E10) and "Sắp có" (CAM_SOON: A6400, A6700, A7C, A7C II, A7 IV, ZV-E1). Row shows name (`c.name`; iOS icon `c.ic`). Soon rows have a notify toggle (`obNotifyLabel`, "✓" when on) and a toast (section 2.6). Status "Không thấy máy" (role status, Android line 82). Footer: "Xem trước" (`obPreview`) and primary `obLabel` = "Tiếp tục với {cam}" when a supported camera is chosen, otherwise "Chọn máy để tiếp tục" (disabled, `obNoGo2` on iOS).

### 2.5 Sheets and dialogs

**(a) Account menu** (screen 1 only; `menu` state). Android lines 192-206: account header (`acctI` / `menuName` / `menuSub`), then "Đổi máy ảnh" (`mCam`, opens camera sheet), "Bộ của tôi" (`mMine`, sets tab mine), "Tạo bộ mới" (`mNew`, tab mine and create sheet), "Xem giới thiệu M1–M4" (`mIntro`), and "Đăng xuất" (`mOut`) when signed in or "Đăng nhập với Google" (`mIn`) when signed out. iOS lines 1119-1127: `menuA` has four items (Đổi máy ảnh, Bộ của tôi, Tạo bộ mới, Xem giới thiệu M1–M4); `menuB` shows "Đăng xuất" only when an account is set, in `#d70015` (light) or `#ff6961` (dark), going to screen 7 with `acct:''`. iOS shows no sign-in item when signed out (ambiguity B).

**(b) Camera sheet** (on screen 1; `camSheet`). Android lines 245-285: dialog "Chọn máy ảnh", fixed height 600px, radius 24px 24px 0 0, grabber 36x4, scrim `closeCams`, close "Đóng" 48px (line 251). Search focused on open (`openCams` then `focusQ`), placeholder "Nhập tên máy, vd. ZV-E10". Groups "Đã hỗ trợ" and "Sắp có", empty state "Không thấy máy" (line 277). iOS: `csH` is 790px when `camDet==='l'` (full width, radius 38px 38px 0 0) and 440px floating when medium (inset 8px, radius 38px 38px 47px 47px). `openCams` sets `camDet:'m'` (line 1147). Close is "Xong" (line 703). Ambiguity L.

**(c) Adjust sheet** (screen 2; `sh`). Android lines 341-375: scrim `shClose`; panel radius 24px 24px 0 0, padding 12px 20px 40px, gap 16px; grabber 36x4; title `shTitle` (24/32, 700); "Tự động" switch (`shAuto`, `role="switch"`, value `shVal`); steppers `shDec` / `shInc` (72px, aria "Giảm" / "Tăng"); "Áp cho cả 4 slot" (`shAll`); hold toggle (`shHold`, `aria-pressed`, 48px pill); confirm "Đặt" (`shSet`, background `var(--hi)`). iOS line 746: floating panel at left 8px, right 8px, bottom 8px, height 440px, radius 38px 38px 47px 47px; close aria "Huỷ" (line 750); values from a wheel of 44px `<button>` items (`wheel`, `w.onClick`, `w.dis`, `w.aria`, lines 767-1196). Ambiguity G.

**(d) Create sheet** (screen 1; `crSheet`). Android lines 207-244: scrim `closeCreate` (line 208), height 860px, radius 24px 24px 0 0, dialog aria "Bộ mới". Header: close "Đóng" 48px (line 212) and text action `makeCreate` (line 214), disabled while `crNoMake`. Fields: "Tên bộ" (placeholder "Ví dụ: Cưới ngoài trời"), "Dựa trên" (base preset), "Tên cảnh" per slot with placeholders from the base. Saves a copy to "Của tôi"; toast after 320 ms. iOS line 640: height 790px, radius 38px 38px 0 0, dialog aria "Bộ mới", cancel "Huỷ" (`closeCreate`, line 644), same fields. Ambiguity H.

**(e) Restore dialog** (screen 5; Android `openSheet` line 519, dialog lines 523-531; iOS `dialog`, `openDialog` / `closeDialog`, line 805). Title "Khôi phục bản trước?", body "Bộ trên máy sẽ thay bằng bản đã sao lưu.", cancel "Huỷ" (`closeSheet`, Android 48px pill; iOS `closeDialog` 57px tint pill), confirm "Khôi phục" (`doRestore`, Android background `var(--hi)`; iOS `doRestore` closes and toasts). Ambiguity K.

### 2.6 Toasts

Plain toast 2400 ms; action toast (undo) 4000 ms. Android `toastMsg` line 685 supports an action; iOS `toastMsg` line 1037 is plain only.

| Trigger | Android text (line) | Android undo | iOS text (line) | iOS undo |
|---|---|---|---|---|
| Reset slot | "Đã đặt lại {s} về bản gốc" (680) | Yes ("Hoàn tác") | "Đã đặt lại {s} về bản gốc" (1031) | No |
| Notify (soon camera) | "Sẽ báo qua {acct} khi {cam} được hỗ trợ" / "Sẽ báo khi {cam} được hỗ trợ" (756) | No | Same (1115) | No |
| Create set | "Đã tạo “{name}”" after 320 ms (778) | No | Same, after 320 ms (1141) | No |
| Apply one (edit) | "Đã đặt {title} · {slot}" (810) | Yes | No iOS equivalent located | n/a |
| Apply all (`shAll`) | "Đã áp {title} cho M1–M4" (815) | Yes | "Đã áp cho M1–M4" (1205) | No |
| Restore | "Đã khôi phục bản trước" (839) | No | "Đã khôi phục bản trước" (1227) | No |
| Shoot | "Đã chụp vào {pv}" (852) | No | "Đã chụp vào {pv}" (1244) | No |
| Finish | "Bộ {P.name} đã nằm trên máy" (858) | No | "Bộ {P.name} đã nằm trên máy" (1251) | No |

Undo mechanics (Android): `pushHist()` stores `{vals, hold, edited}` (cap 30, line 686); `undo()` pops and restores (line 687). iOS top-bar undo uses the same `undo()` and `histN` (line 1081). Ambiguity E.

### 2.7 RN route mapping (plain paragraphs)

Screen 0 maps to `src/app/onboarding/intro.tsx`. That file replaces to `/` (line 27), so the re-entrant intro from the menu needs a route param (`introBack`) that does not exist yet. Screen 1 maps to `src/app/index.tsx`. Screen 2 maps to `src/app/sets/[id]/edit.tsx`, which has a "Hoàn tác | Xong" capsule (matches iOS; not the Android design, ambiguity I). Screen 3 has no dedicated route in `src/app`; the closest is the write flow, and the camera-connect copy differs (gap 3). Screen 4 maps to `src/app/write.tsx`; `index.tsx` line 97 pushes `/write` with `{ id }`. Screen 5 has no matching route; `src/app/backups.tsx` is card restore, not on-machine restore (gap 4). Screen 6 maps to `src/app/preview.tsx`. Screens 7 and 8: no route for sign-in (gap 1); `src/app/onboarding/device.tsx` is the nearest match for the camera pick (unverified). `src/app/onboarding/access.tsx` is an extra all-files gate with no design counterpart (gap 9).

## 3. Device frame

Both design files draw a fixed device canvas: Android at `$preview` 412x915, iOS at 393x852. The app must not copy these canvases. It uses the real device's safe areas, and the OS draws the status bar, gesture bar, and Dynamic Island. The values below serve as visual parity references only.

### 3.1 Android frame (412x915)

| Element | Design value | Source (`AlphaApp.stripped.html`) |
|---|---|---|
| Root | 412x915, relative, overflow hidden, bg `var(--bg)`, Noto Sans, column flex, 17/26 | line 12 |
| Status bar | 36px high, padding 0 24px, "9:41" left (15/20, 600), "86%" and battery right | lines 13-14 |
| Battery | 22x11, border 1.5px `#0b0d12`, radius 3px, inner fill 75% | line 15 |
| Home bar | 24px high, bg `var(--sf)`, centred pill 108x4, radius 2px, bg `var(--tx)` | line 611 |
| Sheet grabber | 36x4, radius 2px, on each sheet | lines 210, 248, 344, 526 |
| Toast | role status, absolute, left 16, right 16, bottom 100px, min-height 48px, radius 14px, bg `var(--inv)`, text `var(--invtx)` 16/24 | toast block (search `bottom:100px`) |

No edge band or blur layer was located in the Android frame.

### 3.2 iOS frame (393x852)

| Element | Design value | Source (`AlphaIOS.collapsed.html`) |
|---|---|---|
| Root | 393x852, bg `#000000` outside the stage, colour `var(--tx)` | line 100 |
| Stage | absolute inset 0, bg `var(--bg)`, transform origin 50% 0, transition `transform .55s var(--sp-sheet)` and `border-radius .55s` | line 41 |
| Stage back | `translateY(14px) scale(.94)`, radius 42px; applied via `stageCls` | lines 42, 1087 |
| Screen layer | `.scr` absolute inset 0, bg `var(--bg)`; `.sc` absolute inset 0, overflow-y auto, overscroll contain | lines 43-48 |
| Push | in: z 2, `ios-push-in .5s var(--sp-push)`, shadow -10px 0 30px rgba(0,0,0,.3); out: z 1, `ios-push-out`, pointer-events none, `#000` dim `ios-dim-in .5s` | lines 44-46 |
| Pop | in: z 1, `ios-pop-in`; out: z 2, `ios-pop-out` with shadow; dim `ios-dim-out` | lines 46-47 |
| Top bar `.tb` | 36px high; hit area extends 5px each side (44pt total); `.tbc` 36px circle; `.tbt` text pill padding 0 14px, radius 999px | line 95 |
| Bottom bar `.bbar` | left 16, right 16, bottom 26, gap 12, z 20 | line 65 |
| Status overlay | absolute top 0, 54px high, z 32, pointer-events none, colour `sbC`; time in a 134px box at top 17; signal and battery right at top 20 | lines 809-812, 821 |
| Dynamic Island | 126x37 black pill, top 11, centred (margin-left -63px), radius 999px | line 811 |
| Toast | centred, top 60px, z 55, pill radius 999px, bg `var(--chip)`, text `var(--chipfg)` 15/20, nowrap | toast block (search `hasToast`) |
| Home indicator | 134x5 pill, radius 3px, centred, bottom 8px, colour `homeC` (white when `S.full`, else `var(--tx)`), z 60, pointer-events none | line 1065 |
| Top edge band | 96px high, z 18, solid to 54px then transparent at 96px | lines 168, 218 |
| Bottom edge band | 114px high, z 18, mask transparent to `#000` at 28px | lines 169, 219, 283, 346, 459, 524, 584 (partial list; screen mapping not fully traced) |
| Screen 1 bottom band | `e1H` = 114px when `S.collapsed`, else 96px; `onS1` sets collapsed when scrollTop > 40; scroller padding 98px top, 124px bottom | lines 228, 1083, 1084 |
| Blur mode | when `proto`: `.glass`, `.g-pro` blur 18px; `.sheet` blur 30px; edges rgba(0,0,0,.6) with blur 8px | lines 32, 96-98 (`.ios.blur` rules) |

Reduced motion: the iOS media query (line 99) removes `.scr`, sheet, and dim animations and sets `.stage`, press, and segment transitions to none. The JS `rm()` (line 984) mirrors it.

### 3.3 RN mapping (plain paragraphs)

Do not draw a device frame. Use `useSafeAreaInsets` from `react-native-safe-area-context` for top and bottom padding. The OS draws the status bar, the iOS Dynamic Island and home indicator, and the Android gesture bar, so do not reproduce "9:41", "86%", the battery, or the home pill. Set the status bar style with `expo-status-bar`, and enable edge-to-edge on Android.

Screen transitions use the native Stack from expo-router (`src/app/_layout.tsx`) for push and pop. Do not reimplement the `.stage` and `.scr` transforms. The stage "back" recede (scale .94, radius 42px) is a modal-style effect: use native modal or form-sheet presentation where a route is modal; if not, the recede is an open question (not covered by ambiguities A-M; flagged for owner review).

Edge bands are `LinearGradient` views (expo-linear-gradient), absolutely positioned with `pointerEvents="none"`, 96px at top and 114px at bottom, coloured from the `--edge` token. Screen 1's bottom band height follows a `collapsed` flag set when scroll offset exceeds 40. In blur mode, use `BlurView` (expo-blur) with a reduce-transparency fallback (`src/ui/useReduceTransparency.ts`).

Toast position: `insets.top + 8` on iOS (proposal; the design uses 60px inside its frame). Toast on Android sits above the bottom bar (proposal; check against the design on device).

Bottom bar: `insets.bottom + 12` (proposal; the design uses bottom 26 inside its frame).

Touch targets: a 36px visual control with `hitSlop` of 5 gives 44pt on iOS. On Android use 48dp minimum (section 1.8).

Motion: gate the edge fade, toast enter, and push effects on `useReduceMotion` (`src/ui/useReduceMotion.ts`), matching the design rules in section 1.4.

## 4. Gap map and ambiguities

### 4.1 Top 10 gaps

1. Sign-in (screen 7) and the account sign-in item have no route or strings in `src/` (A, B).
2. KOL tab and presets p1/p2/k1/k2 are absent; repo `src/home/homeTabs.ts` has only `recommended` and `mine`, and repo preset ids are `shoot-easy` and `zv-e10-hybrid`.
3. Camera-connect screen 3 has no dedicated route, and its step copy differs (C).
4. On-machine restore (screen 5, "Khôi phục bản trước?") is absent; `src/app/backups.tsx` restores card backups with different copy (K).
5. Undo model differs: Android has a toast undo (4000 ms, 30-entry history); iOS has top-bar undo and plain toasts; the repo edit screen has a "Hoàn tác | Xong" capsule and no toast undo (E).
6. Create sheet: design height 860px (Android) and 790px (iOS), with "Đóng" or "Huỷ"; repo `src/home/CreateSetSheet.tsx` uses a large detent and "Hủy" (H).
7. Adjust sheet control: design uses 72px steppers (Android) and wheel pickers (iOS); repo `ValuePicker` and `ValueRow` layout is unchecked (G).
8. Motion: design durations and spring curves (section 1.4) are not yet mapped to `src/ui/motion.ts` (`durations`, `springs`).
9. Onboarding: repo has an extra all-files gate (`src/app/onboarding/access.tsx`, no design counterpart) and runs device, then intro; design runs sign-in, device, intro (gap 1, A).
10. Scene images: design `IMGS` keys P, S, H, N (data URIs) do not map to repo `SceneThumb` assets; mapping is unverified (M).

### 4.2 Ambiguities

A. Sign-in: is Google sign-in in v21 scope (Android "Tiếp tục với Google", line 749), and is it required before onboarding? The repo has no sign-in strings.
B. Account menu when signed out: Android shows "Đăng nhập với Google" (`mIn`); iOS shows no sign-in item (`menuB` only when an account is set). Which should be adopted?
C. Camera step 3: Android reads "3 Chọn ổ ZV-E10" with a system dialog ("Huỷ", "Cho phép"); iOS reads "Chọn thẻ trong Tệp" ("Mở"). Which wording and flow?
D. Screen 6 title: Android header reads "Xem thử"; iOS nav title is empty (`NAV` map, line 1074). Which header?
E. Undo surface: Android uses toast undo (4000 ms) for reset, apply-one, and apply-all; iOS uses plain toasts plus top-bar undo on the edit screen. Which is canonical?
F. Bottom edge band: fixed 114px on the other screens, but 96/114 dynamic on screen 1 (`e1H`, `onS1`). Confirm screen 1 is the only dynamic case, and whether the stage recede needs a native modal (section 3.3).
G. Adjust control: Android uses 72px steppers with hold; iOS uses 44px wheel items in a 440px floating panel. Which control set?
H. Create sheet: Android 860px with a "Đóng" close; iOS 790px with "Huỷ". The repo uses "Hủy" with a large detent. Which height and cancel label?
I. Slot-edit done action: iOS "Xong" (`doneEdit`, line 623); repo "Hoàn tác | Xong"; no "Xong" on Android (checked). Which Android done action applies?
J. Stage-4 label: design has four NEXT labels ("Tiếp: AF", "Tiếp: Màu & da", "Tiếp: Hiển thị", "Tiếp: Cắm máy"); repo `nextLabels` has three.
K. Restore model: on-machine restore (screen 5) versus card backups (`backups.tsx`); copy "Khôi phục bản trước?" versus "Khôi phục bản sao lưu này?".
L. Camera sheet: Android fixed 600px with a 48px "Đóng"; iOS 790px large or 440px medium with "Xong" (line 703). Which size and close label? The repo CameraSheet detent is unverified.
M. Unverified items: Android create-sheet cancel label; Android adjust "Đặt" handler body; `liveViewOff` key absent on Android; Android shoot gating; Android lacks the `top6` hero tint (iOS only); iOS `camDet` default 'm' inferred from `openCams` (line 1147); no iOS equivalent for the single-apply toast; repo `ValuePicker` and `ValueRow` layout; repo CameraSheet detent; design `IMGS` mapping against `SceneThumb`.
