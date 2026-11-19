Bản v5: làm app gọn, người mới nhìn là hiểu, không cần đọc giải thích. Áp dụng cho cả trang Android lẫn iOS, cả prototype 1a, 2a và mọi frame. Giữ token màu, Liquid Glass (chỉ iOS) và luồng 6 màn.

1. BỎ CHỮ GIẢI THÍCH NHỎ
Bỏ mọi dòng phụ, footnote, section footer, hint dưới row. Ví dụ:
- "Ghi bộ màu M1–M4 vào máy qua USB-C · hoàn toàn offline"
- "Chạm một dòng để đặt giá trị…"
- "Không ghi tham số này — máy giữ giá trị đang có"
- "Slot dùng PP1 · gamma Movie"
- "Khoảng −15 đến +15"
- "Dùng cáp có truyền dữ liệu, không qua hub"
- "Ứng dụng tự nhận máy ngay khi cáp được cắm"
- "Chạm hoặc cuộn bánh xe để chọn"
- dòng "Dòng máy dùng được / đang giải mã"
Mỗi màn chỉ còn: 1 tiêu đề, nội dung chính, 1 nút chính.

2. ĐỂ HÌNH VÀ TRẠNG THÁI TỰ NÓI THAY CHỮ
- Tiêu đề màn là một câu ra lệnh ngắn nói người dùng cần làm gì: "Chọn bộ màu", "Cắm máy ảnh", "Đang ghi…", "Gọi lại trên máy", "Xem thử".
- Màn Cắm máy: thay các đoạn chữ bằng 3 hình minh hoạ lớn, đánh số 1-2-3. (1) Màn hình menu máy ảnh, dòng "Kết nối USB → Mass Storage" được tô sáng. (2) Hình cáp USB-C nối điện thoại với máy. (3) Hình chọn thẻ. Mỗi bước chỉ kèm 1 nhãn ngắn từ 2 đến 4 chữ. Tên menu Sony giữ nguyên đúng như trên máy.
- Trạng thái dùng icon lớn + màu: đang chờ (hình máy ảnh nhấp nháy nhẹ), đã nhận (dấu tick xanh + "ZV-E10"), lỗi (dấu chấm than đỏ + 1 câu). Không dùng bảng thông số kỹ thuật (Hệ, Firmware…) ở mặc định. Gom các thông số này vào 1 nút "Chi tiết" nhỏ.
- Dòng máy chưa hỗ trợ (A6400, A7C, A7C II) hiện mờ, kèm icon khoá và nhãn "Sắp có". Không cần câu giải thích.
- Đặt / Giữ nguyên: bỏ segmented chữ. Giá trị đang "Giữ nguyên" hiện chữ "Như máy" màu phụ. Chạm vào row để đặt giá trị. Trong sheet có nút "Như máy" để trả về giữ nguyên.
- 25 tham số PP: mặc định ẩn sau 1 dòng "Nâng cao" thu gọn. Người mới chỉ thấy: Bật Picture Profile + chọn PP.
- Màn Ghi: 1 vòng tiến trình lớn ở giữa, có số "2/4". Bỏ danh sách 3 bước sao lưu / ghi / so byte. Màn xong hiện dấu tick lớn + "Đã ghi M1–M4". Màn lỗi hiện "Chưa ghi được — máy vẫn giữ bộ cũ" + nút "Thử lại".
- Màn Nạp: 3 thẻ hình (rút cáp, tắt/bật máy, bấm MODE → chọn MR). Mỗi thẻ có 1 nhãn ngắn và checkbox lớn. Cảnh báo Memory ≠ Recall rút thành 1 dòng có icon: "Chọn Gọi lại, đừng chọn Lưu". Bỏ đoạn giải thích dài.
- Xem thử: thông số đọc từ máy hiện dạng chip. Ô lệch có viền cam + icon. Bỏ chữ "Đọc từ máy". Trạng thái khớp chỉ cần 1 icon tick cạnh tên slot.

3. GIỮ LẠI (VÌ LIÊN QUAN AN TOÀN DỮ LIỆU)
- Cảnh báo format xoá ảnh: 1 dòng ngắn có icon.
- "Đừng rút cáp" khi đang ghi: 1 nhãn ngắn trên vòng tiến trình.

4. CỠ CHỮ VÀ VÙNG CHẠM CHO NGƯỜI MỚI
Không có chữ nào nhỏ hơn 15px trên UI. Vùng chạm tối thiểu 44×44 (iOS) / 48×48 (Android). Nút chính đủ lớn, ở đáy, nhãn là động từ.

5. HIỆU NĂNG CANVAS
Bản v4 làm treo trình duyệt khi cuộn canvas, có thể do quá nhiều lớp backdrop-filter. Cách sửa: chỉ bật blur cho frame đang nằm trong viewport (IntersectionObserver), hoặc ở frame tĩnh thì dùng nền glass giả lập (màu bán trong suốt + viền sáng) và chỉ dùng blur thật trong prototype 2a.

6. KIỂM TRA LẠI KHI XONG
Rà từng frame. Nếu còn câu nào chỉ để giải thích cách dùng thì bỏ, hoặc thay bằng hình / icon / trạng thái.
