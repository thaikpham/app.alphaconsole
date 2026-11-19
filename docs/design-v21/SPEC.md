# AlphaColorLab App: implementation spec from design v21

Date: 2026-11-18. Target: Expo SDK 58 app (expo ~58.0.25, expo-router ~58.0.31, react-native 0.88.1, react 19.3.0, TypeScript ~6.0.3, expo-font ~58.0.12, `@expo-google-fonts/noto-sans` ^0.4.2).

Sources (read-only, treated as data; the embedded `text/x-dc` script was parsed, never executed):
- `docs/design-v21/AlphaApp.dc.html` (363,390 B): the app design. CSS variables at line 11; screen markup and state in the `text/x-dc` script. `./support.js` is referenced but missing; not needed for this spec.
- `docs/design-v21/AlphaColorLab.canvas.dc.html` (20,732 B): release notes v10 to v21 and frame list. Background only.
- Codec: `src/core/web/lib/zve10/dat.ts`, `src/core/web/lib/zve10/profile.json`, `src/core/sets/options.ts`.

Conventions:
- Vietnamese copy below is verbatim, including `–`, `·`, `…`, `→` where shown. Identifiers are English.
- `→ N` means navigate to screen N. `→ sheet X` means open an overlay.
- Design screen numbers 0 to 8 are kept only as labels in this spec. Route names are in section 11.
- Scene images: `P` = `assets/scenes/portrait.jpg`, `S` = `street.jpg`, `H` = `sunset.jpg`, `N` = `night.jpg`. Portrait is 720×480 JFIF progressive; the other three were written and checked for presence only.
- Mobile-first, portrait. Minimum copy size 15px. Minimum touch target 48×48.

---

## 1. Tokens

### 1.1 Light (`.acl`, design CSS line 11)

| Design variable | Value | `src/ui/tokens.ts` | Note |
|---|---|---|---|
| `--bg` | `#f2f2f7` | `colors.bg` | match |
| `--sf` | `#ffffff` | `colors.card` | match (surface) |
| `--sh` | `#ffffff` | none | hover surface |
| `--sf2` | `#f2f2f7` | none | secondary surface |
| `--sfh` | `#fafafb` | none | surface hover |
| `--tx` | `#0b0d12` | `colors.label` | match |
| `--tx2` | `#4a5260` | `colors.secondary` | match |
| `--ln` | `#e3e6eb` | `colors.separator` | match |
| `--segon` | `#ffffff` | none | selected segment fill |
| `--ol` | `#c9ced6` | none | outline |
| `--dis` | `#b8bec7` | none | disabled |
| `--hi` | `#0b0d12` | none | high-emphasis fill |
| `--hitx` | `#ffffff` | none | text on `--hi` |
| `--hih` | `#2a2f38` | none | hover on `--hi` |
| `--acx` | `#a8380a` | none | accent text (light) |
| `--acw` | `#f7e4dc` | none | accent wash |
| `--aci` | `#c2410c` | `colors.accent` | match (accent fill and icon) |
| `--ok` | `#127a3a` | `colors.success` | match |
| `--warn` | `#a84e00` | `colors.warning` | match |
| `--err` | `#c8261b` | `colors.danger` | match |
| `--inv` | `#0b0d12` | none | inverse surface |
| `--invtx` | `#ffffff` | none | text on inverse |
| `--invac` | `#ff8a3d` | none | accent on inverse |
| `--scrim` | `rgba(11,13,18,.45)` | none | sheet scrim |
| `color-scheme` | `light` | none | |

Inline (not a variable): accent pressed `#9a3412` (`style-active` on accent controls). `onAccent` = `#ffffff` in tokens.ts; design uses `#ffffff` on accent fills.

### 1.2 Dark (`.acl.dk`, design CSS line 11)

Selected by the design's `scheme` prop, which maps to the `.dk` class.

| Variable | Value | Variable | Value |
|---|---|---|---|
| `--bg` | `#0f1115` | `--ln` | `#30343c` |
| `--sf` | `#1b1e24` | `--segon` | `#4a505c` |
| `--sh` | `#23262d` | `--ol` | `#6b7280` |
| `--sf2` | `#2b2f37` | `--dis` | `#626975` |
| `--sfh` | `#24282f` | `--hi` | `#eceef2` |
| `--tx` | `#eceef2` | `--hitx` | `#0b0d12` |
| `--tx2` | `#a9b0bb` | `--hih` | `#c9ced6` |
| `--acx` | `#ff8a3d` | `--ok` | `#5cc98a` |
| `--acw` | `rgba(255,138,61,.16)` | `--warn` | `#f2a54a` |
| `--aci` | `#ff8a3d` | `--err` | `#ff7b6e` |
| `--inv` | `#e3e6eb` | `--invtx` | `#0b0d12` |
| `--invac` | `#a8380a` | `--scrim` | `rgba(0,0,0,.6)` |
| `color-scheme` | `dark` | | |

Also in the design: `.acl input::placeholder` uses `--tx2`. `.acl-q:focus-within` adds `inset 0 0 0 2px var(--tx)`.

### 1.3 Differences from `src/ui/tokens.ts`

1. tokens.ts has no dark palette. Section 1.2 is the design's dark set. The canonical web dark set (`AlphaColorLab/design/tokens/out/tokens.ts`, outside this repo) differs: bg `#000000`, card `#1c1c1e`, label `#f5f5f7`, accentText `#ff8a3d`, separator `#38383a`. Pick one before implementing (open item O1).
2. Accent text: the design uses `--acx` `#a8380a` (light) for text. tokens.ts has only `accent` `#c2410c`. Add `accentText`.
3. Missing from tokens.ts: accent pressed `#9a3412`, accent wash `#f7e4dc`, surface levels `--sh`/`--sf2`/`--sfh`/`--segon`, outline `#c9ced6`, disabled `#b8bec7`, inverse set, scrim.
4. tokens.ts `neutralTint`, `successTint`, `warningTint`, `dangerTint`, and `fill` (`rgba(11,13,18,0.05)`) have no design equivalent. Keep only if the app uses them.
5. `controlHeight` is 44. The design requires 48 for touch targets (section 3).

---

## 2. Typography

Font family: Noto Sans (400, 500, 600, 700). Map to `fonts` in tokens.ts (`NotoSans_400Regular`, `NotoSans_500Medium`, `NotoSans_600SemiBold`, `NotoSans_700Bold`).

Design usage (count of `font-size`): 17px ×72 (dominant: rows, buttons, labels), 15px ×32, 16px ×19, 20px ×7, 22px ×2, 24px ×5, 28px ×2, 30px ×1, 32px ×1, 44px ×1, 13px ×1.

Weights: 600 ×76, 700 ×29, 400 ×1, 800 ×1. Use 600 for labels and buttons, 700 for titles and numerals. The single 800 maps to 700 (NotoSans has no 800).

