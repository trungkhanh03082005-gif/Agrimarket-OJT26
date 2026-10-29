# Cẩm nang Kỹ thuật Hệ thống AgriMarket (Dành cho AI Agents)

Chào mừng bạn đến với tài liệu hướng dẫn kỹ thuật của dự án **AgriMarket**. Tài liệu này được thiết kế chi tiết nhằm giúp các AI coding assistants dễ dàng nắm bắt cấu trúc thư mục, kiến trúc công nghệ, mô hình dữ liệu và các luồng xử lý nghiệp vụ cốt lõi của hệ thống.

---

## 1. Tổng quan Dự án

**AgriMarket** là một nền tảng thương mại điện tử kết nối trực tiếp **Nông dân/Nhà vườn (Farmer)** với **Khách hàng (Customer)**. Hệ thống loại bỏ khâu trung gian để tối ưu giá thành cho người mua và tăng thu nhập cho người sản xuất, đồng thời tích hợp các giải pháp công nghệ hiện đại như trí tuệ nhân tạo (AI) và bản đồ số địa lý để kiểm soát chất lượng nông sản tươi sống.

Hệ thống hỗ trợ 3 vai trò chính:
1. **Khách hàng (Customer)**: Tìm kiếm, lọc sản phẩm theo danh mục/độ tươi, đặt hàng, thanh toán trực tuyến, theo dõi đơn hàng, đánh giá sản phẩm/nhà vườn, gửi yêu cầu hỗ trợ hoặc báo cáo vi phạm.
2. **Nông dân/Nhà vườn (Farmer)**: Đăng ký thông tin nhà vườn kèm chứng nhận chất lượng (VietGAP, GlobalGAP, Organic); đăng bán sản phẩm; sử dụng AI viết mô tả/gợi ý giá; quản lý số lượng tồn kho; xử lý/chuẩn bị đơn hàng; chat trực tiếp với người mua. (Lưu ý: Người bán hàng cũng có thể là người mua nên họ có đầy đủ các usecase của người mua).
3. **Quản trị viên (Admin)**: Duyệt hồ sơ nông dân và sản phẩm; khóa/mở tài khoản; kiểm duyệt nội dung do AI tạo ra; cấu hình voucher/mã giảm giá; quản lý khiếu nại/vi phạm; phát thông báo hệ thống; theo dõi doanh thu và lịch sử hệ thống (audit logs).

---

## 2. Kiến trúc & Công nghệ (Tech Stack)

