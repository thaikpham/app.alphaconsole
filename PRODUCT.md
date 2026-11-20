# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users
Người Việt dùng máy ảnh Sony Alpha (ZV-E10 trước; A6400, A7C II theo tiến độ web), phần lớn mới hoặc trung cấp. Họ cắm máy hoặc thẻ nhớ vào điện thoại, chọn bộ màu M1–M4, xem thử và ghi vào máy, không phải bấm menu tay. (Chủ dự án xác nhận 2026-11-20.)

## Product Purpose
Alpha Console: tạo, sửa, xem thử và ghi bộ M1–M4 (Memory Recall `.DAT`) vào thẻ nhớ hoặc máy ảnh qua USB; sao lưu bộ cũ trước khi ghi. Thành công là bộ màu chạy trên máy thật, không File Error.

## Positioning
Đọc và ghi file `.DAT` đúng từng byte cho từng mẫu máy, ngay trên điện thoại; dùng chung lõi codec với web (`src/core/web/`, đồng bộ bằng `npm run sync-core`). (Chủ dự án xác nhận 2026-11-20.)

## Operating Context
- Máy thử: Oppo Find X9 (ColorOS), Sony Xperia 1 VII, iPhone.
- Thẻ nhớ qua đầu đọc USB-C hoặc máy ở chế độ Mass Storage; live view qua USB (PTP).
- Cùng mã nguồn ra bản console web (`/console` của Web.AlphaColorLab) bằng `npm run sync`.

## Capabilities and Constraints
- Expo SDK 58, Expo Router (Stack), React Native 0.88, React Compiler bật.
- iOS/Android sinh bằng CNG: không sửa `ios/`, `android/` tay.
- Module native phải có bản web (`*.web.ts(x)`) hoặc nhánh `Platform.OS === "web"`.
- Thêm thư viện bằng `npx expo install`; module native mới cần build lại dev client.
- Token lấy từ `Web.AlphaColorLab/design/tokens/` (một nguồn).

## Brand Commitments
- Tên Alpha Console; một màu nhấn cam Alpha (`#c2410c` nền nút chữ trắng); một nút chính mỗi màn.
- Thiết kế thích ứng theo OS (chủ dự án 2026-11-20): iOS theo Liquid Glass iOS 27, Android theo ColorOS 17 trên nền Material, console web theo Web. Cùng chức năng, cùng token.
- Chữ tiếng Việt ngắn; không chữ giải thích dưới nút.

## Evidence on Hand
- Bộ preset dùng chung với web, file máy thật trong `fixtures/`, ảnh cảnh mẫu trong `assets/scenes/`.
- Không có số liệu người dùng: không được bịa.

## Product Principles
1. Đúng trước đẹp: không bao giờ ghi file sai; luôn sao lưu trước khi ghi.
2. Ảnh và màu là thứ sáng nhất màn hình; điều hướng lùi lại.
3. Một việc chính mỗi màn.
4. Cảm giác máy thật: phản hồi chạm, rung, chuyển động theo tay.

## Accessibility & Inclusion
Vùng chạm ≥ 44pt (iOS) / 48dp (Android); tôn trọng Reduce Motion, Reduce Transparency, cỡ chữ hệ thống; tương phản chữ trên kính ≥ 4.5:1 ở trường hợp xấu nhất.