Rules:
- Minimum copy 15px. The one 13px use is the glyph inside a 22px radio/check circle (`font-size:13px` in the check indicator). Do not carry 13px into text; draw the check as an icon or use 15px.
- Map to tokens.ts `typeScale`: 24 → `title2` (24/32 bold); 20 → `title3` (20/28 semibold); 17 → `body` or `button` (17/27 regular or 17/22 semibold); 16 → `callout` (16/24); 15 → `subhead` (15/22 medium). `footnote` (13/19) must not be used for copy. 22, 28, 30, 32, 44 are display sizes; assign them per role when building screens.

---

## 3. Spacing, radii, touch targets

Spacing as used in the design (padding shorthand count; gap count):
- Padding: `0 16px` ×12, `0 4px` ×11, `12px 16px` ×8, `0 12px` ×6, `4px 16px 24px` ×6 (sheet footer), `4px 16px` ×6, `16px` ×5, `0 14px 0 20px` ×3, `12px` ×3, `0 4px 0 18px` ×2, `8px` ×2, `0 10px` ×2.
- Gap: 12 ×40, 8 ×23, 16 ×15, 6 ×12, 4 ×9, 14 ×9, 10 ×8, 5 ×2, 24 ×1, 20 ×1.
- Horizontal page inset 16. Sheet footer bottom padding 24.
- tokens.ts `spacing` = {4, 8, 12, 16, 20}. The design also uses 6, 10, 14, 24. Add 24 as a token; 6, 10, 14 can round to the nearest token or be added (open item O9).

Radii (count): 999px pill ×61; 50% circle ×25; 24px card ×21; 14px control ×20; 8px badge ×12; 2px ×6; sheet top `24px 24px 0 0` ×4; 16px ×3; 12px ×3; 4px ×3. tokens.ts `radii` {card 24, control 14, badge 8, pill 999} matches the main values.

Touch targets:
- Every tappable element is at least 48×48. The design's own sizes are not uniform: `48px` appears 68 times in its CSS and script, but only one is `min-height`; row `min-height` 56 appears 13 times and 52 appears 7 times.
- tokens.ts `controlHeight` 44 must become 48.
- The visual radio/check circle is 22px; its hit area is still 48×48.

---

## 4. Motion

- Slot chip flex (slot segment grows on select): `cubic-bezier(.2,0,0,1)`, 0.4 s (M3 emphasized).
- PP toggle, PP knob, chevron, progress ring: `cubic-bezier(0.16,1,0.3,1)`, 0.3 s. Matches `easing` in tokens.ts (`Easing.bezier(0.16,1,0.3,1)`).
- Keyframes in the design: `acl-spin` (spinner for "Đang đăng nhập…", "Đang kiểm tra…", "Đang ghi…"), `acl-pulse` (waiting state), `acl-pop` (success). The per-element assignment is inferred; confirm against the outline when building.
- Progress ring circumference `RING` = 565.49 (2π·90).
- `prefers-reduced-motion`: disable all animation and transitions above.

---

## 5. Data model

### 5.1 Presets (`PRESETS`)

| id | name | kind | by | slots M1 to M4 |
|---|---|---|---|---|
| p1 | Alpha Cơ bản | rec | Alpha Color Lab | Đời thường · Chân dung · Hoàng hôn · Đêm |
| p2 | Vlog ngoài trời | rec | (none) | Nắng gắt · Bóng râm · Trong nhà · Đèn đường |
| k1 | Film Sài Gòn | kol | Minh Quay | Phố · Cà phê · Chợ đêm · Mưa |
| k2 | Da ấm | kol | Linh Vlog | Cận mặt · Ngoại cảnh · Studio · Livestream |

- `SL` = `['M1','M2','M3','M4']`.
- `HERO` = `{p1:1, p2:0, k1:2, k2:1}`. Meaning not confirmed (open item O17).

### 5.2 Scenes

Each scene has an image key, a CSS filter string for the scene (`SCENE0`), a zoom (`tf` = `scale(z)`), and a preview filter (`FX`). `LOOK` aliases: `Lễ đường` → `Chân dung`, `Tiệc` → `Đời thường`. Fallback for unknown names: image `P`, filter `none`, scale 1.

| Scene | Img | Scene filter (`SCENE0`) | Scale | Preview filter (`FX`) |
|---|---|---|---|---|
| Đời thường | S | `saturate(1.08) contrast(1.02)` | 1 | `saturate(1.05)` |
| Chân dung | P | `sepia(.16) saturate(1.12) brightness(1.08) contrast(.92)` | 1.15 | `sepia(.16) saturate(1.12) brightness(1.06) contrast(.94)` |
| Hoàng hôn | H | `saturate(1.3) contrast(1.06) sepia(.12)` | 1 | `sepia(.5) saturate(1.8) hue-rotate(-12deg) contrast(1.06)` |
| Đêm | N | `saturate(1.15) contrast(1.1)` | 1 | `sepia(.3) hue-rotate(165deg) saturate(1.1) brightness(.7) contrast(1.2)` |
| Nắng gắt | S | `contrast(1.25) saturate(1.45) brightness(1.1)` | 1 | `contrast(1.22) saturate(1.35) brightness(1.06)` |
| Bóng râm | P | `sepia(.3) saturate(1.25) brightness(1.12)` | 1 | `sepia(.22) saturate(1.15) brightness(1.06)` |
| Trong nhà | P | `sepia(.55) saturate(1.5) hue-rotate(-10deg) brightness(1.02)` | 1 | `sepia(.32) saturate(1.25) hue-rotate(-6deg) brightness(.98)` |
| Đèn đường | N | `sepia(.8) saturate(2.3) brightness(1.1) contrast(1.05)` | 1 | `sepia(.65) saturate(2) hue-rotate(-18deg) brightness(.82) contrast(1.1)` |
| Phố | S | `contrast(1.14) saturate(.66) sepia(.26)` | 1 | `contrast(1.16) saturate(.72) sepia(.14)` |
| Cà phê | P | `sepia(.72) saturate(1.15) brightness(.9) contrast(1.16)` | 1.3 | `sepia(.48) saturate(1.2) brightness(.96) contrast(1.06)` |
| Chợ đêm | N | `saturate(1.5) contrast(1.18) brightness(1.05)` | 1 | `saturate(1.6) contrast(1.2) brightness(.76) hue-rotate(-10deg)` |
| Mưa | S | `grayscale(.62) contrast(.88) brightness(.94)` | 1 | `sepia(.25) hue-rotate(170deg) saturate(.7) brightness(.98) contrast(.95)` |
| Cận mặt | P | `sepia(.24) saturate(1.15) brightness(1.12) contrast(.88)` | 1.9 | `sepia(.14) saturate(1.1) brightness(1.09) contrast(.92)` |
| Ngoại cảnh | H | `saturate(1.4) contrast(1.12) brightness(1.06)` | 1 | `saturate(1.3) contrast(1.08)` |
| Studio | P | `contrast(1.22) saturate(.78) brightness(1.06)` | 1.45 | `contrast(1.06) saturate(.95) brightness(1.05)` |
| Livestream | P | `brightness(1.2) saturate(1.35) contrast(.9)` | 1 | `brightness(1.1) saturate(1.18) contrast(.95)` |