### Backend
- **Core Framework**: Java 21, Spring Boot 3.3.0
- **Security**: Spring Security & JWT (Json Web Token) bảo mật stateless API. Hashing mật khẩu bằng [BCryptPasswordEncoder](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/security/SecurityConfig.java#L30).
- **Data Access**: Spring Data JPA & Hibernate.
- **Database**: PostgreSQL (Được lưu trữ trực tuyến và quản lý qua **Supabase Cloud**).
- **Email**: Spring Mail (SMTP) hỗ trợ gửi mã OTP và thư thông báo.
- **API Documentation**: Springdoc OpenAPI / Swagger (`/swagger-ui/index.html`).
- **Tiện ích**: Lombok giảm thiểu code mẫu.

### Frontend
- **Framework**: React JS (Vite)
- **Routing**: React Router Dom v6
- **HTTP Client**: Axios (với interceptors tự động đính kèm JWT Token và xử lý lỗi đăng xuất tự động khi hết hạn - mã lỗi `401`).
- **Maps (Bản đồ)**: Leaflet & React Leaflet (hiển thị vị trí nông trại và tọa độ giao hàng).
- **Styling**: Vanilla CSS.

### Các tích hợp bên thứ ba (Third-party Integrations)
- **Supabase Cloud (PostgreSQL & Storage)**: Lưu trữ cơ sở dữ liệu PostgreSQL và cung cấp Cloud Object Storage để tải lên/xóa các tệp tin hình ảnh/tài liệu (ảnh đại diện, chứng nhận VietGAP/GlobalGAP, ảnh nông sản, ảnh bằng chứng giao hàng POD).
- **Google Gemini API**: Model `gemini-3.1-flash-lite` phục vụ việc viết mô tả tự động và phân tích định giá nông sản.
- **VNPay Sandbox**: Cổng thanh toán trực tuyến của Việt Nam.
- **Nominatim OpenStreetMap**: Geocoding địa chỉ (chuyển đổi chuỗi địa chỉ thành tọa độ Vĩ độ/Kinh độ).
- **OSRM (Open Source Routing Machine)**: Tính toán khoảng cách lái xe thực tế giữa nông trại và địa chỉ giao hàng. // DELETE
- **Agora RTC SDK**: Phục vụ việc truyền phát (stream) và nhận (watch) luồng livestream âm thanh/hình ảnh thời gian thực chất lượng cao giữa Nông dân và Khách hàng.
- **Giao Hàng Nhanh (GHN) Sandbox API**: Tích hợp tính toán phí giao hàng tự động, đồng bộ tạo vận đơn và mô phỏng/giả lập các trạng thái giao nhận hàng trong môi trường thử nghiệm.

---

## 3. Cấu trúc Cơ sở dữ liệu & Thực thể (Database & Models)

### Mô hình Kế thừa Tài khoản (JPA Joined Inheritance)
Hệ thống sử dụng chiến lược **JOINED Inheritance** của JPA để quản lý các nhóm người dùng khác nhau có chung thuộc tính cơ bản. 

- Lớp cơ sở: [User.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/User.java) (Ánh xạ bảng `users`). Phân biệt bằng cột `user_type` (`CUSTOMER`, `FARMER`, `ADMIN`).
- Lớp con cấp 1:
  - [Admin.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Admin.java) (Bảng `admin`, discriminator: `ADMIN`)
  - [Customer.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Customer.java) (Bảng `customer`, discriminator: `CUSTOMER`)
- Lớp con cấp 2:
  - [Farmer.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Farmer.java) (Bảng `farmer`, kế thừa từ `Customer`, discriminator: `FARMER`).

> [!NOTE]
> Cách thiết kế này giúp `Farmer` kế thừa toàn bộ thuộc tính mua hàng của `Customer` (địa chỉ, giỏ hàng, wishlist) đồng thời bổ sung các trường bán hàng (tên nông trại, tọa độ GPS, các chứng chỉ chất lượng hữu cơ như VietGAP, GlobalGAP).

### Các bảng dữ liệu chính

| Tên lớp thực thể | Bảng SQL tương ứng | Mô tả vai trò & mối quan hệ |
| :--- | :--- | :--- |
| [Category](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Category.java) | `category` | Danh mục sản phẩm đa cấp (hỗ trợ liên kết cha-con thông qua `parent_id`). |
| [Product](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Product.java) | `product` | Sản phẩm nông sản, liên kết với `Farmer` và `Category`. Lưu thông tin độ tươi sống (`perishability`) và khoảng cách giới hạn giao hàng (`limit_distance`). |
| [Cart](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Cart.java) / [CartItem](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/CartItem.java) | `cart` / `cart_item` | Giỏ hàng của từng khách hàng. |
| [OrderGroup](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/OrderGroup.java) | `order_group` | Đại diện cho cả phiên thanh toán của giỏ hàng. Lưu thông tin tổng tiền, địa chỉ giao hàng và trạng thái VNPay. |
| [Order](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Order.java) | `orders` | Đơn hàng con được tách ra cho từng `Farmer` từ `OrderGroup`. Các thông tin giao hàng từ đơn vị Giao Hàng Nhanh (GHN) được cập nhật trực tiếp tại đây. |
| [OrderItem](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/OrderItem.java) | `order_item` | Chi tiết sản phẩm trong từng đơn hàng con. |
| [SupportRequest](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/SupportRequest.java) | `support_request` | Ticket yêu cầu hỗ trợ/khiếu nại từ người dùng gửi lên admin. |
| [SupportMessage](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/SupportMessage.java) | `support_message` | Các tin nhắn trao đổi trong luồng giải quyết ticket hỗ trợ giữa Admin và User. |
| [AdminNotification](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/AdminNotification.java) | `admin_notification` | Các thông báo hệ thống được Admin lên lịch phát sóng. |
| [Notification](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Notification.java) | `notification` | Hộp thư thông báo cá nhân hóa (đã đọc/chưa đọc) hiển thị ở chuông thông báo người dùng. |
| [Livestream](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Livestream.java) / [LivestreamComment](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/LivestreamComment.java) | `livestream` / `livestream_comment` | Quản lý các buổi phát video trực tiếp và lượt bình luận trực tiếp của khách hàng. |
| [ProductReview](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/ProductReview.java) | `product_review` | Đánh giá và nhận xét của khách hàng đối với từng sản phẩm. |
| [FollowedFarmer](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/FollowedFarmer.java) | `followed_farmer` | Theo dõi nhà vườn yêu thích của khách hàng để nhận tin nhắn/phiên live nhanh nhất. |
| [WishlistItem](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/WishlistItem.java) | `wishlist_item` | Danh sách các sản phẩm ưa thích được người dùng lưu lại. |
| [CustomerAddress](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/CustomerAddress.java) | `customer_address` | Sổ địa chỉ giao hàng của khách hàng, lưu receiver_name, phone, địa chỉ và tọa độ GPS (vĩ độ, kinh độ). |
| [ProductImage](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/ProductImage.java) | `product_image` | Các hình ảnh phụ của nông sản phục vụ hiển thị dạng slide ảnh trên giao diện chi tiết sản phẩm. |
| [Conversation](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Conversation.java) / [ChatMessage](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/ChatMessage.java) | `conversation` / `messages` | Quản lý hội thoại chat trực tiếp giữa khách hàng và nhà vườn, hỗ trợ gửi tin nhắn đa dạng dạng văn bản, hình ảnh, vị trí, danh bạ... và chức năng chặn hội thoại. |
| [Report](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Report.java) | `report` | Quản lý các báo cáo vi phạm của người dùng đối với các thực thể khác (product, farmer, customer), kèm trạng thái xử lý và ghi chú của Admin. |
| [OtpVerification](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/OtpVerification.java) | `otp_verification` | Lưu trữ và kiểm tra tính hợp lệ của mã OTP (được gửi qua Email) để xác thực đăng ký hoặc đặt lại mật khẩu. |

### Cơ chế Tự động Đồng bộ Schema & Seed Dữ liệu
Khi khởi động ứng dụng backend, lớp [DataInitializer](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/config/DataInitializer.java) sẽ thực thi:
1. Tạo tài khoản Admin mặc định `admin@agrimarket.com` (mật khẩu: `admin123`) nếu chưa tồn tại, hoặc reset lại mật khẩu về mặc định để tránh mất quyền truy cập.
2. Thực thi các truy vấn SQL thô (`JdbcTemplate`) để tự động nâng cấp cấu trúc bảng (như thêm cột vĩ độ `latitude`, kinh độ `longitude`, trạng thái `perishability`, giới hạn khoảng cách `limit_distance` mà không làm mất dữ liệu hiện có).
3. Loại bỏ các cột dư thừa từ các phiên bản phát triển cũ để tránh mâu thuẫn dữ liệu.

---

## 4. Các Luồng Nghiệp vụ & Logic Cốt lõi

### 4.1. Xác thực & Bảo mật (Authentication Flow)
1. **Đăng nhập truyền thống**: Người dùng gửi Email/Mật khẩu về `/auth/login`. Hệ thống xác thực bằng Spring Security, sinh JWT token lưu trữ thông tin ID, Email, Role.
2. **Lưu trữ**: Token được lưu trong `localStorage` với key `farmconnect_token`. Thông tin user lưu với key `farmconnect_user`.
3. **Đăng nhập Google**: Tích hợp OAuth2 thông qua API Google Identity Services trên frontend, gửi ID Token về backend để xác thực và tạo phiên.
4. **Auto-logout khi hết hạn**: File [apiClient.js](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/agrimarket-frontend/src/services/apiClient.js) chứa bộ lọc phản hồi (Response Interceptor). Khi nhận mã lỗi HTTP `401 Unauthorized` từ API, nó tự động xóa thông tin đăng nhập trong `localStorage` và chuyển hướng trình duyệt về trang `/login`.

---

### 4.2. Xử lý Đơn hàng Tách biệt (Split-Order Logic)
Khi Khách hàng tiến hành đặt một giỏ hàng chứa sản phẩm từ nhiều nhà vườn khác nhau:
1. Frontend gửi yêu cầu thanh toán tổng thể tới [OrderService](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/service/OrderService.java).
2. Hệ thống lưu lại một thực thể [OrderGroup](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/OrderGroup.java) để làm đầu mối thanh toán duy nhất (liên kết với mã giao dịch VNPay).
3. Đồng thời, backend tự động phân tách giỏ hàng theo từng nhà vườn (`Farmer`) thành các đơn hàng con riêng biệt ([Order](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Order.java)).
4. **Lợi ích**: Mỗi nông dân chỉ nhìn thấy và xử lý (chấp nhận/từ chối/chuẩn bị) phần đơn hàng liên quan đến sản phẩm của họ. Trạng thái thanh toán (đã thanh toán hoặc hoàn tiền) của `OrderGroup` sẽ đồng bộ xuống các đơn hàng con.

---

### 4.3. Giới hạn Khoảng cách Giao hàng (Perishability Distance Checks)
Nông sản tươi sống có thời gian bảo quản hạn chế. Để ngăn chặn việc giao hàng quá xa gây hư hỏng:
1. **Phân loại Độ bảo quản (`perishability`)**: Sản phẩm có thuộc tính này với 4 giá trị mặc định:
   - *Rất dễ hư (very_perishable)*: Giới hạn giao hàng mặc định là **15.0 km**.
   - *Dễ hư (perishable)*: Giới hạn giao hàng mặc định là **40.0 km**.
   - *Trung bình (medium)*: Giới hạn giao hàng mặc định là **85.0 km**.
   - *Khô (dry)*: Không giới hạn giao hàng (**999999.0 km**).
2. **Cách tính khoảng cách thực tế**: Trong [DistanceService](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/service/DistanceService.java#L22):
   - Trước tiên, chuyển đổi địa chỉ bằng API **Nominatim OpenStreetMap** thành tọa độ.
   - Gọi API **OSRM** để lấy khoảng cách đường đi thực tế.
   - Nếu lỗi kết nối mạng hoặc không định vị được, hệ thống sẽ tự tính khoảng cách đường chim bay **Haversine** hoặc tra cứu theo tỉnh thành (cùng tỉnh mặc định 10km, khác tỉnh mặc định 120km).
3. **Logic kiểm tra**:
   ```java
   double maxProductDist = product.getLimitDistance() != null ? product.getLimitDistance() : distanceService.getMaxAllowedDistance(product.getPerishability());
   double maxFarmerDist = product.getFarmer().getMaxDeliveryDistance() != null ? product.getFarmer().getMaxDeliveryDistance() : 1000.0;
   double maxAllowed = Math.min(maxProductDist, maxFarmerDist);
   ```
   Nếu khoảng cách tính toán lớn hơn `maxAllowed`, hệ thống sẽ ném lỗi `RuntimeException` chặn việc đặt hàng hoặc thêm vào giỏ hàng và yêu cầu đổi địa chỉ.

---

### 4.4. Tích hợp Google Gemini AI
Luồng tích hợp nằm tại [AiService](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/service/AiService.java):
1. **Tạo mô tả nông sản (`/api/ai/generate-description`)**: Gửi tên sản phẩm, danh mục, thông tin trang trại và chứng nhận nông nghiệp hữu cơ (VietGAP, v.v.). Gemini sinh ra một bài viết Markdown sống động, tối ưu từ khóa SEO và chèn biểu tượng cảm xúc gần gũi với thiên nhiên (không chứa hashtag).
2. **Gợi ý giá bán (`/api/ai/suggest-price`)**: Gemini nhận thông tin đầu vào và trả về chuỗi JSON thô chứa:
   - `recommendedPrice` (Giá đề xuất)
   - `minPrice` (Giá tối thiểu)
   - `maxPrice` (Giá tối đa)
   - `explanation` (Giải thích chi tiết dựa trên địa lý, độ tươi ngon và chứng nhận của sản phẩm).

---

### 4.5. Bộ lập lịch Thông báo Broadcast (Notification Scheduler)
1. Admin tạo một tin nhắn truyền thông trong bảng `admin_notification` và đặt trạng thái là `scheduled` kèm thời gian gửi mong muốn.
2. [NotificationScheduler](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/scheduler/NotificationScheduler.java) chạy ngầm mỗi **30 giây**:
   - Quét các thông báo đến hạn gửi.
   - Chuyển đổi thông báo hệ thống thành các thông báo cá nhân lưu vào bảng `notification` cho từng tài khoản thuộc nhóm mục tiêu (`all`, `customer`, `farmer`, `partner`, hoặc gửi đích danh `single`).
   - Nếu cấu hình có gửi qua Email, bộ scheduler sẽ gọi [EmailService](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/service/EmailService.java) gửi email bất đồng bộ nhằm tối ưu tài nguyên của máy chủ.

---

### 4.6. Vận chuyển & Giao hàng (Shipping Flow via Giao Hàng Nhanh)
1. Sau khi Nông dân chuẩn bị hàng xong và chọn giao hàng, hệ thống gọi tới **Giao Hàng Nhanh (GHN) Sandbox API** thông qua [GhnService.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/service/GhnService.java) để tạo đơn giao hàng thực tế.
2. GHN API trả về mã vận đơn (`trackingNumber`) và thông tin tài xế giao hàng. Các thông tin này cùng với trạng thái vận chuyển được lưu vào thực thể [Order.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/model/Order.java).
3. **Chế độ Giả lập (Simulation Mode)**: Khi chế độ giả lập được kích hoạt (cấu hình `ghn.simulation.enabled=true` trong application.properties), tiến trình ngầm [GhnSimulationScheduler.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/scheduler/GhnSimulationScheduler.java) sẽ tự động chạy mỗi **20 giây**:
   - Cập nhật chi tiết trạng thái từ `assigned` (Đã gán tài xế) -> `picked_up` (Đã lấy hàng) -> `in_transit` (Đang vận chuyển) -> `delivered` (Giao hàng thành công).
   - Khi giao thành công, đơn hàng tự động cập nhật trạng thái thanh toán thành `paid` và lưu đường dẫn ảnh POD (Proof of Delivery) giả lập.

---

### 4.7. Tính năng Đặt trước (Pre-order Usecase)
Để hỗ trợ việc bao tiêu nông sản chuẩn bị thu hoạch, AgriMarket tích hợp chức năng đặt trước:
1. **Lọc nông sản đặt trước**: Trên giao diện `Đặt trước` (Preorder), hệ thống tự động lọc các nông sản công khai có thuộc tính đặt trước (`isPreorder == true`).
2. **Luồng thanh toán đặt trước & Đặt cọc (Deposit)**:
   - Thay vì trả 100% số tiền, hệ thống hỗ trợ tính toán đặt cọc **20%** giá trị đơn hàng làm tin (Deposit cọc). 80% còn lại sẽ thanh toán khi giao hàng thành công.
   - Hiện tại ở bản demo, luồng đặt trước được lưu trữ tại bộ nhớ cục bộ trình duyệt (`localStorage` dưới khóa `agrimarket_preorders`) để giả lập quá trình thanh toán cọc thành công, chuẩn bị cho việc ánh xạ lên thực thể `preorder` và `preorder_item` trong cơ sở dữ liệu.
3. **Cập nhật ngày dự kiến giao**: Ngày giao hàng dự kiến được tự động tính toán dựa trên ngày thu hoạch nông sản (`harvestDate` + 2 ngày). Người dùng có thể tùy chỉnh ngày nhận mong muốn và thêm ghi chú giao hàng đặc biệt.

---

### 4.8. Tích hợp Agora RTC cho Livestream (Livestream Flow)
Nhà vườn có thể tương tác trực tiếp với khách hàng để bán hàng thời gian thực:
1. **Cấp phát kênh & Token bảo mật**: Khi Nông dân tạo livestream tại `/api/livestreams/create`, hệ thống sẽ khởi tạo một kênh phát sóng độc nhất trên nền tảng **Agora** và gọi `RtcTokenBuilder2` để sinh Agora RTC Token bảo mật bằng API Key (`agora.app-id` và `agora.app-certificate`).
2. **Xem & Tương tác thời gian thực**:
   - Nông dân phát video và âm thanh từ camera thông qua thư viện `agora-rtc-sdk-ng` tích hợp ở frontend.
   - Khách hàng xem luồng trực tiếp, gửi lượt thả tim (lưu số lượng tại `heartsCount`) và viết bình luận (`livestream_comment`).
3. **Ghim nông sản bán trong live**: Hệ thống cho phép nông dân ghim danh sách sản phẩm liên quan đến phiên live (được liên kết qua bảng trung gian `livestream_product`). Khách hàng có thể nhấn nút mua nhanh sản phẩm ngay trên màn hình xem trực tiếp.

---

## 5. Sơ đồ Cấu trúc Thư mục Hệ thống

### 📂 Backend (Spring Boot)
```text
AgriMarket/
├── pom.xml                                   # Quản lý thư viện Maven (Java 21, Spring Boot 3.3.0)
└── src/main/
    ├── java/org/example/agrimarket/
    │   ├── MainApplication.java              # Lớp khởi chạy ứng dụng Spring Boot
    │   ├── config/                           # Cấu hình CORS, bất đồng bộ, VNPay và khởi tạo/migrate DB
    │   │   ├── DataInitializer.java          # Tự động đồng bộ schema và seed dữ liệu Admin
    │   │   └── WebConfig.java                # Cấu hình phục vụ file tĩnh trong thư mục uploads/
    │   ├── controller/                       # Lớp định nghĩa API (REST Controllers)
    │   │   ├── AiController.java             # Endpoint gọi Gemini AI để tạo mô tả và gợi ý giá
    │   │   ├── PaymentController.java        # Endpoint tạo link thanh toán VNPay và callback webhook
    │   │   ├── ProfileController.java        # Xử lý cập nhật hồ sơ người dùng
    │   │   ├── ChatController.java           # Quản lý cuộc hội thoại chat giữa người dùng và nông dân
    │   │   ├── LivestreamController.java     # Quản lý tạo/tham gia phòng livestream qua Agora RTC
    │   │   ├── ReportController.java         # Tiếp nhận báo cáo vi phạm sản phẩm/tài khoản
    │   │   └── SupportRequestController.java # Tiếp nhận ticket hỗ trợ gửi đến Admin
    │   ├── dto/                              # Data Transfer Objects (chứa các cấu trúc request/response)
    │   ├── model/                            # Thực thể dữ liệu JPA (Entities)
    │   │   ├── User.java                     # Lớp gốc phục vụ Joined Inheritance
    │   │   ├── Customer.java                 # Kế thừa User (Khách hàng)
    │   │   ├── Farmer.java                   # Kế thừa Customer (Nông dân/Nhà vườn)
    │   │   ├── OrderGroup.java               # Đơn hàng tổng thể thanh toán
    │   │   ├── CustomerAddress.java          # Sổ địa chỉ giao hàng của Khách hàng
    │   │   ├── ProductImage.java             # Quản lý danh sách hình ảnh phụ của nông sản
    │   │   ├── Conversation.java             # Thực thể phòng chat
    │   │   ├── ChatMessage.java              # Thực thể tin nhắn trong phòng chat
    │   │   ├── Report.java                   # Thực thể báo cáo vi phạm
    │   │   └── OtpVerification.java          # Thực thể lưu OTP xác thực
    │   ├── repository/                       # Giao tiếp với database (Spring Data JPA Repositories)
    │   │   └── ProductSpecification.java     # Cấu hình truy vấn tìm kiếm/lọc phân trang động
    │   ├── scheduler/                        # Các tiến trình ngầm tự động chạy
    │   │   ├── NotificationScheduler.java    # Quét và gửi thông báo hệ thống / email broadcast
    │   │   └── GhnSimulationScheduler.java   # Giả lập trạng thái vận chuyển GHN trong môi trường dev
    │   ├── security/                         # Cấu hình phân quyền & xác thực người dùng
    │   │   ├── SecurityConfig.java           # Định nghĩa các API public/private và CORS
    │   │   └── JwtFilter.java                # Bộ lọc chặn request để trích xuất & kiểm tra JWT token
    │   └── service/                          # Chứa logic nghiệp vụ xử lý chính (Services)
    │       ├── AiService.java                # Giao tiếp API Gemini Flash
    │       ├── DistanceService.java          # Tính khoảng cách bằng OSM/OSRM/Haversine
    │       ├── OrderService.java             # Logic tạo đơn, tách đơn, cập nhật trạng thái đơn
    │       ├── ChatService.java              # Logic lưu trữ và cập nhật tin nhắn
    │       ├── PaymentService.java           # Tích hợp thanh toán trực tuyến VNPay
    │       └── ReportService.java            # Xử lý tố cáo vi phạm từ người dùng
    └── resources/
        └── application.properties            # Cấu hình Database URL, cổng SMTP Mail, VNPay, và API Key Gemini
```

### 📂 Frontend (React + Vite)
```text
agrimarket-frontend/
├── package.json                              # Quản lý dependencies (React 18, Axios, React Leaflet)
├── vite.config.js                            # Cấu hình công cụ đóng gói Vite
├── index.html                                # File HTML gốc
└── src/
    ├── main.jsx                              # Điểm khởi chạy của ứng dụng React
    ├── App.jsx                               # Component chính bọc ngoài
    ├── index.css                             # Chứa các biến CSS toàn cục và định dạng chung
    ├── layouts/                              # Các bố cục dùng chung (AuthLayout, v.v.)
    ├── components/                           # Các component UI tái sử dụng nhiều lần
    ├── services/                             # Xử lý giao tiếp API với backend
    │   ├── apiClient.js                      # Axios instance cấu hình sẵn Base URL & interceptors JWT/401
    │   ├── authService.js                    # Quản lý đăng ký, đăng nhập, quên mật khẩu
    │   ├── productService.js                 # Gọi các API về nông sản và gợi ý từ AI
    │   ├── chatService.js                    # Xử lý gửi nhận tin nhắn trực tiếp
    │   └── wishlistService.js                # Quản lý danh mục yêu thích và theo dõi nhà vườn
    ├── routes/                               # Quản lý điều hướng client-side
    │   └── AppRoutes.jsx                     # Khai báo toàn bộ đường dẫn URL của các trang
    └── pages/                                # Thư mục chứa giao diện các trang cụ thể
        ├── Home/                             # Trang chủ hiển thị danh sách sản phẩm nổi bật
        ├── Login/                            # Trang đăng nhập tài khoản
        ├── Checkout/                         # Trang tính toán đơn hàng trước khi thanh toán
        ├── Farmer/                           # Dashboard của Nông dân (quản lý kho, doanh thu, live)
        ├── Admin/                            # Trang quản lý dành cho Admin hệ thống
        ├── Livestream/                       # Trang xem và bình luận livestream dành cho Khách hàng
        └── Product/                          # Các trang chi tiết nông sản, review và đặt hàng trước (Preorder)
```

---

## 6. Hướng dẫn Thiết lập & Chạy dưới Local

### Bước 1: Chuẩn bị Cơ sở dữ liệu
Hệ thống sử dụng **PostgreSQL** được lưu trữ trực tuyến qua **Supabase**.
1. Tạo một dự án mới trên Supabase hoặc chuẩn bị một cơ sở dữ liệu PostgreSQL trống. Lấy thông tin chuỗi kết nối kết nối (Host, DB Name, User, Password).
2. (Tùy chọn) Chạy mã SQL trong [Agrimarket-system-postgres.sql](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/docs/Agrimarket-system-postgres.sql) để tạo sẵn cấu trúc bảng và vai trò.
   *(Lưu ý: Nếu không chạy thủ công, Spring Boot nhờ cơ chế `ddl-auto=update` của Hibernate cũng tự động tạo và đồng bộ các bảng từ JPA entity sang PostgreSQL khi ứng dụng khởi chạy lần đầu, sau đó `DataInitializer` sẽ tự động seed tài khoản admin và các danh mục)*.

### Bước 2: Cấu hình ứng dụng Backend
Mở file [application.properties](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/resources/application.properties) và điều chỉnh các thông số sau hoặc thiết lập chúng qua biến môi trường:
- **Cấu hình kết nối PostgreSQL / Supabase DB**:
  - `spring.datasource.url`: Chuỗi JDBC kết nối PostgreSQL (ví dụ: `jdbc:postgresql://db.supabase.co:5432/postgres`)
  - `spring.datasource.username`: Tên người dùng của database.
  - `spring.datasource.password`: Mật khẩu kết nối database.
  - `spring.datasource.driver-class-name`: `org.postgresql.Driver`
  - `spring.jpa.properties.hibernate.dialect`: `org.hibernate.dialect.PostgreSQLDialect`
- **Cấu hình Supabase Object Storage**:
  - `supabase.url`: URL của dự án Supabase (ví dụ: `https://igqxplizbdyozagsaajg.supabase.co`).
  - `supabase.key`: Khóa API (anon key hoặc service role) có quyền ghi/đọc bucket.
  - `supabase.bucket`: Tên bucket đã tạo trên Supabase (ví dụ: `agrimarket`).
- **Cấu hình API Key Gemini**: `gemini.api.key`.
- **Cấu hình Email gửi OTP**: `spring.mail.username` và `spring.mail.password` (sử dụng Google App Password).
- **Cấu hình truyền phát Livestream Agora**:
  - `agora.app-id`: App ID dự án Agora của bạn.
  - `agora.app-certificate`: App Certificate tương ứng của dự án Agora.
- **Cấu hình dịch vụ vận chuyển Giao Hàng Nhanh (GHN)**:
  - `ghn.api.token`: API Token môi trường Sandbox được GHN cung cấp.
  - `ghn.api.shopid`: ID cửa hàng đăng ký trên hệ thống GHN.
  - `ghn.api.url`: Endpoint gọi tạo đơn hàng của GHN (mặc định: `https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create`).
  - `ghn.simulation.enabled`: Bật/Tắt chế độ giả lập vận chuyển tự động bằng Scheduler (`true` / `false`).

### Bước 3: Khởi chạy Backend
Tại thư mục chứa dự án Spring Boot (thư mục `AgriMarket/AgriMarket` có chứa file `pom.xml`), thực hiện biên dịch và chạy bằng Maven:
```bash
# Clean và build project
mvn clean install

# Chạy ứng dụng Spring Boot
mvn spring-boot:run
```
Backend sẽ khởi chạy tại cổng mặc định: `http://localhost:8080`.

### Bước 4: Khởi chạy Frontend
Tại thư mục `AgriMarket/agrimarket-frontend`:
1. Tạo file `.env` nếu chưa có và cấu hình URL API của backend:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```
2. Cài đặt các gói thư viện và chạy máy chủ phát triển (Vite):
   ```bash
   # Cài đặt dependencies
   npm install

   # Khởi chạy dev server
   npm run dev
   ```
Frontend sẽ chạy tại địa chỉ mặc định: `http://localhost:3000` hoặc `http://localhost:5173`.

### Bước 5: Đăng nhập Hệ thống
Sử dụng tài khoản Admin mặc định để cấu hình ban đầu:
- **Email**: `admin@agrimarket.com`
- **Mật khẩu**: `admin123`

---

## 7. Các phương án tải dữ liệu của các trang (Data Loading Techniques)

Để tối ưu hóa hiệu năng hệ thống, đặc biệt là giảm thiểu độ trễ mạng và mức tiêu thụ RAM/CPU của thiết bị người dùng, AgriMarket áp dụng các kỹ thuật tải dữ liệu phù hợp cho từng loại trang màn hình:

### 7.1. Phân trang & Lọc phía Máy chủ (Server-side Pagination & Filtering) - Trang Danh sách Sản phẩm (`/products`)
* **Hành vi cũ**: Tải toàn bộ danh sách sản phẩm và lọc/cắt mảng bằng JavaScript (`.slice()`) ở frontend.
* **Cải tiến**:
  - Giao diện gửi yêu cầu lấy sản phẩm qua API phân trang: `GET /api/products/paged?page=0&size=6&sort=popular&category=Trái cây`
  - Các tham số hỗ trợ lọc bao gồm: `category`, `search`, `minPrice`, `maxPrice`, `location`, `shopKeyword`, `minRating`, và `sort`.
  - Phía Spring Boot, [ProductSpecification.java](file:///d:/POW/Learn/FPT%20University/Ki_5/SWP391/Project/AgriMarket/AgriMarket/src/main/java/org/example/agrimarket/repository/ProductSpecification.java) sử dụng JPA Criteria API để xây dựng câu lệnh SQL lọc động, chỉ lấy đúng `size` (mặc định 6) bản ghi thuộc trang yêu cầu.

### 7.2. Lọc phía Máy chủ (Server-side Filtering) - Trang Chi tiết Nhà vườn (`/farmer-profile/:id`)
* **Hành vi cũ**: Tải toàn bộ sản phẩm đã duyệt của cả hệ thống về trình duyệt, sau đó chạy hàm `.filter()` để tìm sản phẩm có `farmerId` trùng khớp. Gây lag cực lớn khi dữ liệu lớn.
* **Cải tiến**:
  - Sử dụng chung API phân trang và truyền tham số `farmerId` để lọc trực tiếp ở tầng Database: `GET /api/products/paged?farmerId={id}&size=100`
  - Frontend chỉ hiển thị sản phẩm thực sự thuộc về nhà vườn đang xem mà không cần tải dữ liệu của các nhà vườn khác.

### 7.3. Phân trang Hỗn hợp (Mixed Pagination) - Trang chủ (`/` hoặc `/Home`)
* **Chi tiết**: Để tối ưu hiệu năng hiển thị trên trang chủ nhưng vẫn giữ nguyên logic trích xuất thông tin nhà vườn lân cận phức tạp:
  - Frontend gọi API `getApprovedProductsPaged` lấy tối đa 100 sản phẩm phổ biến nhất về cache tạm.
  - Phân trang hiển thị sản phẩm tại trang chủ (10 sản phẩm/trang) và việc tính khoảng cách thực tế/trích xuất danh sách nông trại xung quanh được thực hiện bằng JavaScript ở client từ 100 sản phẩm này.

### 7.4. Phân trang Phía Người dùng (Client-side Pagination) - Lịch sử Đơn hàng & Admin Dashboard
* **Chi tiết**: Các trang có dữ liệu thay đổi thường xuyên bởi các đối tượng nội bộ (như danh sách đơn hàng cá nhân `/profile/orders` hoặc màn hình quản lý khiếu nại `/admin/complaints`):
  - Tải toàn bộ dữ liệu tương ứng của người dùng/tác vụ hiện tại thông qua API.
  - Sử dụng phân trang ở client để người dùng có thể chuyển đổi trang nhanh chóng mà không cần gửi liên tục request tới server.

