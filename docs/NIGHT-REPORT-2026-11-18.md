# Báo cáo night build 18/11/2026

## Đã xong

- **P4.** Ký bản phát hành qua plugin. Có màn Hướng dẫn và màn Nhật ký lỗi, kèm bộ ghi crash native. APK: `dist/alpha-color-lab-0.9.0-p4-debugsigned.apk`.
- **P5, nhiều máy.**
  - Registry nằm ở `src/core/models.ts`. App tự nhận máy qua thư mục `PRIVATE/SONY/SETTING/*`.
  - ZV-E10: ghi và đọc.
  - A7C II: đọc được. Ghi đang khoá (`EXPERIMENTAL_WRITE.a7c2 = false`).
  - A6400: đọc thử nghiệm.
  - A7C, A6700, A7 IV, ZV-E1: hiện "Sắp có".
  - Ma trận hỗ trợ ở BLUEPRINT.md. APK: `dist/alpha-color-lab-0.9.0-p5-debugsigned.apk`.
- **Thiết kế v21.** Spec ở `docs/design-v21/SPEC.md`. Các mặc định tự chọn khi anh vắng nằm ở §14, mục D1–D10.
  - A. Theme sáng/tối theo hệ thống (`src/ui/theme.ts`, không sửa `tokens.ts`). Nút cao 48, chữ tối thiểu 15. Thêm BottomSheet, Snackbar, SlotChips, ProgressRing và 4 ảnh cảnh.
  - B. Onboarding gồm chọn máy, giới thiệu M1–M4 và quyền truy cập thẻ. Trang chủ thành "Chọn bộ màu", có tab Khuyên dùng/Của tôi, sheet chọn máy và sheet "Bộ mới". Logic thẻ chuyển vào `useCardDriver`, gắn trong `_layout`.
  - C. Màn "Chỉnh slot" còn 4 bước. Chấm cam đánh dấu slot đã sửa. Có sheet chọn giá trị với "Áp cho cả 4 slot", nút "Đặt lại M<n> về bản gốc" và "Hoàn tác". PP nâng cao mặc định thu gọn.
  - D. Luồng Cắm máy, Ghi (vòng "k/4", nhắc "Đừng rút cáp"), Gọi lại trên máy, rồi Xem thử với một dòng tóm tắt khớp/lệch.
  - APK: `dist/alpha-color-lab-0.9.0-v21-debugsigned.apk`.
- **Kiểm tra.**
  - 300/300 test đạt; typecheck, check-core và gradle assembleRelease đều qua.
  - Lint 0 lỗi, còn 1 cảnh báo ở `src/core/web/lib/zve10/presets.ts:19`. File này chép nguyên từ web nên không sửa ở app.
- **Không đổi:** đường ghi, header bundled 0x24=02, backup và khôi phục, live view.

## Tạm bỏ vì cần anh

- Đăng nhập Google: cần cấu hình OAuth. Hiện ẩn, chỉ có luồng dùng không tài khoản.
- Tab KOL và Sưu tầm: chưa có dữ liệu offline, đang ẩn.
- "Báo khi hỗ trợ": cần backend email, đang ẩn.
- Keystore phát hành: anh chạy lệnh keytool trong `docs/SIGNING.md`. Các APK trên đều ký debug.
- Merge nhánh web `app/mr-transfer-fixes`: chưa merge, chưa push.

## Cần anh quyết

- Bù sáng (EV) và WB Nắng/Bóng râm có trong thiết kế nhưng codec chưa có trường, nên đang ẩn (D2).
- Bảng màu tối: em dùng bảng tối của thiết kế v21, không dùng bảng tối của web (D4).
- Chấm cam "đã sửa" cũng dùng màu accent, lệch nhẹ khỏi quy tắc một accent mỗi màn.
- Thẻ "Ảnh nhanh" ở Xem thử giờ luôn hiện, nút chụp mờ khi chưa kết nối.
- Chưa làm: toast "Bộ … đã nằm trên máy", lớp MR1 trên live view, và nhãn tiếng Việt cho các dòng đọc-only của A7C II/A6400.
- Danh sách đầy đủ các điểm còn mở: SPEC §13.

## Checklist trên máy (sáng mai)

1. Cài APK v21 (`adb install -r`). Kiểm tra onboarding lần đầu: chọn máy, giới thiệu, cấp quyền.
2. Cắm ZV-E10 ở Mass Storage, rồi lần lượt:
   - thẻ đọc được trên màn Cắm máy
   - chỉnh slot: chấm cam, Áp cho cả 4, Hoàn tác
   - ghi: vòng 4/4
   - gọi lại M1–M4 trên máy, không bị file error
3. Chuyển sang PC Remote và mở Xem thử: live view lên trong cửa sổ 8 s, dòng tóm tắt khớp, chụp nhanh.
4. Kiểm tra các màn còn lại:
   - chế độ tối của hệ thống
   - màn Hướng dẫn và Nhật ký, crash log
   - Xperia 1 VII
5. Việc cần máy ảnh:
   - xác nhận bộ ghi A7C II trên máy thật trước khi mở cờ
   - kiểm tra chi tiết PP trên ảnh test