CSS filter strings are web-only. React Native styles do not accept them. Use pre-rendered thumbnails or a native image-effect path; `transform: [{scale}]` works as-is for the zoom. The two filter sets disagree for the same scene name (open item O14); the scene filter (`SCENE0`) is the one used for slot thumbnails.

### 5.3 Stages

- `STAGES` = `['Phơi sáng','AF','Màu & da','Hiển thị']` (stage 1 to 4).
- `STG` = `[[1,2],[3],[4],[5]]`: ROWS keys shown per stage. Stage 3 also shows the Picture Profile block.
- `NEXT` (footer label per stage): `Tiếp: AF` (stage 1), `Tiếp: Màu & da` (stage 2), `Tiếp: Hiển thị` (stage 3), `Tiếp: Cắm máy` (stage 4).

### 5.4 Rows (`ROWS`, flattened to `ALLROWS` by key)

Notation: `dN` = default option index N; `hN` = held by default (1); `needN` = dependency flag (open item O18).

Row 1 (stage 1, Phơi sáng group):
- `mode` "Chế độ chụp": `P`, `A`, `S`, `M`. d1 (`A`).

Row 2 (stage 1):
- `ap` "Khẩu độ": `f/1.8`, `f/2`, `f/2.8`, `f/4`, `f/5.6`, `f/8`, `f/11`. d2 (`f/2.8`).
- `sh` "Tốc độ": `1/30`, `1/50`, `1/60`, `1/100`, `1/125`, `1/250`, `1/500`, `1/1000`. d4 (`1/125`).
- `iso` "ISO": `100`, `200`, `400`, `800`, `1600`, `3200`, `6400`, plus Auto (flag `isoA`). d0 (`100`); Auto on by default (assumed).
- `ev` "Bù sáng": 13 values from −2.0 to +2.0 (step 1/3 EV, implied by count; minus sign `−`). d6 (`±0.0`). Design-only (open item O7).
- `meter` "Đo sáng": `Đa vùng`, `Trung tâm`, `Điểm`. d0, h1.

Row 3 (stage 2, AF):
- `fm` "Chế độ lấy nét": `MF`, `AF-S`, `AF-C`. d2 (`AF-C`).
- `fa` "Vùng lấy nét": `Rộng`, `Vùng`, `Giữa`, `Điểm`. d0 (`Rộng`).
- `face` "Ưu tiên mặt": `Tắt`, `Bật`. d1 (`Bật`).
- `pre` "Pre-AF": `Tắt`, `Bật`. d0, h1.

Row 4 (stage 3, Màu & da):
- `wb` "Cân bằng trắng": `AWB`, `Nắng`, `Bóng râm`, `Kelvin`. d0 (`AWB`). `Nắng` and `Bóng râm` are design-only (O8).
- `kel` "Nhiệt độ màu": `2500K`, `3200K`, `4300K`, `5000K`, `5600K`, `6500K`, `7500K`. d4 (`5600K`), need1 (O18).
- `ab` "Bù A–B": `A3`, `A2`, `A1`, `0`, `B1`, `B2`, `B3`. d3 (`0`).
- `gm` "Bù G–M": `G3`, `G2`, `G1`, `0`, `M1`, `M2`, `M3`. d3 (`0`), h1.
- `skin` "Soft Skin": `Tắt`, `Thấp`, `Vừa`, `Cao`. d0 (`Tắt`).

Row 5 (stage 4, Hiển thị):
- `rev` "Auto Review": `Tắt`, `2 giây`, `5 giây`. d0 (`Tắt`).
- `lv` "Live View": `Hiện hiệu ứng`, `Tắt hiệu ứng`. d0, h1.

Stage 3 also shows the Picture Profile block (section 5.6).

### 5.5 Seeded values (`SEED`, per slot)

| Slot | Values |
|---|---|
| M1 | none (all defaults) |
| M2 | `ap` 0 (`f/1.8`), `sh` 2 (`1/60`), `skin` 2 (`Vừa`), `wb` 3 (`Kelvin`), `kel` 2 (`4300K`) |
| M3 | `wb` 1 (`Nắng`), `ev` 7, `pp` 4 |
| M4 | `iso` 5 (`3200`), `isoA` 0 (Auto off), `sh` 1 (`1/50`), `pp` 7 |

`pp` is a 0-based PP bank index (`pp` 4 = PP5, `pp` 7 = PP8). This is an inference (open item O17).

### 5.6 Picture Profile (PP)

- Banks: PP1 to PP10. Bank index 0 to 9. Bank 1 is `pp`; banks 2 to 10 are `ppBanks` keys 2 to 10.
- `PPG` (per-bank gamma default label, indexed by bank): `Movie`, `Still`, `ITU709`, `ITU709(800%)`, `Cine1`, `Cine2`, `S-Log2`, `S-Log3`, `S-Log3`, `HLG2`. Duplicate `S-Log3` at PP8 and PP9 (O13).
- `PPC` (per-bank color mode default): `Movie`, `Still`, `ITU709`, `ITU709`, `Cinema`, `Pro`, `S-Gamut`, `S-Gamut3.Cine`, `S-Gamut3`, `BT.2020`. Duplicate `ITU709` at PP3 and PP4 (O13).
- `ppOn` switch: `SlotSettings.ppOn`. Byte `0x315` = PP selection, 0 when `ppOn` is false and `pp` is empty, otherwise 1 (`dat.ts`, `applySettings` ~961 to 973).
- Parameter values are keyed `slot:pp<bank>:<index>` (`ppKey`). A parameter's default is `ppVals(bank)[index]`; the index is `PPD[i].o.indexOf(default)` (or 0 if absent).

Parameters (25, index = codec field order `FIELDS` in `dat.ts` lines 9 to 35):

