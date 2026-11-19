# Alpha Color Lab — App Blueprint (bản 9, P0 đạt — chờ P1)

Ngày: 2026-11-17 · Trạng thái: CHƯA CODE · Android APK trước, iOS sau.

**Phạm vi chốt:** chỉ một đường chuyển MR = **cáp USB-C 2 đầu nối thẳng điện thoại ↔ máy ảnh** (máy ở chế độ Mass Storage), app ghi 4 file `CAMPR0x.DAT` giống quy trình web đang dùng với máy tính. **Bỏ hoàn toàn Wi-Fi.**

**Mới ở bản 4:** thêm bước **Xem thử màu qua live view trên điện thoại**, cùng cáp USB-C, máy ảnh chuyển sang chế độ PC Remote.

---

## 0. Cơ sở

| # | Sự thật | Nguồn | Hệ quả |
|---|---|---|---|
| 1 | Web đã đọc/ghi MR bằng file `CAMPR0{1-4}{N/P}.DAT` trên thẻ, qua máy ảnh cắm USB vào máy tính. | `AlphaColorLab/lib/zve10`, `lib/cardWriter.ts`, `lib/decode` | App làm y hệt, chỉ thay máy tính bằng điện thoại. |
| 2 | File `.DAT` chứa trọn bộ MR, kể cả 25 tham số PP chi tiết. | `lib/zve10/dat.ts` | Chuyển đủ 100%, không mất gì như đường Wi-Fi. |
| 3 | Sony không có lệnh PTP/Wi-Fi để ghi MR1–MR4; máy menu cũ chỉ nhận WB + số PP qua Wi-Fi. | PTP 2/3 Ref, CrSDK 2.02, APK AlphaTone | Lý do bỏ Wi-Fi. |
| 4 | Tiến độ giải mã: ZV-E10 ghi được (đã hiệu chỉnh). A6400 chỉ đọc (24/86 giá trị xác nhận). A7C II 66/104. **A7C đời 1 chưa có codec.** | `data/decode-summary.json` | v1 = ZV-E10. Máy khác mở khi web giải mã xong. |
| 5 | ZV-E10 hỗ trợ PC Remote qua USB (PTP). AlphaTone có `UsbTransport` PTP và ghi ZV-E10 "partial" cho điều khiển trực tiếp. CrSDK không hỗ trợ ZV-E10 đời 1. | APK AlphaTone, CrSDK compatibility | Live view qua PTP-USB khả thi nhưng phải xác minh trong P0. Dự phòng: USB Streaming (UVC). |

---

## 0b. Kiểm tra trên ZV-E10 thật (17/11/2026, máy cắm USB vào Ubuntu)

