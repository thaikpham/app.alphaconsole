# Review Claude Design v1 — 2026-11-17

Project: https://claude.ai/design/p/26a757fe-6131-41e4-aa3f-6ec4e4352eaf (file `Alpha Color Lab.dc.html`, 1a prototype + 1b–1n).

## Đạt
- Token đúng (nền, accent #f05a14 chữ #0b0d12, success/warning/danger, Noto Sans, bo 24/14/8, nút pill 44).
- Mỗi màn 1 nút accent ở đáy; không gradient/glow/emoji; "Sưu tầm" dùng đúng.
- Đủ trạng thái: Của tôi rỗng, chờ máy / đã nhận / thẻ chưa format, đang ghi / xong / tự khôi phục, Xem thử khớp / lệch.

## Cần sửa (prompt gửi lại Claude Design)

1. 1n: dòng trạng thái vẫn xanh "MR1 ✓ khớp slot M1" trong khi thẻ báo "1 ô lệch slot M1". Lệch → dòng trạng thái đổi sang warning, ví dụ "MR1 · lệch 1 ô so với slot M1".
2. Màn 6 thiếu trạng thái "chưa có live view" (máy đang Mass Storage / chưa PC Remote). Hướng dẫn chuyển PC Remote đang bị chôn ở cuối, bị footer che. Thêm frame trạng thái này, hướng dẫn nằm thay vào khung live view.
3. 1g: đã nhận máy thì thu gọn "Cách cắm" thành 1 dòng. Thay bằng tóm tắt sẽ ghi: tên bộ + 4 slot, kèm dòng "Tự sao lưu 4 file hiện có trước khi ghi". Dữ liệu mẫu đổi sang hệ PAL, firmware Ver. 2.03.
4. 1h: lỗi thẻ chưa format thì ẩn "Cách cắm", chỉ giữ thẻ lỗi + nút "Kiểm tra lại".
5. 1e: bỏ cuộn lồng trong thẻ PP. 25 tham số mở rộng ngay trong trang, hoặc mở bottom sheet. Mỗi dòng chạm vào thì hiện stepper ‹ › để chỉnh, kèm Đặt / Giữ nguyên như các công đoạn khác.
6. 1l: chuyển cảnh báo "Memory ≠ Recall" lên ngay trên bước 3 "Gọi lại". Nút "Khôi phục bản trước" đang xuống 2 dòng → rút thành "Khôi phục", hoặc dùng nút chữ (text button) phía trên footer.
7. 1b: với bộ Khuyên dùng/KOL, nút accent là "Ghi bộ này" (đi thẳng tới Cắm máy). "Chỉnh slot" thành nút phụ. Sửa khoảng trắng kép trong "Chỉnh bộ  Alpha Cơ bản".

## Cần đối chiếu máy thật (không phải lỗi thiết kế)
- Đường dẫn menu ZV-E10 (Kết nối USB, Format, PC Remote) và thao tác gọi lại (MODE → MR).
- Tên slot trên máy: ZV-E10 có MR 1–3 (thân máy) + M1–M4 (thẻ). App đang ghi "MR1". Cần xác nhận máy hiện nhãn gì khi gọi bộ trên thẻ, rồi thống nhất nhãn trong app.
- Giá trị mặc định 25 tham số PP.