| i | Label (`PPN`) | Codec field | Options (`PPD`) | Default (`ppVals`, bank b) |
|---|---|---|---|---|
| 0 | Mức đen | `black_level` | −15…15 (step 1) | `−2` if b < 6, else `0` |
| 1 | Gamma | `gamma` | Movie, Still, Cine1, Cine2, Cine3, Cine4, ITU709, ITU709(800%), S-Log2, S-Log3, HLG, HLG1, HLG2, HLG3 | `PPG[b]` |
| 2 | Black Gamma · dải | `black_gamma_range` | Rộng, Giữa, Hẹp | `Giữa` |
| 3 | Black Gamma · mức | `black_gamma_level` | −7…7 | `0` |
| 4 | Knee · chế độ | `knee_mode` | Tự động, Thủ công | `Tự động` |
| 5 | Knee · điểm tối đa | `knee_auto_max` | 90…100 % | `100%` |
| 6 | Knee · độ nhạy | `knee_auto_sens` | Cao, Giữa, Thấp | `Giữa` |
| 7 | Knee · điểm | `knee_point` | 75…105 % | `95%` |
| 8 | Knee · độ dốc | `knee_slope` | −5…5 | `+1` |
| 9 | Chế độ màu | `color_mode` | Movie, Still, Cinema, Pro, ITU709, Đen trắng, S-Gamut, S-Gamut3.Cine, S-Gamut3, BT.2020, 709 | `PPC[b]` |
| 10 | Độ bão hoà | `saturation` | −32…32 | `0` |
| 11 | Pha màu | `color_phase` | −7…7 | `0` |
| 12 | Độ sâu R | `depth_r` | −7…7 | `0` |
| 13 | Độ sâu G | `depth_g` | −7…7 | `0` |
| 14 | Độ sâu B | `depth_b` | −7…7 | `0` |
| 15 | Độ sâu C | `depth_c` | −7…7 | `0` |
| 16 | Độ sâu M | `depth_m` | −7…7 | `0` |
| 17 | Độ sâu Y | `depth_y` | −7…7 | `0` |
| 18 | Chi tiết · mức | `detail_level` | −7…7 | `0` |
| 19 | Chi tiết · chế độ | `detail_mode` | Tự động, Thủ công | `Tự động` |
| 20 | Cân bằng V/H | `detail_vh` | −2…2 | `0` |
| 21 | Cân bằng B/W | `detail_bw` | Loại 1 … Loại 5 | `Loại 3` |
| 22 | Giới hạn | `detail_limit` | 0…7 | `7` |
| 23 | Crispening | `detail_crisp` | 0…7 | `3` |
| 24 | Chi tiết vùng sáng | `detail_hilight` | 0…4 | `0` |

Design labels are the UI source. The codec code for each label must come from the `pp` rules in `profile.json`, not from design index order. Known gaps: `color_mode` (O2) and `gamma` (O4): the design has 14 gamma entries; the codec profile calibrates 7.

Display rules:
- A parameter is "edited" (`ed`) when it is held or its index differs from the bank default.
- Held parameters show `Như máy`. Others show the option string.

### 5.7 Cameras

- `CAM_OK` = `['ZV-E10']` (writable).
- `CAM_SOON` = `['A6400','A6700','A7C','A7C II','A7 IV','ZV-E1']` (listed, not writable).
- `norm(s)` = lowercase with spaces, `-`, `_`, `.` removed. Use it for search matching ("Không thấy máy" when nothing matches).
- Default `camSel` = `ZV-E10`.

### 5.8 Stage 1 to 4 rows vs codec

Codec option arrays confirmed in this pass (design values checked against them):
- `APERTURES` (`dat.ts` line 82): 31 values `'1.0'` … `'32'`. Design `f/1.8` … `f/11` map to `'1.8'`, `'2'`, `'2.8'`, `'4'`, `'5.6'`, `'8'`, `'11'` (no `f/` prefix in the codec). All present.
- `SHUTTERS` (line 116): 52 values `'30"'` … `'1/4000'`. All design shutter values present.
- `ISOS` (line 171): 29 values, `'AUTO'` first, then `'100'` … `'51200'`. Design values `100` … `6400` present.
- `APERTURE_OPTIONS`, `SHUTTER_OPTIONS`, and `ISO_OPTIONS` (= `ISOS` minus `'AUTO'`, 28 values) are exported from `options.ts` lines 31 to 34.

---

## 6. Mapping to `SlotSettings` (`dat.ts` lines 643 to 669)

Held rows are not written: the field is set to `"keep"`. How the design writes rows that were never edited is not confirmed (O27).

| Design key | `SlotSettings` field | Source | Mapping and notes |
|---|---|---|---|
| `mode` | `mode` | `MODE_OPTIONS` (`Object.keys(PROFILE.shoot_modes)`) | `P` `A` `S` `M`, verified against `profile.json` `profile.shoot_modes` keys. |
| `ap` | `aperture` | `APERTURE_OPTIONS` | Strip `f/`. |
| `sh` | `shutter` | `SHUTTER_OPTIONS` | Strings as-is. |
| `iso` + `isoA` | `iso` | `ISO_OPTIONS`, `"auto"` | `isoA` truthy → `"auto"`; else the chosen string. |
| `ev` | none | (design-only) | No codec field. `expCompSet` is an ambient/flash enum, not EV (O7). |
| `meter` | `metering` | `METERING_MODES` (6 values: `multi`, `center`, `spot-standard`, `spot-large`, `entire`, `highlight`) | Proposed: `Đa vùng` → `multi`, `Trung tâm` → `center`, `Điểm` → `spot-standard` (O10). |
| `fm` | `focus` | `FOCUS_OPTIONS` (`MF`, `AF-S`, `AF-C`) | As-is. |
| `fa` | `focusArea` | `FOCUS_AREAS` (5 values: `wide`, `zone`, `flexible-spot-l`, `tracking-zone`, `tracking-flexible-spot-l`) | `Rộng` → `wide`, `Vùng` → `zone`, `Điểm` → `flexible-spot-l` (proposed). `Giữa` has no codec value (O10). |
| `face` | `facePriority` | `FACE_PRIORITY` (`off`, `on`) | `Tắt`/`Bật` index-aligned. |
| `pre` | `preAF` | `PRE_AF` (`off`, `on`) | `Tắt`/`Bật` index-aligned. |
| `wb` | `wb` (`WB`, dat.ts 419 to 425) | `WB_MODE_OPTIONS` = `['awb','ctemp']` | `AWB` → `awb`; `Kelvin` → `ctemp`. `Nắng` and `Bóng râm` are design-only (O8). |
| `kel` | `wb` (Kelvin value) | `KELVIN_RANGE` {2500, 9900, step 100} | Design shows 7 discrete values; codec allows 100 K steps. |
| `ab` | `wb` (A–B) | `AB_GM_RANGE` {−7, 7, step 1} | Design shows −3…+3. Sign convention: A negative, B positive, per design order (confirm). |
| `gm` | `wb` (G–M) | `AB_GM_RANGE` | Design shows −3…+3. G negative, M positive (confirm). |
| `skin` | `softSkin` | `SOFT_SKIN` (`off`, `low`, `mid`, `high`) | `Tắt`/`Thấp`/`Vừa`/`Cao` index-aligned. |
| `rev` | `autoReview` | `AUTO_REVIEW` (`off`, `2s`, `5s`, `10s`) | `Tắt`/`2 giây`/`5 giây` index-aligned. Design lacks `10s` (O10). |
| `lv` | `liveView` | `LIVE_VIEW` (`setting-effect-on`, `setting-effect-off`) | `Hiện hiệu ứng` → on; `Tắt hiệu ứng` → off. |
| PP bank | `pp` (bank 1), `ppBanks[2..10]` | `SlotSettings.ppBanks` | Bank index + 1. |
| PP toggle | `ppOn` | byte `0x315` | Section 5.6. |
| PP params 0 to 24 | `pp` / `ppBanks` objects, keyed by codec field name | `FIELDS` (`dat.ts` 9 to 35) | Keys in section 5.6. |