| Quan sát | Giá trị | Hệ quả cho app |
|---|---|---|
| USB ở Mass Storage | VID `054c`, PID `0d95`, iProduct `ZV-E10`, có serial, USB 3.2, lớp Mass Storage SCSI Bulk-Only | Lọc intent `USB_DEVICE_ATTACHED` theo VID 054c để tự mở app; PID chế độ PC Remote ghi lại trong P0 |
| Máy xuất **2 ổ** | Ổ thẻ 118 GB **exFAT** + ổ ảo `PMHOME` 64 MB vfat chỉ đọc | App phải tự chọn đúng ổ thẻ (có `DCIM` hoặc `PRIVATE/SONY/SONYCARD.IND`), bỏ qua PMHOME |
| Thẻ 128 GB format trong máy | exFAT | exFAT là trường hợp **chính**, không phải ngoại lệ. libaums không đọc exFAT → dự phòng libaums chỉ cứu thẻ ≤32 GB; phải dựa vào Android tự mount |
| Thẻ vừa format | Chỉ có `PRIVATE/SONY/SONYCARD.IND`, `PRIVATE/M4ROOT/...`, `AVF_INFO`, `DCIM`. **Chưa có `PRIVATE/SONY/SETTING`** | Thẻ mới format chưa có file M1–M4. Cần máy lưu M1–M4 một lần (hoặc app tạo từ mẫu như ZIP của web) |
| `PRIVATE/M4ROOT/MEDIAPRO.XML` | `systemKind="ZV-E10"` | Nhận model ngay cả khi chưa có thư mục SETTING |
| EXIF ảnh chụp thử | `Software = ZV-E10 v2.03`; M, 1/100, f/7.1, ISO 1000, WB 5500K, Creative Style Standard, DRO; MakerNote Sony 103 tag (một phần mã hoá) | Biết firmware để kiểm tương thích; đọc ảnh chụp thử để đối chiếu slot mà **không cần đổi chế độ USB** |
| ZIP web `ZV-E10_M1-M4.zip` | 4 file hợp lệ; **cả 4 có byte chọn PP `0x315` = 0 (PP tắt)** dù có thông số PP1 (vd M1 black_level −2, saturation 6) | Bộ trong `preset-sets.json` không có `ppOn`, nên `buildSet` giữ byte PP của file mẫu (= tắt). Gọi lại M1–M4 có thể **không bật PP** → màu không như ý. **Đã xác nhận trên máy 17/11: gọi lại M1 → PP tắt.** Cần sửa ở web (đặt `ppOn: true` khi slot có `pp`) và app phải đặt rõ `ppOn` |
| **Thử nạp qua cáp (17/11)** | Chép 4 file qua USB Mass Storage → rút cáp → tắt/bật máy, **không tháo thẻ** → gọi lại M1–M4 đúng; M1 ra PP1 (sau khi sửa `ppOn` ở web, `lib/zve10/dat.ts:960`); M2 ra 6200K | Bước Nạp trong app: chỉ rút cáp + tắt/bật máy. Hướng dẫn web (bước "tháo thẻ lắp lại") có thể rút gọn |
| Máy tự ghi đè M2 | File M2 bị thay bằng thông số M1 khi người dùng vào nhầm MR **Memory** | App: cảnh báo "Memory ≠ Recall" ở bước Nạp; khi cắm lại, so file trên thẻ với bộ đã ghi và báo ô nào bị máy ghi đè |
| **P0 trên Oppo Find X9 (Android 17)** | Mass Storage: PID `0D95`, Android tự mount ổ thẻ exFAT `FFFB-E88D` + PMHOME `149F-411A` | exFAT trên điện thoại: **đạt**. App chọn ổ có `PRIVATE/SONY/SONYCARD.IND` |
| PC Remote (MENU › Mạng › PC Remote: Bật) | PID `0D97`, lớp PTP (6/1/1), GetDeviceInfo `ZV-E10` fw 2.03, Sony ext 100; SDIO_Connect 1/2/3 + GetExtDeviceInfo 0xC8 OK (ext 200); 80 thông số; **live view 1024×680, 12–15 fps** | Bước Xem thử: **đạt**, không cần UVC |
| Đọc thông số sau khi gọi M1 | `0x500E`=3 (A), `0x5005`=2 (AWB), `0x500A`=0x8004 (AF-C), `0x500B`=0x8001 (Multi), `0xD21E`=AUTO, `0xD23F`=1 (**PP1**) | Khớp slot M1. Máy báo chế độ thật (A), không báo "MR", nên app suy ô đang dùng bằng cách so thông số với 4 slot |
| Ghi thẻ từ điện thoại (SAF) | ColorOS cho chọn gốc ổ USB, `canWrite=true`; đọc `SONYCARD.IND`, `MEDIAPRO systemKind=ZV-E10`; sao lưu 4 file → ghi đè → đọc lại so byte: **ALL OK**, 53–69 ms/file; EXIF ảnh mới nhất đọc được | Đường ghi chính: **đạt** trên Oppo Find X9 |
| Rút cáp khi đang live view | `bulkOut sent -1` rồi USB detached | App phải bắt lỗi ngắt cáp, dừng live view êm, báo người dùng |
| Ngày giờ file | 2021-06-08 | Đồng hồ máy chưa đặt; không ảnh hưởng ghi file, có thể nhắc người dùng |
| **Header `0x24=03` → file error (18/11, Oppo)** | App mượn header 0x00–0x37 từ file máy lưu trên thẻ (`0x24=03`, ngày 2021-06-08) ghép thân mẫu → máy báo *file error* cả M1–M4. Thử chéo: header mẫu `02` (ZIP web) gọi được; file `03` do chính máy lưu cũng *file error* | App **luôn** ghi header đi kèm (`src/core/transfer/plan.ts` `planWrite`), = ZIP web từng byte. Sau sửa: ghi qua app → gọi M1–M4 **đạt**. Web không mắc: ZIP và PresetBuilder chỉ dùng header mẫu `public/dat/zve10-<hệ>-m1..4.dat` (PAL `0x24=02`); chú thích `buildSet` đã ghi rõ |
| Mount trên Oppo (18/11) | Android mount PMHOME trước (~5 s, lỗi vì chỉ đọc), thẻ sẵn sàng ~7–8 s sau khi cắm | App chờ sự kiện volume + poll 2 s/60 s, hiện "Android đang mở thẻ…"; đọc xong 0,5 s sau khi thẻ mount |
| Đọc thẻ chậm 19,5 s (18/11) | `parseDat` tính lại `tail()` cho từng byte (`lib/zve10/dat.ts:371`) | Đã sửa ở web (tính một lần) + sync; đọc thẻ 0,11 s |

