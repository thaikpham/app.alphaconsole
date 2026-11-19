# Kế hoạch: Lab giải mã trong app (19/11/2026)

Mục tiêu: điện thoại tự làm trọn một lượt giải mã (ra đề → người dùng lưu M1–M4 → đọc thẻ → phân tích → cập nhật bảng thiếu/đủ → xuất lượt cho web), không cần máy tính. Đồng thời mở đường cho máy chưa có codec (A6700, A7C, A7 IV, ZV-E1).

## 1. Hiện trạng

| Phần | Web (`Web.AlphaColorLab`) | App |
|---|---|---|
| Danh mục cài đặt từng máy | `data/decode-catalog.json`, `lib/decode/catalog.ts` | — |
| Ra đề lượt (4 ô, mỗi ô 1 mục tiêu) | `lib/decode/plan.ts` `planMission`, `mission.ts`, `rules.ts` | — |
| Kiểm đủ file, đúng máy, đúng thứ tự lưu | `lib/decode/verify.ts`, `card.ts` | — |
| Phân tích lượt → Finding (confirm/code/mismatch/locate/ambiguous) | `lib/decode/analyze.ts` | — |
| Ma trận + tóm tắt thiếu/đủ | `lib/decode/{status,statusCore,matrix,adapters,observed}.ts`, `data/decode-observed.json` | — |
| Chạy lượt trên web (chỉ admin) | `app/components/decode/RoundRunner.tsx`, `/admin/decode/plan`, lưu lượt vào `test/fixtures/rounds/` khi `npm run dev` | — |
| Đọc thẻ qua USB, codec 3 máy | — | `src/card/*`, `src/core/web/lib/*` (sync) |
| Đọc thông số PTP | — | `src/core/preview/props.ts` (9 prop, ZV-E10) |

Toàn bộ `lib/decode/*` là TS thuần, trừ `lib/decode/scanFs.ts` (dùng `node:fs`, chỉ cho script). Sync sang app được bằng `npm run sync-core`.

Mini game đã gỡ khỏi web (19/11/2026): không còn điểm số, biệt danh, gửi Supabase, trang `/giai-ma`. Lab là công cụ nội bộ.

Giới hạn hiện có: `DecodeModel` chỉ có `zve10 | a6400 | a7c2`; bộ phân tích cần adapter riêng từng máy.

## 2. Các giai đoạn

### L0 — Đồng bộ lõi (0,5 ngày)
- Thêm vào `scripts/sync-core.mts`: `lib/decode/{types,catalog,mission,plan,planRequest,rules,verify,card,analyze,adapters,cap,matrix,observed,status,statusCore,table}.ts`, `data/decode-catalog.json`, `data/decode-observed.json`. Bỏ `scanFs.ts`.
- Kiểm: `npm run check-core`, `tsc --noEmit`, bundle Metro nhập được JSON `with { type: "json" }` (nếu không: shim như `textDecoder`).
- Test: chạy lại `modelSummary` trong app, số khớp `decode-summary.json` (ZV-E10 56/92, A6400 24/86, A7C II 66/104).

### L1 — Màn thống kê (1–2 ngày)
- Route `src/app/lab/index.tsx`: thẻ mỗi máy (đã xác nhận / chờ / đoán / chưa biết, số lượt còn lại).
- `src/app/lab/[model].tsx`: danh sách cài đặt, mỗi giá trị một chip trạng thái; mục chưa định vị nổi lên đầu.
- Máy chưa có codec (A6700…) hiện "chưa có bộ khung", kèm số cài đặt trong danh mục nếu có.
- Lối vào: MoreSheet → "Lab giải mã" (ẩn sau cờ dev cho tới L3).
- Kết quả cục bộ (`LocalFindings`) lưu file như `userSetsFile.ts`, gộp bằng `mergeLocal`.