Codec-only fields not in the design: `flashMode`, `expCompSet`, `awbPriority`, `steadyShot`, `eFrontCurtain` (keep; not shown). `usbConnection`, `pcRemote`, `smartphoneConnect`, `pcRemoteMethod` are in `PENDING_FIELDS` (dat.ts 671 to 676). They have no offsets and are never written.

Write path notes:
- PP offsets: field `i` at `0x317 + 14·i` (`PP_OFFSETS`).
- PP values are affine: `y = transform(x)·a + b`; the output must be an integer (`dat.ts` ~301). `knee_auto_max` and `knee_point` use 1% steps in the design and 5% steps in the codec (O1).
- `withSupplement` (dat.ts 679 to 699) patches the learned profile for the ZV-E10 only.

---

## 7. State and behavior

### 7.1 Screen state

- `screen` (default 1), `introBack` (true when opened from help), `tab` (`rec`, `kol`, `mine`; default `rec`), `preset` (default `p1`), `slot` (default `M1`), `stage` (default 1), `cam` (`waiting`, `ok`, `error`), `camSel` (default `ZV-E10`), `via` (`edit` or `direct`), `live` (`ok`, `none`), `w` (`{prog, done, fail}`), `shots` (per slot bool), `toast`, `toastAct`, `acct` (empty when signed out).
- Per-slot state: `vals` (`slot:rowKey` → option index or value; `slot:rowKeyA` = Auto flag), `hold` (`slot:rowKey` → bool), `edited` (slot → bool).

### 7.2 Hold model ("Như máy")

- `held(slot, row)` = `hold[slot:key]` if set, else the row's default hold (`h1` → true).
- Commit "Đặt" (`shSet`): `hold[key] = false`, `vals[key] = chosen`, `edited[slot] = true`. For ISO with Auto, also set `vals[key+'A']` to 1 or 0.
- Commit "Như máy" (`shHold`): `hold[key] = true`, `vals` unchanged, `edited[slot] = true`. Held rows are written as `"keep"` (section 6).
- Row marker "đã sửa": shown when `held` differs from the default hold, or (when not held) the value differs from the base (`SEED` value, else the row default).
- Slot marker: `edited[slot]` is set to true by any commit, and cleared by reset (section 7.4). The two markers use different rules (O15).

### 7.3 Apply to all slots

"Áp cho cả 4 slot": for every slot in `SL`, set the value, `hold = false`, `edited = true`. Toast: `Đã áp {title} cho M1–M4` with action.

### 7.4 Reset slot

"Đặt lại {slot} về bản gốc" (shown when `canReset`): delete all `vals` and `hold` keys with prefix `slot:`, set `edited[slot] = false`. Toast `Đã đặt lại {slot} về bản gốc` with action.

### 7.5 Undo

- Every mutating action calls `pushHist()` first, storing `{vals, hold, edited}`. History keeps the last 30 snapshots.
- Undo restores the last snapshot and clears the toast.

### 7.6 Toasts

- Plain toast: 2400 ms. Toast with action ("Hoàn tác"): 4000 ms.
- Strings (verbatim):
  - `Đã đặt {title} · {slot}` (action)
  - `Đã áp {title} cho M1–M4` (action)
  - `Đã đặt lại {slot} về bản gốc` (action)
  - `Đã khôi phục bản trước` (no action)
  - `Đã chụp vào {pv}` (no action)
  - `Đã tạo “{name}”` (no action)
  - `Bộ {name} đã nằm trên máy` (no action)
  - `Sẽ báo qua {acct} khi {cam} được hỗ trợ` when `acct` is set; `Sẽ báo khi {cam} được hỗ trợ` when not.

### 7.7 Transitions and timers

- `go(3)` (camera connect): screen 3, `cam = waiting`, then `cam = ok` after 2200 ms. In the real app this is replaced by the camera readback (section 10).
- `go(4)` (writing): `w.prog` advances in 600 ms steps to 4. Then `done`, or `fail` on a write error.
- Sign-in "Tiếp tục với Google": set `signing`, ignore re-taps, then after 900 ms → screen 8.
- "Để sau": → screen 8 with `acct = ''`.
- Create (dialog "Tạo"): `makeCreate` pushes an own preset with id `'u' + Date.now()`, `tab = mine`, toast `Đã tạo “{name}”`. Name capped at 32, slot names at 20 (section 9.2).

### 7.8 Header back map (design `BACK`)

| From | Back goes to |
|---|---|
| 8 | 7 |
| 0 | 1 when `introBack`; no back when reached from sign-in flow (the header shows "Bỏ qua" → 1) |
| 2 | 1 |
| 3 | 1 when `via = direct`; else 2 at stage 4 |
| 6 | 5 |

---

## 8. Screens in flow order

First-run flow: 7 → 8 → 0 → 1 → 2 → 3 → 4 → 5 → 6 → 1. Screen 1 is the home after onboarding.

### Screen 7: sign-in (header hidden)
- Hero: four scene images `P`, `S`, `H`, `N` (bundled).
- Title: `Alpha Color Lab`
- Body: `Bộ màu M1–M4 cho máy Sony của bạn, ghi thẳng vào máy qua cáp USB-C`
- Primary: `Tiếp tục với Google`. While signing: `Đang đăng nhập…` with spinner, disabled. → 8 after 900 ms (backend: section 10).
- Secondary: `Để sau` → 8 without account.

### Screen 8: device pick (back → 7)
- Account line (when signed in): `Đã đăng nhập · {acct}`
- Heading: `Bạn đang dùng máy nào?`
- Search: placeholder `Nhập tên máy, vd. ZV-E10`, aria `Tìm máy`. Filters with `norm`.
- Group `Đã hỗ trợ`: radio `ZV-E10`.
- Group `Sắp có`: radios for each `CAM_SOON` entry, each with lock icon and label `Sắp có`.
- Empty search: `Không thấy máy`.
- If a "soon" device is selected, show: `{cam} chưa ghi được M1–M4. Bạn vẫn xem được các bộ màu và chỉnh slot.` Actions:
  - `Xem trước` → 0 with `camSel = {cam}`.
  - `Báo khi hỗ trợ` (toggle). When on, label `Sẽ báo bạn`; toast per section 7.6 (backend: section 10).
- Footer: `Tiếp tục với {cam}` → 0 with `camSel = {cam}`. Disabled with `Chọn máy để tiếp tục` when no device is selected.

### Screen 0: intro
- Header: `Bỏ qua` (top-right, when not `introBack`) → 1. Back arrow when `introBack` → 1.
- Heading (h2): `M1–M4 lên máy, gọi bằng MR`
- Four slot images with labels `M1` to `M4`, scenes from `PRESETS[0]` (Đời thường, Chân dung, Hoàng hôn, Đêm).
- Rows:
  - `Một bộ màu có 4 cảnh: M1–M4`
  - `Ghi cả 4 vào máy qua cáp USB-C`
  - `Lúc chụp: MODE → MR → chọn 1–4`
