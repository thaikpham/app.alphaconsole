Bản v3 có 2 việc. Toàn bộ chữ trên UI vẫn bằng tiếng Việt.

VIỆC 1: ĐỔI HỆ MÀU MỚI CHO TRANG ANDROID ĐANG CÓ
Màu thương hiệu đổi, áp dụng cho mọi frame và prototype 1a:
- Nền #f2f2f7, card #ffffff, chữ #0b0d12, chữ phụ #4a5260, viền #e3e6eb.
- Accent #c2410c, chữ trên nút accent màu TRẮNG #ffffff (thay cho chữ đen). Chữ/link màu nhấn cũng dùng #c2410c.
- Success #127a3a, warning #a84e00, danger #c8261b (giữ nguyên).
- Font, bo góc, các luật khác giữ nguyên (1 nút accent mỗi màn; không gradient/glow/emoji; dùng "Sưu tầm").

VIỆC 2: THÊM TRANG MỚI "iOS · SwiftUI"
Chuyển cùng 6 màn và các trạng thái của bản Android sang iPhone (393×852, có Dynamic Island và home indicator), theo Apple HIG và các thành phần gốc của SwiftUI. Giữ nguyên trang Android.

Màu (light / dark), giống token Android:
- bg #f2f2f7 / #000000 · card #ffffff / #1c1c1e · sheet #ffffff / #2c2c2e
- chữ #0b0d12 / #f5f5f7 · chữ phụ #4a5260 / #a1a1a6 · viền #e3e6eb / #38383a
- accent (tint) #c2410c / #ff7a2e · chữ trên accent #ffffff / #0b0d12
- success #127a3a / #30d158 · warning #a84e00 / #ffb340 · danger #c8261b / #ff6961
Vẽ toàn bộ ở light. Thêm 2 frame dark mode mẫu: Chỉnh slot và Xem thử.

Đổi sang kiểu iOS / SwiftUI:
- Font hệ thống SF Pro theo Dynamic Type: Large Title 34, Title2 22, Headline 17 semibold, Body 17, Callout 16, Footnote 13. Trên iOS không dùng Noto Sans.
- Điều hướng: NavigationStack. Màn gốc "Alpha Color Lab" dùng tiêu đề lớn, màn con dùng tiêu đề inline. Nút Back kiểu iOS ("‹" + tên màn trước), không dùng nút back tròn kiểu Android.
- Danh sách: List .insetGrouped (bo 10–12, có section header/footer) thay cho card bo 24. ValueRow thành row của List: nhãn trái, giá trị phải, có chevron khi chạm được.
- M1–M4 và Đặt / Giữ nguyên: Picker .segmented.
- Bật/tắt: Toggle iOS, khi bật dùng màu tint.
- Chỉnh số (khẩu độ, tốc độ, ISO, Kelvin, 25 tham số PP): chạm vào row thì mở .sheet với presentationDetents [.medium]. Trong sheet có Picker .wheel hoặc Stepper, có Đặt / Giữ nguyên, nút "Xong" ở thanh trên của sheet.
- 5 công đoạn: chọn cách gọn hơn giữa (a) thanh tiến trình 5 đoạn dưới navigation bar kèm tên bước và (b) TabView dạng trang. Giải thích ngắn lý do chọn.
- Nút chính: .borderedProminent .capsule, cao 50, đặt trong safeAreaInset ở đáy màn. Nút phụ dùng .bordered hoặc nút chữ.
- Icon SF Symbols: cable.connector, camera, checkmark.circle.fill, exclamationmark.triangle.fill, arrow.counterclockwise, viewfinder, bookmark.
- Trạng thái: các bước ghi dùng ProgressView. Lỗi hiện trong Section, có icon SF Symbol. Xác nhận khôi phục dùng .confirmationDialog.
- Live view: khung 16:9 bo 12, chạm vào thì mở fullScreenCover.

Khác biệt nền tảng ở màn Cắm máy:
- iOS không có SAF. iPhone có cổng USB-C (15 trở lên) đọc ổ USB qua app Tệp bằng UIDocumentPicker. Bước (c) đổi thành "Chọn thẻ máy ảnh trong Tệp": chọn thư mục gốc của thẻ, chỉ làm lần đầu.
- Thêm ghi chú nhỏ: cần iPhone có cổng USB-C.

Yêu cầu chung:
- Vẽ các frame tĩnh tương ứng 1b–1p của Android, đánh số 2b–2p. Dưới mỗi frame ghi chú SwiftUI ngắn, ví dụ "List .insetGrouped · Picker .segmented".
- Nếu được, thêm prototype iOS bấm được (2a).
