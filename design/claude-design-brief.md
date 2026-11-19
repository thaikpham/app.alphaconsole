Thiết kế UX/UI app Android (mobile, 412×915, light mode) tên "Alpha Color Lab" — ghi bộ cài đặt màu M1–M4 (Memory Recall) vào máy ảnh Sony ZV-E10 qua cáp USB-C nối thẳng điện thoại ↔ máy ảnh. Offline hoàn toàn, không đăng nhập. Toàn bộ chữ trên UI bằng tiếng Việt.

## Design tokens (bắt buộc)
- Nền #f3f4f6, card #ffffff, chữ #0b0d12, chữ phụ #4a5260, viền #e3e6eb.
- Accent #f05a14 (chữ trên accent dùng #0b0d12). Success #127a3a, warning #a84e00, danger #c8261b.
- Font Noto Sans. Body 17/27, callout 16/24, footnote 13/19, title2 24/32.
- Bo góc: card 24, control 14, badge 8. Nút cao 44, dạng pill. Ease cubic-bezier(0.16,1,0.3,1).
- Luật: chỉ 1 nút accent mỗi màn; không chữ xám mờ; không gradient, glow, emoji. Dùng từ "Sưu tầm" bộ M1–M4, không dùng "lưu".
- Component: Button, Card, Segmented, Stepper, ValueRow, StatusChip.

## Luồng 6 màn
1 Chọn bộ → 2 Chỉnh slot → 3 Cắm máy → 4 Ghi → 5 Nạp trên máy → 6 Xem thử (từ 6 có "Chỉnh lại slot" quay về 2).

1. **Chọn bộ**: chọn máy (ZV-E10 dùng được; A6400, A7C, A7C II hiện nhãn "Đang giải mã", không chọn được). Danh sách bộ M1–M4 chia nhóm: Khuyên dùng / KOL / Của tôi. Mỗi bộ = 4 ô slot có nhãn (vd "M1 · Đời thường").

2. **Chỉnh slot** (màn lõi, phải gọn): header "M1 · Đời thường" + segmented [M1][M2][M3][M4]. Stepper 5 công đoạn: ① Chụp ② Phơi sáng ③ AF ④ Màu & da ⑤ Hiển thị (chấm = đã chỉnh). Danh sách ValueRow, mỗi tham số có 2 trạng thái Đặt / Giữ nguyên:
   - Chụp: chế độ [P][A][S][M].
   - Phơi sáng: khẩu độ ‹ f/2.8 ›, tốc độ, ISO [Auto] ‹100–6400›, bù sáng, đo sáng.
   - AF: MF/AF-S/AF-C, vùng lấy nét, ưu tiên mặt, Pre-AF.
   - Màu & da: WB (chế độ, Kelvin, A-B, G-M), công tắc "Bật Picture Profile" nổi bật, chọn PP1–PP10 + 25 tham số PP (thu gọn được), Soft Skin.
   - Hiển thị: Auto Review, Live View.
   Nút cuối "Tiếp: Autofocus".

3. **Cắm máy**: 3 bước có minh họa: (a) trên máy: Kết nối USB → Mass Storage, (b) cắm cáp USB-C, (c) chọn ổ máy ảnh (chỉ lần đầu). Hiện trạng thái tự nhận: model ZV-E10, hệ PAL/NTSC, firmware. Trạng thái lỗi: thẻ chưa format trong máy → chặn ghi, hướng dẫn format trong máy.

4. **Ghi**: tiến trình 3 bước: Sao lưu 4 file hiện có → Ghi 4 file mới → So byte → kết quả "Đã ghi M1–M4". Trạng thái lỗi: "Đã tự khôi phục bản sao lưu".

5. **Nạp trên máy**: hướng dẫn từng bước: rút cáp → tắt/bật máy → gọi lại MR1–MR4. Cảnh báo rõ "Memory ≠ Recall" (vào nhầm Memory sẽ ghi đè slot). Nút phụ "Khôi phục bản trước".

6. **Xem thử (live view)**: header "Xem thử · ZV-E10" + [M1][M2][M3][M4]. Khung live view 16:9 (chạm để toàn màn hình). Dòng "Máy đang ở: MR1 ✓ khớp slot M1". Thông số đọc từ máy: A · f/2.8 · 1/125 · ISO Auto · AWB · PP1 — ô nào lệch slot tô màu warning. "Ảnh nhanh": 4 ô thumbnail M1–M4 để so cạnh nhau. Nút "Chỉnh lại slot" (phụ) + "Xong" (accent). Hướng dẫn phụ: chuyển Kết nối USB → PC Remote.

## Yêu cầu
- Vẽ cả 6 màn + trạng thái rỗng / lỗi / đang xử lý quan trọng (màn 3, 4).
- Tối ưu thao tác 1 tay, ngón cái; nút chính ở đáy màn.
- Cảm giác công cụ chuyên nghiệp cho người quay/chụp, sạch, tin cậy — không màu mè.