- Diagram: `MODE`, `MR`, `1`, `2`, `3`, `4` (aria `Trên máy: MODE, MR, chọn 1 đến 4`).
- Example: `Đo sáng`, `Như máy` (aria `Ví dụ: Đo sáng, Như máy`).
- Note: `App không ghi mục này, máy giữ nguyên giá trị đang đặt`
- CTA: `Chọn bộ màu` → 1.

### Screen 1: preset home (title `Chọn bộ màu`)
- Header help button (avatar). Aria `Tài khoản · chưa đăng nhập` or `Tài khoản {acct}`. Opens the account menu.
- Camera row: label `Máy ảnh`, value `camSel`. Opens the camera sheet.
- Tabs: `Khuyên dùng` (rec), `KOL`, `Của tôi` with count ` · N` (own presets).
- `Tạo bộ mới`: shown when the `Của tôi` tab has items. Opens the create dialog.
- Preset cards: name; byline. `Bạn tạo` for own presets; KOL presets show the creator name.
- Card action: `Sưu tầm` or `Đã sưu tầm` (collect toggle; backend: section 10).
- After a card is picked: `Chỉnh slot` → 2 (stage 1, slot M1).
- Bottom action: `Ghi bộ này` → 3 with `via = direct`, shown when `camSel` is writable (`CAM_OK`). Otherwise disabled with `Chưa hỗ trợ {camSel}`.
- Hints when nothing is picked: `Chọn một bộ`; `Chưa có bộ để ghi` when the `Của tôi` tab is empty.
- `Của tôi` empty state: `Chưa có bộ nào`, `Tạo bộ mới`, `Xem bộ Khuyên dùng` (→ tab `rec`).

### Screen 2: slot edit (title `Chỉnh slot`)
- Header back arrow (aria `Quay lại`) → 1.
- Slot segment: `M1`–`M4` with scene names. Aria `M1 · {scene}`, with `· đã sửa` appended when `edited`.
- Stage tabs: `Phơi sáng`, `AF`, `Màu & da`, `Hiển thị` (aria-current on active). Stage tabs use the Section 5.3 labels.
- Rows for the stage (section 5.4): label, value, `đã sửa` marker, chevron → row sheet.
- Stage 3 only:
  - Picture Profile switch (role `switch`; label `Picture Profile`, confirm in outline).
  - PP chips `PP1`–`PP10`.
  - `Nâng cao` disclosure with 25 parameter rows (section 5.6). Each row opens the PP sheet.
- `Đặt lại {slot} về bản gốc` when `canReset` (section 7.4).
- Footer:
  - Previous (aria `Bước trước`): stage > 1 → stage − 1; stage 1 → 1.
  - Next: `NEXT[stage−1]` (`Tiếp: AF`, `Tiếp: Màu & da`, `Tiếp: Hiển thị`, `Tiếp: Cắm máy`). Stage 4 → 3 with `via = edit`.

### Row sheet (title = row label)
- `Tự động` switch: ISO row only. When on, show value `Tự động` and dim the options.
- Stepper (`−` aria `Giảm`, `+` aria `Tăng`) when the row has more than 4 options. Segmented control when 4 or fewer.
- `Áp cho cả 4 slot` (section 7.3).
- `Như máy` toggle (hold), with check icon (section 7.2).
- `Đặt` commits (section 7.2).

### Screen 3: camera connect (title `Cắm máy ảnh`)
- Artwork (aria): `Máy ảnh {camSel} chưa nối cáp với điện thoại` (waiting); `Máy ảnh {camSel} đã nối cáp USB-C với điện thoại` (ok).
- Waiting:
  - `Chờ máy ảnh…`
  - Guide: `1 Chọn Mass Storage` (menu `Kết nối USB` / `Mass Storage`), `2 Cắm cáp USB-C`, `3 Chọn ổ ZV-E10` (camera dialog `Huỷ` / `Cho phép`).
- OK:
  - Camera name `ZV-E10`.
  - Disclosure `Chi tiết`: `Hệ PAL`, `Firmware Ver. 2.03`, `Thẻ nhớ Đã format`.
  - Preset name and four slot thumbnails.
- Error:
  - `Thẻ chưa được format trong máy`
  - `MENU › Thiết lập › Format`
  - `Format sẽ xoá hết ảnh trên thẻ`
- Footer:
  - Waiting: `Chờ máy ảnh…` (disabled).
  - OK: `Ghi M1–M4 vào máy` → 4.
  - Error: `Kiểm tra lại` (re-run connect check).
- Back: section 7.8.

### Screen 4: writing (title `Đang ghi…` / `Đã ghi xong` / `Chưa ghi được`)
- `Đừng rút cáp` while writing.
- Progress bar (aria `Đã ghi`), text `{prog}/4`.
- Done: `Đã ghi M1–M4` with four thumbnails.
- Fail: `Máy vẫn giữ bộ cũ`.
- Footer:
  - Done: `Gọi lại trên máy` → 5.
  - Fail: `Kiểm tra cáp` → 3, and `Thử lại` (restart write; design action assumed, open item O19).

### Screen 5: reload on camera (title `Gọi lại trên máy`)
- Checklist (role `checkbox`):
  - `Rút cáp`
  - `Tắt rồi bật máy`
  - `Chọn Gọi lại, đừng chọn Lưu`
- Diagram caption: `Bấm MODE, chọn MR`
- `Khôi phục` → restore sheet.
- `Xem thử` → 6.

Restore sheet:
- Title: `Khôi phục bản trước?`
- Body: `Bộ trên máy sẽ thay bằng bản đã sao lưu.`
- `Huỷ` (close); `Khôi phục` → toast `Đã khôi phục bản trước`.

### Screen 6: preview (title `Xem thử`)
- Slot segment `M1`–`M4`. Aria `{m} · máy đang ở slot này` or `… khớp` / `… lệch` per readback.
- Live view (aria `Live view từ máy ảnh`) with overlay `MR1`. Tap → full-screen overlay `Xem toàn màn hình` (close aria `Đóng`).
- No live view:
  - `Chọn PC Remote`
  - Diagram: `Kết nối USB` / `PC Remote`
  - `Kiểm tra lại`; while checking: `Đang kiểm tra…`. The design resolves to live view after 1100 ms; the app should use the real readback instead.
- Setting chips: `mode`, `ap`, `sh`, `ISO {iso}`, `wb`, `pp`. A mismatch shows `→` and aria `Lệch` (readback vs slot).
- Section `Ảnh nhanh`.
- Shoot: `Chụp vào {pv}` (disabled without live view) → toast `Đã chụp vào {pv}`.
- Thumbnails: label `{m} · {scene}`, text `Chưa chụp` or taken.
- Footer:
  - `Chỉnh lại slot` → 2.
  - `Hoàn tất` → 1 with toast `Bộ {name} đã nằm trên máy`.

