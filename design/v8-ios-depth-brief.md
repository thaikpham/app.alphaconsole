Bản v8: chỉ sửa trang iOS (prototype 2a và mọi frame 2b–2v, cả 2 frame dark). Trang iOS hiện còn phẳng, chưa giống app iPhone thật. Lý do: chữ chưa đúng SF, danh sách chỉ có chữ, không icon, không hình, kính thiếu chiều sâu, thiếu chuyển động. Giữ luồng, nội dung, token màu, luật "không chữ giải thích", chữ ≥15px, vùng chạm ≥44.

1. CHỮ GIỐNG SF PRO
- Font stack: -apple-system, "SF Pro Text", "SF Pro Display", Inter, system-ui. Nạp Inter (có tiếng Việt) làm fallback để canvas trên Windows/Linux vẫn gần SF.
- Inter rộng hơn SF nên siết tracking cho giống SF: Large Title 34/41 bold −0.8px. Title2 22 bold −0.4px. Headline 17 semibold −0.4px. Body 17 −0.4px. Subhead 15 −0.2px.
- Số đo (f/2.8, 1/125, 5600K) dùng font-variant-numeric: tabular-nums.

2. ICON VÀ MÀU KIỂU iOS
- Row quan trọng có icon SF Symbol trong ô vuông bo 7px, 29×29, nền màu đặc, icon trắng (giống app Cài đặt). Ví dụ: Máy ảnh (camera.fill, accent), Picture Profile (camera.filters, app-colors #0789b0), Cân bằng trắng (thermometer.sun.fill, warning), Lấy nét (viewfinder, app-wiki #0b9468), Hiển thị (display, app-blog #5a55d6).
- SF Symbols dùng bản .fill và rendering hierarchical ở trạng thái: checkmark.circle.fill xanh, exclamationmark.triangle.fill cam, lock.fill xám.
- Vẽ icon bằng SVG theo đúng nét SF (đầu nét tròn, độ dày theo weight của chữ đi kèm), không dùng bộ icon Material/Lucide.

3. CÓ HÌNH, KHÔNG CHỈ CÓ CHỮ
- Thẻ bộ màu (Alpha Cơ bản, Vlog ngoài trời…): thêm dải 4 ảnh xem trước M1–M4, mỗi ô là cùng một ảnh mẫu áp màu khác nhau (CSS filter), bo 10, nhãn M1–M4 nằm trên ảnh dạng chip kính nhỏ. Người dùng nhìn là biết bộ ra màu gì.
- Màn Cắm máy: vẽ minh hoạ ZV-E10 nét mảnh (line art) nối cáp vào iPhone, thay cho khung trống.
- Live view và Ảnh nhanh: dùng ảnh mẫu thật (người, đường phố), không dùng khối xám.
- Màn Ghi xong: dấu tick lớn có hiệu ứng symbolEffect(.bounce) trong prototype.

4. CHIỀU SÂU (LỚP NỀN → THẺ → KÍNH)
- List .insetGrouped kiểu iOS 26: thẻ bo 26 (góc đồng tâm với màn), lề ngang 16, row cao ≥52, separator chỉ chạy từ chỗ bắt đầu chữ (không chạy qua icon). Có section header kiểu iOS 26 (17 semibold, chữ thường, màu label) cho các nhóm.
- Liquid Glass ở thanh đáy, nút Back, nút "Xong", segmented: thêm viền sáng phía trên (inset 0 1px 0 rgba(255,255,255,.7)), viền tối nhẹ phía dưới, bóng mềm 0 8px 24px rgba(0,0,0,.10), lớp tint rất nhẹ. Nút chính .glassProminent màu accent có highlight phía trên, không phải khối cam phẳng.
- Thanh đáy iOS 26: các nút là capsule kính nổi riêng, không nằm trong một tấm nền trắng dài.
- Sheet: góc trên bo 38 theo màn, nền kính, grabber. Nền phía sau tối đi và lùi nhẹ (scale 0.94, bo góc) như sheet thật.
- Dark mode: thẻ #1c1c1e trên nền #000, kính tối có viền sáng mảnh.

5. CHUYỂN ĐỘNG TRONG PROTOTYPE 2a
- Đẩy màn bằng spring (trượt ngang, màn cũ lùi 30% và tối đi).
- Nút khi bấm co 0.96 rồi bật lại. Sheet mở bằng spring, kéo grabber để đổi detent.
- Large title thu nhỏ thành inline title khi cuộn.
- Đổi tab segmented: nền chọn trượt sang bằng spring (matchedGeometryEffect).
- Tôn trọng prefers-reduced-motion.

6. HIỆU NĂNG
Giữ cách hiện tại: frame tĩnh dùng kính giả lập (không backdrop-filter), chỉ prototype 2a có blur thật. Ảnh mẫu nén nhỏ (≤60KB/ảnh), dùng chung 1 ảnh cho các bản xem trước.

7. KIỂM TRA KHI XONG
Đặt cạnh một ảnh chụp app Cài đặt và app Ảnh của iOS 26, rà từng frame xem chỗ nào còn trông giống web. Chụp lại 2b, 2d, 2f và 2q ở light + dark, xem lại rồi mới publish. Ghi ở đầu trang: "v8 · chiều sâu iOS".
