Bản v9: chỉ trang iOS (prototype 2a và mọi frame). Làm trên nền v8. Mẫu tham chiếu: Apple sample "Landmarks: Building an app with Liquid Glass", phần "Refining the system provided Liquid Glass effect in toolbars".

1. NỀN ĐEN LÀM MẶC ĐỊNH
- Toàn trang iOS chuyển sang dark làm mặc định: nền #000000, thẻ #1c1c1e, thẻ nổi/sheet #2c2c2e, chữ #f5f5f7, chữ phụ #a1a1a6, separator #38383a. Bỏ các frame light, giữ 2 frame light mẫu (2b, 2d) để đối chiếu.
- Ảnh (xem trước bộ màu, live view, ảnh nhanh) là thứ sáng nhất màn hình. Nội dung nổi lên nhờ ảnh và kính, không nhờ màu nền.

2. KÍNH CHỮ TRẮNG, TỰ ĐỔI SẮC ĐỘ ĐỂ DỄ ĐỌC
Mọi thành phần Liquid Glass (thanh đáy, nút Back, nút "Xong", segmented M1–M4 và các tab, nhãn chip trên ảnh, sheet) dùng chữ và icon trắng.
- Kính tự đổi sắc độ theo thứ nằm bên dưới, giống hệ thống iOS 26: dưới nền đen hoặc thẻ tối thì kính trong hơn (tint trắng ~8–12%, viền sáng mảnh). Khi nội dung sáng (ảnh, vùng trời, thẻ sáng) trượt vào dưới kính, kính tối đi (thêm lớp đen 35–55%) để chữ trắng luôn đạt tương phản ≥4.5:1.
- Prototype 2a: làm thật. Mỗi khung hình đo độ sáng vùng nằm dưới từng khối kính (lấy từ ảnh đã biết vị trí hoặc dùng canvas lấy mẫu vài điểm), rồi nội suy độ tối của kính trong khoảng 180ms. Không đổi màu chữ, chỉ đổi kính.
- Frame tĩnh: thêm 1 frame cặp "kính trên nền tối" và "kính trên ảnh sáng" ở cùng màn (ví dụ Xem thử khi live view sáng), để thấy kính tối đi.
- Chữ trên ảnh không có kính (tên bộ, nhãn M1–M4 nằm trên ảnh): thêm lớp đổ tối từ đáy ảnh (đen 80% ở đáy → trong suốt ở giữa), như ReadabilityRoundedRectangle trong mẫu Apple.

3. NHÓM NÚT TRÊN TOOLBAR THEO MẪU APPLE
- Gom nút theo nhóm, mỗi nhóm một capsule kính. Giữa các nhóm có khoảng trống cố định (ToolbarSpacer(.fixed)), đẩy về một phía bằng ToolbarSpacer(.flexible).
- Ví dụ màn Xem thử: nhóm trái [Back]; nhóm phải [Chụp ảnh nhanh] · [Toàn màn hình]. Màn Chỉnh slot: [Back] … [Hoàn tác, Xong].
- Bỏ tiêu đề khỏi toolbar ở màn có ảnh lớn ở trên (toolbar(removing: .title)); ảnh tràn lên dưới Dynamic Island (ignoresSafeArea(edges: .top)), dùng backgroundExtensionEffect để mép ảnh kéo dài mờ dưới thanh.
- Các khối kính gần nhau nằm trong GlassEffectContainer, có glassEffectID để khi mở/đóng thì kính nhập/tách mượt (morph).

4. NÚT CHÍNH
- Nút chính .glassProminent: nền accent #c2410c, chữ trắng (tương phản 5.2:1). Không dùng #ff7a2e làm nền nút có chữ trắng vì chỉ đạt khoảng 2.6:1. #ff8a3d chỉ dùng cho chữ/link màu nhấn trên nền tối.
- Nút phụ .glass: kính, chữ trắng.

5. GIỮ NGUYÊN
Luồng 6 màn, nội dung, luật không chữ giải thích, chữ ≥15px, vùng chạm ≥44, hiệu năng (frame tĩnh dùng kính giả lập, chỉ 2a có blur thật và đo độ sáng thật). Trang Android không đổi.

6. KIỂM TRA KHI XONG
Trong 2a, cuộn để ảnh sáng đi qua dưới thanh trên và thanh đáy, xác nhận chữ trắng vẫn đọc rõ. Đo tương phản chữ trắng trên kính ở trường hợp xấu nhất (nền trắng thuần dưới kính) và ghi số đo vào ghi chú frame. Ghi đầu trang: "v9 · dark + kính chữ trắng".