---

## 9. Sheets and overlays

### 9.1 Account menu (role `menu`, aria `Tài khoản`)
- `Đổi máy ảnh` + `camSel` → camera sheet.
- `Bộ của tôi` + `{mineN} bộ` → tab `mine`.
- `Tạo bộ mới` → create dialog.
- `Xem giới thiệu M1–M4` → 0 with `introBack = true`.
- Signed in: `Đăng xuất`. Signed out: `Đăng nhập với Google` → 7.

### 9.2 Create dialog (aria `Bộ mới`)
- Title: `Bộ mới`.
- `Tạo` (disabled when name is empty).
- Label `Tên bộ`, placeholder `Ví dụ: Cưới ngoài trời`. Max 32 characters.
- `Dựa trên` (radio list): preset name plus slots joined with ` · `.
- `Tên cảnh` inputs, aria `Tên cảnh M1` … `Tên cảnh M4`. Max 20 characters each.

### 9.3 Camera sheet (aria `Chọn máy ảnh`)
- Title: `Chọn máy ảnh`.
- Search: placeholder `Tìm máy…`, aria `Tìm máy`.
- Listbox (aria `Máy ảnh`): `ZV-E10` with check; `Sắp có` entries disabled with lock icon; `Không thấy máy` when no match.

### 9.4 Row sheet and PP sheet
See section 8, "Row sheet".

### 9.5 Full-screen live view
Overlay from screen 6. Close aria `Đóng`.

### 9.6 Toast
Bottom toast with optional `Hoàn tác` action (section 7.6).

---

## 10. Backend-dependent features and offline fallbacks

Backend facts from the web repo (`AlphaColorLab/HANDOFF.md`, outside this repo): Supabase AUTH project (login, sync, KOL accounts) and a content project. One M1–M4 set per KOL. Public KOL sets are listed at `/console` and `/bo-m1-m4`, not on the landing page. KOL sample images are https links. Profile avatars and covers come only from bucket `kol`. "Mod PP" (user-made PP) is private to the user.

The app repo has no backend code. The only Google reference in `src/` is the font import in `src/app/_layout.tsx`. Any Expo/Supabase/Google library must be chosen after the Expo doc check (section 12); none was selected in this pass.

| # | Feature | Design screen | Backend need | Offline fallback |
|---|---|---|---|---|
| B1 | Google sign-in | 7 | Supabase AUTH | `Để sau` → 8 with no account. The app works without an account. |
| B2 | Account identity and sign-out | 1 (help), 9.1 | AUTH session | Show `Tài khoản · chưa đăng nhập`; hide `Đăng xuất`. |
| B3 | KOL preset catalog (KOL tab, `k1`, `k2`) | 1 | Content project | Bundled `rec` presets only. Hide the KOL tab or show an empty state (not in design; propose). |
| B4 | KOL attribution, avatars, covers | 1 | Content project; bucket `kol` | Text names only; initials instead of avatar. |
| B5 | KOL sample images (https links) | 1 | Remote hosting | Use bundled `P`, `S`, `H`, `N` scenes. |
| B6 | Collect (`Sưu tầm`) | 1 | Per-account store | Local-only collect list; sync when signed in (proposed). |
| B7 | Own presets (`Bộ của tôi`, create) | 1, 9.1, 9.2 | Optional cloud sync | Device-local storage (the design keeps them in state only). |
| B8 | "Báo khi hỗ trợ" notify | 8 | Store interest and send a message when a camera is supported | Local flag and toast only. The toast must not claim delivery without a backend. |
| B9 | Camera support list (`CAM_OK`, `CAM_SOON`) | 1, 8, 9.3 | Optional remote config | Bundled list (section 5.7). |
| B10 | Mod PP sharing | (none) | Keep private | Not shared. |

Not backend (hardware or device, works offline): writing the four slots over USB-C, camera readback (`cam`, `live`, mismatch chips), PC Remote, live view, Auto Review, reload on the camera. The app must work without a network connection for these flows.

---

## 11. Screen-to-route table (`src/app`)

Existing files (not edited in this pass):
- `src/app/_layout.tsx` (72 lines): root `Stack`; fonts (`@expo-google-fonts/noto-sans`, `useFonts` from `expo-font`), splash, error boundary.
- `src/app/index.tsx` (300): Home; pushes `/write`, `/preview`, `/sets`, `/backups`, `/guide`.
- `src/app/sets/index.tsx` (175): set list; pushes `/sets/[id]/edit`, `/write`.
- `src/app/sets/[id]/edit.tsx` (540): slot editor; saves, then `/write`; duplicates with replace.
- `src/app/preview.tsx` (438): pushes `/sets/[id]/edit`; `router.navigate("/")`.
- `src/app/write.tsx` (296): `router.navigate("/")`; pushes `/preview`.
- `src/app/backups.tsx` (166), `src/app/guide.tsx` (56; pushes `/logs`), `src/app/logs.tsx` (91).

Proposed mapping (no `src/` edits in this pass):

| Design screen | Proposed route | Existing file | Change |
|---|---|---|---|
| 7 sign-in | `/sign-in` (new) | none | New. Header hidden. Hero uses bundled scenes. |
| 8 device pick | `/device` (new) | none | New. Replaces `obNext` / `obPreview`. |
| 0 intro | `/intro` (new) | `guide.tsx` (56) is a candidate | Repurpose or add. Back from help reuses `introBack`. |
| 1 preset home | `/` | `index.tsx` | Replace Home with preset home. Tabs as local state or `?tab=`. |
| 1 sheets (account, create, camera) | local sheets in `/`, or `presentation: 'formSheet'` screens (section 12) | none | Keep as overlays on `/`. |
| 2 slot edit | `/sets/[id]/edit` | `sets/[id]/edit.tsx` (540) | Rework to stage tabs; `?slot=M1&stage=1`. |
| 3 camera connect | `/write` | `write.tsx` (296) | Rework to connect step (waiting, OK, error). |
| 4 writing | `/write/progress` (new) | none | New. Shows progress and done or fail. |
| 5 reload on camera | `/write/reload` (new) | none | New. Restore sheet can reuse `backups.tsx`. |
| 6 preview | `/preview` | `preview.tsx` (438) | Rework: slot segment, live view, chips, shoot, finish to `/`. |
| Restore sheet | `/backups` | `backups.tsx` (166) | Reuse. |
| Sets list (design `Của tôi` tab) | `/sets` | `sets/index.tsx` (175) | Optional: fold into `/` tab, or redirect to `/`. |
| Logs | `/logs` | `logs.tsx` (91) | Keep. |

Routing rules: routes stay in `src/app/`; components, hooks, state, and data stay outside it (AGENTS.md). Use `router.push`, `router.navigate`, `router.replace`, and `useLocalSearchParams` (section 12).

---

