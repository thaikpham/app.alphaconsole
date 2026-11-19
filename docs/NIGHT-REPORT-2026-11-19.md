# Kết quả thử trên máy 19/11/2026 (Oppo CPH2797 + ZV-E10)

- Đã cài APK v21, sau đó bản 0.9.1 (`dist/alpha-color-lab-0.9.1-usbmode-debugsigned.apk`).
- Ghi bộ màu: đạt. Gọi lại MR trên máy không báo file error.
- Xem thử (live view): đạt. App tự kết nối khi bật PC Remote.
- Đã tìm ra lý do máy luôn hiện "PC" khi cắm vào điện thoại. Mục **Điều khiển bằng điện thoại** đang Bật, nên máy vào chế độ PTP (mã `0D97`). Lỗi này xảy ra dù PC Remote đã Tắt và Kết nối USB đã chọn Mass Storage. Cắm vào laptop thì vẫn ra Mass Storage (mã `0D95`).
- App 0.9.1 nhận ra chế độ USB và hướng dẫn từng bước:
  - Màn ghi: tắt Điều khiển bằng điện thoại và PC Remote, rồi rút cáp và cắm lại.
  - Màn Xem thử: bật PC Remote, app tự kết nối, không cần rút cáp.
- Còn lại:
  - Chế độ tối.
  - Màn Hướng dẫn và Nhật ký.
  - Xperia 1 VII.
  - A7C II.
  - Kiểm tra PP trên ảnh test.
  - Giải mã trường `smartphoneConnect` để bộ màu tự tắt Điều khiển bằng điện thoại.