---

## 1. Đường truyền

| Đường | Cách hoạt động | Máy | Ưu tiên |
|---|---|---|---|
| **USB-C 2 đầu (duy nhất)** | Máy ảnh: Kết nối USB = Mass Storage → cắm cáp USB-C vào điện thoại → Android nhận như ổ USB → app ghi 4 file `.DAT` vào `PRIVATE/SONY/SETTING/<model>/` → đọc lại so byte → rút cáp → nạp trên máy theo hướng dẫn "Cài tay" của web. | ZV-E10 (v1); A6400, A7C, A7C II khi codec ghi xong | v1 |

**Luật thẻ nhớ (bắt buộc):** thẻ luôn phải được **format trong máy ảnh** để có cấu trúc và định dạng của Sony Alpha.
- App **không bao giờ** format thẻ. Thẻ phải có dấu Sony (`PRIVATE/SONY/SONYCARD.IND`, `PRIVATE/M4ROOT/MEDIAPRO.XML`); không có → dừng, hướng dẫn format trong máy.
- **Tạo từ mẫu (chốt 17/11, giống ZIP của web):** thẻ chưa có `PRIVATE/SONY/SETTING/E10/` → app tạo thư mục và ghi 4 file sinh từ file mẫu nhúng trong app (`public/dat/zve10-{pal,ntsc}-m{1..4}.dat` của web). Thẻ đã có file của máy → dùng header của chính máy (`buildSet`), sao lưu trước rồi ghi đè.
- Hệ PAL/NTSC: lấy từ file sẵn có trên thẻ; thẻ trống → hỏi một lần (mặc định PAL cho máy bán ở Việt Nam) và nhớ theo serial USB của máy.
- Đã kiểm ZIP tải từ web (`ZV-E10_M1-M4.zip`, bộ "ZV-E10 Hybrid", PAL): 4 file `PRIVATE/SONY/SETTING/E10/CAMPR0{1-4}P.DAT`, 4608 byte, codec web đọc hợp lệ cả 4. Bộ này là fixture cho test và P0.
- Định dạng hệ tệp do máy quyết định theo dung lượng thẻ (thường FAT32 cho ≤32 GB, exFAT cho >32 GB) → app phải đọc/ghi được cả hai (xem rủi ro exFAT).

Cùng cáp, chế độ thứ hai — **Xem thử (live view)**: máy ảnh chuyển Kết nối USB → PC Remote → app mở phiên PTP qua USB Host → lấy khung live view (JPEG) liên tục + đọc thông số đang chạy (chế độ, ISO, WB, số PP) để đối chiếu với slot vừa ghi. Chỉ đọc, không ghi gì qua PTP.