## 12. Expo API check (v58)

Done in this pass:
- `expo` major 58. Fetched `https://docs.expo.dev/versions/v58.0.0/` (195,014 B). That page is the SDK reference index and does not contain router API names.
- Router pages fetched from the current docs (unversioned URLs, not confirmed to match SDK 58):
  - the router introduction page (11,019 B): confirms the Expo Router model.
  - the router navigation page (13,099 B): confirms `router.navigate("/")` and related calls.
  - the router URL-parameters page (12,896 B): confirms `useLocalSearchParams` (returns the URL parameters of the current route).
  - the router stack page (46,193 B): confirms `Stack` and `Stack.Screen` options, including `headerShown` and `presentation` (`formSheet` appears among supported values; per-platform support not verified).
- `llms.txt` index (62,611 B) confirms the Stack page link.

Names used in this spec and their status:
- `Stack`, `Stack.Screen`, `headerShown`, `presentation: 'formSheet'`: confirmed in the stack page. `formSheet` platform behavior: not verified.
- `router.push`, `router.navigate`, `router.replace`: confirmed in the navigation and stack pages.
- `useLocalSearchParams`: confirmed.
- `useFonts` (`expo-font`): already used by `src/app/_layout.tsx`. Not re-checked against docs in this pass (open item O20).

---

## 13. Open items

Each item needs a decision or check before implementation.

- O1. `knee_auto_max` and `knee_point`: design steps 1%, codec steps 5% (integer affine rule, dat.ts ~301). Decide the step.
- O2. `color_mode` labels: design lists 11 entries (`709` at index 10). Codec labels include `ITU709` (Matrix 4), `709` (21), `Cinema` (7), `S-Gamut` (8). Build a label-to-code table from the codec before wiring.
- O3. `Cine3` gamma and `Detail B/W` Type 4: inferred. Confirm.
- O4. PP gamma: design has 14 options; codec profile calibrates 7; the rest are supplement-only (`withSupplement`). Show only calibrated values, or mark the rest as unverified.
- O5. Full edited presets are not yet recalled on the camera (write-only, verified path only).
- O6. Exposure samples do not cover every 1/3-stop value (EV). Check before enabling the `ev` row for writing.
- O7. `ev` (`Bù sáng`): design-only; no codec field. Decide whether to write it at all.
- O8. White balance presets `Nắng` and `Bóng râm`: design-only; codec has `awb` and `ctemp`. Map or drop.
- O9. Spacing 6, 10, 14 used in design; tokens have 4, 8, 12, 16, 20. Round or add.
- O10. Enum mismatches:
  - `metering`: design 3 options vs codec 6.
  - `focusArea`: design 4 options vs codec 5; `Giữa` has no codec value.
  - `autoReview`: design lacks `10s`.
  - Soft skin levels are index-aligned with the codec (`off`/`low`/`mid`/`high`); no mismatch.
- O11. `knee_auto_sens` and `softSkin` index orders are both index-aligned with the codec.
- O12. Design `./support.js` is missing. Behavior taken from the embedded script; no spec item depends on it.
- O13. Duplicate labels: `PPG` has `S-Log3` twice (PP8, PP9); `PPC` has `ITU709` twice (PP3, PP4). Confirm the intended labels.
- O14. Two filter sets (`FX` and `SCENE0`) disagree for the same scene names. This spec uses `SCENE0` for slot thumbnails and `FX` for live-view preview only; confirm.
- O15. Edit markers: slot `edited` is set by any commit; row marker compares against base. Implement both as in section 7.2, or unify.
- O16. `ppVals` default for `black_level` is `−2` for banks 1 to 6 (within `−15…15`); confirm.
- O17. `HERO` map and `SEED.pp` (0-based bank index assumed) meanings unconfirmed.
- O18. `need1` on the Kelvin row (dependency flag): meaning inferred from the Kelvin label logic. Confirm.
- O19. `Thử lại` action on screen 4 (fail): restart write assumed. Sign-out target (`Đăng xuất`) not defined in the design; assumed to go to screen 7.
- O20. `expo-font` `useFonts` not re-checked against docs in this pass. `formSheet` iOS behavior not verified.
- O21. CSS filter strings in section 5.2 have no React Native equivalent. Choose a rendering path before building preview thumbnails.
- O22. Dark palette: design dark (section 1.2) vs canonical web dark (section 1.1 note). Choose one.
- O23. Canvas file `docs/design-v21/AlphaColorLab.canvas.dc.html` is 20,732 B on disk (checked). The earlier 18,688 B note is stale.
- O24. `makeCreate` mutates the global `LOOK` map for non-SCENE0 names. Do not port this; keep scene aliases as constants.
- O25. Closed: mode order `P`, `A`, `S`, `M` matches `profile.json` `profile.shoot_modes` keys (verified).
- O26. Design keyframe assignments (`acl-spin`, `acl-pulse`, `acl-pop`): inferred from usage names; confirm against the outline.
- O27. Write behavior for rows never edited (explicit default vs `"keep"`): not confirmed in the design.

---

## 14. Decisions for the 2026-11-18 night run (owner away; revisit in the morning)

Defaults chosen so implementation can proceed without owner input. Each is easy to revert.

- D1 Codec is the source of truth. Every value list, step and enum comes from the codec (dat.ts, options.ts). O1: knee steps follow the codec (5%). O2/O4: show only codec-calibrated color_mode/gamma values. O10: metering/focusArea/autoReview use codec options.
- D2 Design-only rows with no codec field are hidden: `ev` (Bù sáng), WB `Nắng`/`Bóng râm` (O7, O8). Never show a control that cannot be written.
- D3 Codec fields missing from the design stay reachable (the existing editor keeps them under the stage they belong to, or under a collapsed "Nâng cao").
- D4 Dark palette: design dark (section 1.2), following the system color scheme. `src/ui/tokens.ts` and `design/tokens/*` belong to the Design session: do not edit them. New tokens (dark set, accent wash, outline, disabled, scrim, 48px control height) go in a new `src/ui/theme.ts` that re-exports light values from tokens.ts.
- D5 Scene previews (O14, O21): bundled `assets/scenes/*.jpg` shown plain, with at most a translucent color overlay per look. No CSS-filter emulation.
- D6 Google sign-in (screen 7) not built. Onboarding starts at device pick (screen 8). Account menu hidden. No "Đăng xuất".
- D7 KOL tab and "Sưu tầm" hidden (no bundled KOL data). Tabs shown: "Khuyên dùng", "Của tôi".
- D8 "Báo khi hỗ trợ" hidden. Unsupported cameras stay selectable; write button disabled with "Chưa hỗ trợ <tên>" (matches P5 gating in src/core/models.ts).
- D9 Card-session logic (USB subscribe, mountWait, all-files access, picker) must keep working exactly as today. It moves with the card status UI, it is not rewritten.
- D10 Write path untouched: planWrite/planWriteFor, bundled headers, backups, recovery. UI changes only.