### L2 — Lượt giải mã (3–4 ngày)
1. Ra đề: `planMission(model, { seed, local })`, hiện 4 ô, mỗi ô liệt kê bước "đặt X = Y" với đường dẫn menu (`path`).
2. Người dùng đặt máy, lưu MR vào M1→M4 đúng thứ tự.
3. Cắm Mass Storage → dùng lại `src/card/session.ts` đọc `PRIVATE/SONY/SETTING/<folder>/CAMPR0{1-4}{N|P}.DAT` → `CardFile[]`.
4. `verify` → báo ô cần làm lại; `analyzeRound` → Finding; cập nhật ma trận ngay trên màn.
5. Lưu cả lượt (đề + file + finding) cục bộ để xuất ở L4.
- Chống mất dữ liệu: chỉ đọc, không ghi thẻ trong Lab.

### L3 — Kiểm trước khi lưu qua PTP (2 ngày, ZV-E10 trước)
- Khi bật PC Remote: mỗi ô, đọc prop PTP và so với bước của đề cho các mục có prop (chế độ, khẩu, tốc, ISO, WB, Kelvin, lấy nét, đo sáng, PP#). Đúng thì cho bấm "Đã lưu Mx".
- Ràng buộc: bật "Điều khiển bằng điện thoại" thì máy luôn vào PC (PID 0D97), không ra Mass Storage. Màn phải hướng dẫn tắt trước bước đọc thẻ, rút cáp cắm lại.
- Lợi: giảm lượt bị gán nhãn sai (nguồn chính của `mismatch`).

### L4 — Đưa lượt về web (1 ngày)
- Xuất lượt thành ZIP: `mission.json` + 4 file `CAMPR0x[PN].DAT`, đúng bố cục `test/fixtures/rounds/<model>/<id>/` của web.
- Chia sẻ qua Android share sheet (Drive, máy tính); admin chép vào web rồi `npm run decode:scan`, bảng tự cập nhật.
- Không gửi mạng, không tài khoản, không điểm số.

### L5 — Máy mới chưa có codec (theo máy, 3–5 ngày/máy)
Làm ở **web trước** (luật một nguồn sự thật), rồi sync:
1. Thu mẫu: 4 file M1–M4 + header; xác định thư mục `SETTING/<?>`, chuỗi model, kích thước, checksum (thử `checksum38` của ZV-E10 và cấu trúc bản ghi của A7C II).
2. Xếp máy vào một trong hai họ: **offset cố định** (ZV-E10, A6400 — menu cũ) hoặc **bản ghi ID** (A7C II — menu mới). A6700/A7 IV/ZV-E1 nhiều khả năng là họ bản ghi, A7C là họ offset.
3. Thêm "chế độ diff thô": khi máy chưa có adapter, `analyzeRound` vẫn trả `locate` với ứng viên byte/bản ghi đổi giữa các ô. Đây là thay đổi chính ở web.
4. Mở rộng `DecodeModel`, `models.ts`, danh mục `decode-catalog.json` cho máy đó.
5. App: sau sync, máy mới tự hiện trong Lab.

## 3. Thứ tự và ước lượng
L0 → L1 → L2 là bản dùng được (~1 tuần). L3, L4 song song sau đó. L5 phụ thuộc web và mẫu máy thật.

## 4. Kiểm thử
- Unit: dùng fixtures của web (`test/fixtures/rounds/`, `camera-saved.json`) chạy `analyzeRound` trong app, kết quả trùng web.
- Trên máy: Oppo + ZV-E10, một lượt đủ 4 ô, so finding với web cho cùng file.
- Trước khi xong mỗi giai đoạn: `npx expo lint`, `npx tsc --noEmit`, `npm test`, `npm run check-core`.

## 5. Đã chốt
- Không có game ở cả app và web; Lab chỉ cho nội bộ (ẩn sau cờ dev).
- Không gửi Supabase; lượt đi về web bằng file.

## 6. Còn cần quyết định
1. Máy mới ưu tiên: A7 IV, A6700, A7C hay ZV-E1? (Cần máy thật để chụp mẫu.)