Thêm (đọc ngược, miễn phí cùng code): **"Sao lưu máy"** đọc 4 file hiện có trên máy trước khi ghi, dùng `datImport` để hiện bộ đang có trong máy.

---

## 2. Kiến trúc kỹ thuật

### 2.1 Stack: Expo (React Native) + TypeScript

- **Dùng chung codec TS với web** (`lib/zve10`, `lib/a7c2`, `lib/a6400`, `lib/presetSets`, `lib/ppBanks`, `lib/datImport`) → 1 nguồn sự thật, giữ luật parity trong AGENTS.md. Đường USB là chép file, nên gần như toàn bộ logic đã có sẵn ở web.
- iOS sau: cùng codebase. iPhone USB-C (15+) đọc ổ USB qua Files app / `UIDocumentPicker`; cần thử với máy Sony.

Native module (Kotlin trước, Swift sau):
- `UsbVolume`: SAF `ACTION_OPEN_DOCUMENT_TREE` trên ổ USB, nhớ quyền (`takePersistableUriPermission`), phát hiện cắm/rút (`ACTION_USB_DEVICE_ATTACHED`), tìm `PRIVATE/SONY/SETTING`.
- Dự phòng nếu SAF không thấy ổ: thư viện đọc FAT32 trực tiếp qua USB Host (libaums). exFAT (thẻ > 32 GB) phụ thuộc điện thoại → kiểm trong spike.
- `UsbPtp`: `UsbManager` + bulk transfer, PTP qua USB (OpenSession, `SDIO_Connect`, `SDIO_GetAllExtDevicePropInfo`, `GetObject` handle live view `0xFFFFC002`). Trả khung JPEG cho UI qua event (~15–30 fps tùy máy). Tham khảo luồng `UsbTransport` của AlphaTone + tài liệu PTP 2/3 trong `SDK/`.
- Dự phòng live view: USB Streaming (UVC) bằng thư viện UVC Android, chỉ có hình, không đọc được thông số.

### 2.2 Sơ đồ lớp

```
┌────────────── UI (Expo Router, theme Alpha Color Lab) ──────────────┐
│ Chọn bộ │ Chỉnh 5 công đoạn │ Cắm máy │ Ghi │ Nạp │ Xem thử (live view) │
└───────┬──────────────────────────────────────────────┬──────────────┘
        │ state (zustand)                               │
┌───────▼─────────────────────┐            ┌────────────▼─────────────┐
│ core/preset  (chung web)    │ SlotSett.  │ core/transfer            │
│ core/codec   (chung web)    │──────────► │  buildSet → 4 file DAT   │
│  zve10 / a7c2 / a6400       │            │  backup → write → verify │
│ core/camera/models.ts       │            │  restore khi lỗi         │
│  model, folder, N/P, quyền  │            └────────────┬─────────────┘
└─────────────────────────────┘                         │
                                          ┌─────────────▼─────────────┐
                                          │ native UsbVolume (SAF)    │
                                          │ dự phòng: libaums FAT32   │
                                          └───────────────────────────┘
 core/preview: so thông số máy ↔ slot   ┌───────────────────────────┐
 (ISO, WB, mode, PP#) + chụp nhanh khung │ native UsbPtp (USB Host)  │
 để so sánh M1–M4                ◄────── │ live view JPEG + đọc prop │
                                          │ dự phòng: UVC             │
                                          └───────────────────────────┘
```

### 2.3 Cấu trúc thư mục

```
App.Alphacolorlab/
  app/                    # Expo Router screens
  src/ui/                 # tokens, Button, Card, Segmented, Stepper, ValueRow, StatusChip
  src/core/preset/        # sync từ web
  src/core/codec/         # sync từ web (zve10, a7c2, a6400, datImport)
  src/core/camera/        # models.ts: thư mục, hậu tố N/P, khả năng ghi
  src/core/transfer/      # writeSet.ts, backup.ts, verify.ts
  src/core/ptp/           # mã prop, giải mã giá trị, so slot ↔ máy
  src/core/preview/       # phiên live view, snapshot, so sánh
  modules/usb-volume/     # Expo native module (SAF)
  modules/usb-ptp/        # Expo native module (PTP qua USB Host, live view)
  scripts/sync-core.ts    # chép codec từ ../Web.AlphaColorLab/lib + kiểm hash
  test/                   # parity với fixtures web, writeSet, backup/restore
```

Chia sẻ codec: v1 dùng `scripts/sync-core.ts` + test parity với fixtures web (`test/fixtures/...`). Ổn định rồi tách package `@alphacolorlab/core` dùng chung.

### 2.4 Dữ liệu preset
- Bộ M1–M4 từ `data/preset-sets.json` (fetch alphacolorlab.com + bản nhúng offline).
- Bộ tự tạo: lưu local. Đồng bộ tài khoản / KOL: v2.

---

## 3. Năm công đoạn (theo `SlotSettings`, web `lib/zve10/dat.ts:644`)

| Công đoạn | Field |
|---|---|
| 1. Shooting Mode | mode P/A/S/M, (record mode NTSC/PAL theo hậu tố N/P) |
| 2. Phơi sáng | aperture, shutter, iso / auto, expCompSet, metering |
| 3. Autofocus | focus MF/AF-S/AF-C, focusArea, facePriority, preAF |
| 4. Màu & da | wb (mode, kelvin, A-B, G-M, priority), awbPriority, pp (25 tham số), ppOn, ppBanks, softSkin |
| 5. Hiển thị & Kết nối | autoReview, liveView. Kết nối USB, PC Remote, điều khiển bằng điện thoại, cách kết nối PC Remote: **đã bỏ 19/11** vì Memory Recall không lưu (thử trên máy, `experiments/smartphone-pcremote-20261119`). App hướng dẫn bật/tắt tay theo chế độ USB |
| (Khác, gộp vào bước gần nhất) | steadyShot, eFrontCurtain, flashMode |

Mỗi tham số: **Đặt** / **Giữ nguyên** ("keep" như web). Validate bằng `validateSlot` của web, nên app và web luôn cho cùng kết quả.

---

## 4. Giao diện (design language web, bản thực chiến)

Token từ `AlphaColorLab/DESIGN.md` + `app/globals.css`:
- Nền `#f3f4f6`, card `#ffffff`, chữ `#0b0d12`, phụ `#4a5260`, viền `#e3e6eb`. Accent `#f05a14` (chữ trên accent `#0b0d12`). Success `#127a3a`, warning `#a84e00`, danger `#c8261b`.
- Noto Sans; body 17/27, callout 16/24, footnote 13/19, title2 24/32.
- Bo góc: card 24, control 14, badge 8. Nút cao 44, pill. Ease `cubic-bezier(0.16,1,0.3,1)`.
- Luật chủ: 1 nút accent/màn hình; không chữ xám mờ; không gradient, glow, emoji; light mode. "Sưu tầm" bộ M1–M4, không "lưu".

### 4.1 Luồng

```
[1 Chọn bộ] → [2 Chỉnh slot] → [3 Cắm máy] → [4 Ghi] → [5 Nạp trên máy] → [6 Xem thử]
                     ▲                                                     │
                     └──────────────── Chỉnh lại slot ◄────────────────────┘
```

**1 Chọn bộ**: chọn máy (ZV-E10; máy khác hiện "đang giải mã"), danh sách bộ M1–M4 (khuyên dùng, KOL, của tôi). Mỗi bộ = 4 ô slot có nhãn.

**2 Chỉnh slot** (lõi compact):
```
┌ M1 · Đời thường ────────────── [M1][M2][M3][M4] ┐
│ ① Chụp  ② Phơi sáng  ③ AF  ④ Màu & da  ⑤ Hiển thị │  ← stepper, chấm = đã chỉnh
├─────────────────────────────────────────────────┤
│ Chế độ        [P][A][S][M]                      │
│ Khẩu độ       ‹ f/2.8 ›                         │
│ Tốc độ        Giữ nguyên  ›                     │
│ ISO           [Auto] ‹ 100–6400 ›               │
├─────────────────────────────────────────────────┤
│               [ Tiếp: Autofocus ]               │
└─────────────────────────────────────────────────┘
```

**3 Cắm máy**: 3 bước có hình: (a) trên máy: Kết nối USB → Mass Storage, (b) cắm cáp USB-C, (c) chọn ổ máy ảnh (SAF, chỉ lần đầu). App tự nhận model + NTSC/PAL từ file có sẵn. Kiểm "thẻ đã format trong máy + đủ 4 file"; thiếu → thẻ hướng dẫn format + lưu cài đặt trên máy, không cho ghi.

**4 Ghi**: tự sao lưu 4 file hiện có → ghi 4 file mới → so byte → "Đã ghi M1–M4". Lỗi giữa chừng → tự khôi phục bản sao lưu.

**5 Nạp trên máy**: hướng dẫn từng bước theo model (dùng lại nội dung "Cài tay" của web), nút "Khôi phục bản trước" nếu cần.

**6 Xem thử** (live view trên điện thoại):
```
┌ Xem thử · ZV-E10 ─────────────── [M1][M2][M3][M4] ┐
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │          live view từ máy ảnh (16:9)        │ │  ← chạm: toàn màn hình
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ Máy đang ở: MR1   ✓ khớp slot M1                 │
│ A · f/2.8 · 1/125 · ISO Auto · AWB · PP1         │  ← đọc từ máy, ô lệch tô warning
├─────────────────────────────────────────────────┤
│ Ảnh nhanh: [M1 ▣] [M2 ▣] [M3 □] [M4 □]          │  ← chụp khung để so 4 slot cạnh nhau
│ [ Chỉnh lại slot ]          [ Xong ]             │
└─────────────────────────────────────────────────┘
```
- Hướng dẫn chuyển máy: Kết nối USB → PC Remote, vặn núm/chọn MR1…MR4. App tự nhận MR đang chọn và tô đúng ô slot.
- **Ảnh nhanh**: lưu 1 khung live view mỗi slot (cùng khung cảnh) → xem 4 ô cạnh nhau hoặc gạt trước/sau 2 slot.
- **Chỉnh lại slot** → quay về bước 2 → ghi lại cần chuyển máy về Mass Storage (app nhắc từng bước).
- Live view phản ánh màu thật của máy (PP, WB, Creative Look đã nạp), không phải mô phỏng.
- **Dự phòng không cần PC Remote — Ảnh chụp thử:** chụp 1 tấm ở mỗi MR, cắm lại (vẫn Mass Storage), app đọc JPEG + EXIF (mode, tốc, khẩu, ISO, WB, Creative Style/PP) và xếp 4 ảnh M1–M4 cạnh nhau, ô lệch slot tô warning. Đã xác nhận đọc được EXIF trên ZV-E10 v2.03.

---

## 5. Kế hoạch triển khai

| Pha | Nội dung | Tiêu chí duyệt | Ước lượng |
|---|---|---|---|
| **P0 Spike** (gate) — *ĐẠT 17/11 trên Oppo Find X9 (Android 17) + ZV-E10 PAL fw 2.03: ghi thẻ exFAT qua SAF, nạp không tháo thẻ, live view PTP 12–15 fps, đọc thông số. Còn: Xperia 1 VII* | APK thử tối giản: (a) chọn ổ USB qua SAF, tạo `PRIVATE/SONY/SETTING/E10/` + ghi 4 file từ ZIP web lên thẻ vừa format; thử 3–4 điện thoại; thẻ ≤32 GB (FAT32) và >32 GB (exFAT), cả hai format trong máy; nạp trên máy. (b) PC Remote qua USB: mở phiên PTP, lấy 1 khung live view, đọc mode/ISO/WB/PP#. (c) Nếu (b) hỏng: thử UVC. (d) Sau khi ghi qua cáp: rút cáp + tắt/bật máy (không tháo thẻ) có đủ để máy đọc bộ M1–M4 mới không (web hiện yêu cầu tháo thẻ lắp lại). (e) Điện thoại chọn đúng ổ thẻ exFAT, bỏ PMHOME. | Ghi + nạp đúng trên ≥2 điện thoại; có ảnh live view trên điện thoại bằng PTP hoặc UVC. | 3–4 ngày |
| P1 Nền tảng | Expo app, design system, `sync-core` + test parity, native `UsbVolume`. | Test parity xanh; app đọc được 4 file từ máy và hiện bộ đang có. | 1 tuần |
| P1 Nền tảng — **ĐẠT 17/11** | APK chạy độc lập trên Oppo; check-core 25 file; 42 test; đọc thẻ thật hiện M1–M4 + nhận bộ Hybrid. Phản hồi: sau Chọn thẻ thiếu bước tiếp → P2 thêm luồng có hướng dẫn | | |
| P2 Preset + trình chỉnh | Màn 1–2, 5 công đoạn, validate như web. | Tạo 1 bộ M1–M4 offline, kết quả `buildSet` trùng web byte-by-byte. | 1 tuần |
| P2 Preset + trình chỉnh — **ĐẠT 18/11** (code) | 80 test (parity bộ đã chỉnh = web byte-by-byte), APK arm64 33,5 MB. Lỗi thấy trên máy: Home báo "format thẻ" khi chỉ là chưa cắm; không vào được Chọn bộ khi chưa có thẻ; header "Quay lại" sai kiểu → sửa trong P3 | | |
| P3 Ghi qua USB — **ĐẠT 18/11** | Màn 3–5, backup → write → verify → restore. | ZV-E10: ghi M1–M4, máy nạp, PP chi tiết đúng khi chụp thử. | 4–5 ngày |
| P3b Xem thử — **ĐẠT 18/11** | Native `UsbPtp`, màn 6, đọc thông số + so slot, ảnh nhanh M1–M4. | ZV-E10: live view mượt trên điện thoại, nhận đúng MR đang chọn, số liệu khớp slot. | 1 tuần |
| P3c Tự nhận thẻ (yêu cầu 18/11) — **ĐẠT 18/11** | Bỏ bước "Chọn thẻ": quyền MANAGE_EXTERNAL_STORAGE (cấp 1 lần) → tự đọc `/storage/<uuid>/` khi cắm; tự chọn khe 1 (ổ đầu tiên có `SONYCARD.IND`); ẩn mục Thẻ nhớ, gộp vào 1 dòng trạng thái Máy ảnh. Dự phòng SAF tự mở đúng ổ nếu không cấp quyền. Lưu ý: Google Play hạn chế quyền này | Cắm máy → app hiện M1–M4 trên thẻ không cần bấm gì | 1–2 ngày |
| P3–P3c kết quả trên máy (Oppo + ZV-E10) | Ghi M1–M4 qua File (all-files) → gọi lại cả 4 OK (sau khi bỏ mượn header thẻ). Live view: khung đầu sau 2,4 s (máy trả 0x2009 ~2 s sau kết nối, app thử lại ≤8 s), nhận "M4 ✓ khớp" không cần thẻ, lưu ảnh ô M4. Tự nhận thẻ: đọc 0,1 s, xong 0,5 s sau khi Android mount. Trình chỉnh: chạm công đoạn để nhảy, Lưu/Tiếp ghim đáy. Còn: chụp thử so PP chi tiết, đo fps | | |
| P4 Beta APK — *code xong 19/11; còn: khoá ký thật (chủ dự án chạy keytool), Xperia 1 VII (hoãn vài ngày), màn Hướng dẫn/Nhật ký/chế độ tối trên máy* | Ký APK, crash log, hướng dẫn trong app, test nhiều điện thoại. | APK beta nội bộ. | 3 ngày |
| P5 Mở rộng máy | ZV-E10 ghi+đọc; A7C II đọc, ghi khoá chờ thử máy; A6400 đọc thử nghiệm, thư mục chưa xác định; A7C/A6700/A7 IV/ZV-E1 sắp có. | Ma trận hỗ trợ cập nhật. | theo tiến độ giải mã |
| P4–P5 kết quả trên máy 19/11 (Oppo + ZV-E10, bản 0.9.1–0.9.2) | Thiết kế v21 chạy; ghi + gọi lại MR không lỗi; xem thử tự kết nối khi bật PC Remote. Máy luôn vào "PC" (PID 0D97) khi cắm điện thoại nếu **Điều khiển bằng điện thoại: Bật**, dù PC Remote tắt; laptop vẫn ra Mass Storage. Tắt PC Remote khi đang cắm thì phải rút cáp cắm lại; bật thì tự nối lại <1 s | | |
| v2 | iOS (USB-C), A7 IV / A7 V (khi web giải mã), đồng bộ tài khoản, góp lượt giải mã từ app. | | |

Test: parity codec với fixtures web, writeSet/backup/restore trên ổ giả lập, checklist tay trên máy thật mỗi bản.

---

## 6. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Điện thoại không mount ổ exFAT của máy ảnh (thẻ >32 GB — trường hợp phổ biến) | Cao | P0 thử nhiều hãng; danh sách điện thoại đã thử trong app; libaums chỉ cứu thẻ FAT32 |
| Máy ảnh không cấp nguồn/không nhận khi điện thoại là host | Thấp–TB | Thử trong P0; khuyên dùng cáp USB-C ↔ USB-C có dữ liệu |
| Thẻ chưa format trong máy | Trung bình | App chặn ghi khi thiếu dấu Sony, hướng dẫn format trong máy |
| Slot có PP nhưng PP không bật khi gọi lại | Cao | Luôn ghi rõ `ppOn`; UI hiện công tắc "Bật Picture Profile" ở bước Màu & da; test kiểm byte `0x315` |
| Ghi sai làm hỏng cài đặt | Trung bình | Sao lưu bắt buộc, so byte, chỉ dùng profile đã hiệu chỉnh (`calibrated`) |
| Codec app lệch codec web | Trung bình | `sync-core` + test parity chặn build |
| ZV-E10 không trả live view qua PTP-USB | Trung bình | P0 (b); dự phòng UVC (mất phần đọc thông số) |
| Chuyển qua lại Mass Storage ↔ PC Remote gây phiền | Trung bình | Hướng dẫn có hình, app tự nhận chế độ máy khi cắm; kiểm trong P0 máy có tùy chọn "chọn khi kết nối" không |
| Live view nóng máy / tốn pin điện thoại khi máy hút nguồn | Thấp | Giới hạn fps, tự dừng khi rời màn |
| A6400 / A7C chậm giải mã | Cao (cho phạm vi) | v1 chỉ ZV-E10; máy khác mở theo tiến độ web |

---

## 7. Đã chốt (17/11/2026)

1. Phạm vi v1: **chỉ ZV-E10**; A6400, A7C mở khi web giải mã xong. (PTP 2 Reference có ZV-E10, ILCE-7C, ILCE-6400 → live view qua USB dùng chung code cho cả 3.)
2. AlphaTone: được phép tham khảo; thực tế chỉ dùng giao thức + thông điệp lỗi, codec lấy từ web.
3. Máy thử P0: Oppo Find X9, sau đó Sony Xperia 1 VII.
4. v1 **offline hoàn toàn**: không đăng nhập; bộ M1–M4 nhúng trong app, cập nhật theo bản app; bộ tự tạo lưu trên máy. Tải bộ chia sẻ / đồng bộ tài khoản / KOL để v2.
5. Toolchain build: JDK 17 Temurin `~/.local/jdk-17`, Android SDK `~/Android/Sdk` (platform 35, build-tools 35).
