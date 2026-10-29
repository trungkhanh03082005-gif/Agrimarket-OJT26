import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import Footer from "../../components/common/Footer/Footer";
import "../Home/Home.css";
import "./TermsOfService.css";
import NotificationBell from "../../components/common/NotificationBell/NotificationBell";
import Header from "../../components/common/Header/Header";

const TermsOfService = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate("/");
  };

  return (
    <div className="terms-page">
      <Header />

      {/* Main Content Area */}
      <main className="terms-main">
        <div className="terms-container">
          <div className="terms-header-section">
            <span className="terms-tag">⚖️ ĐIỀU KHOẢN & QUY CHẾ</span>
            <h1 className="terms-title">Điều khoản dịch vụ</h1>
            <p className="terms-updated">Cập nhật lần cuối: Ngày 05 tháng 06 năm 2026</p>
          </div>

          <div className="terms-card">
            <p className="terms-intro">
              Chào mừng bạn đến với nền tảng giao thương nông nghiệp số **AgriMarket**. Bằng việc truy cập, đăng ký tài khoản và sử dụng các tính năng trên website của chúng tôi, bạn đồng ý tuân thủ các điều khoản dịch vụ dưới đây. Vui lòng đọc kỹ các điều khoản này trước khi tham gia giao dịch.
            </p>

            <hr className="terms-divider" />

            <section className="terms-section">
              <h2>1. Chấp nhận các điều khoản sử dụng</h2>
              <p>
                Khi truy cập hoặc sử dụng bất kỳ phần nào của website AgriMarket, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý chịu sự ràng buộc bởi các quy định này. Nếu bạn không đồng ý với bất kỳ phần nào của điều khoản, vui lòng không sử dụng dịch vụ của chúng tôi.
              </p>
            </section>

            <section className="terms-section">
              <h2>2. Quy định đăng ký tài khoản</h2>
              <p>
                Để sử dụng một số tính năng (như đăng bán sản phẩm hoặc mua nông sản), bạn phải đăng ký tài khoản và tuân thủ các quy tắc sau:
              </p>
              <ul>
                <li>Cung cấp thông tin đăng ký chính xác, đầy đủ và cập nhật hồ sơ khi có sự thay đổi.</li>
                <li>Chịu trách nhiệm bảo mật thông tin mật khẩu cá nhân của mình.</li>
                <li>Không được sử dụng tài khoản của người khác hoặc cho phép người khác sử dụng tài khoản của mình nhằm các mục đích sai phạm hoặc phi pháp.</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>3. Quy chế đối với chủ nông trại (Nông dân)</h2>
              <p>
                Nông dân khi thực hiện chào hàng và đăng bán nông sản trên AgriMarket cần cam kết:
              </p>
              <ul>
                <li><strong>Trung thực thông tin:</strong> Tên nông sản, danh mục, hình ảnh và mô tả sản phẩm đăng lên phải khớp chính xác với thực tế hàng hóa.</li>
                <li><strong>An toàn thực phẩm:</strong> Nông sản phải đảm bảo các tiêu chuẩn vệ sinh an toàn thực phẩm. Đối với sản phẩm đăng nhãn "Hữu cơ", nông dân bắt buộc phải tải lên giấy chứng nhận xuất xứ hữu cơ hợp lệ.</li>
                <li><strong>Giá bán:</strong> Định giá bán rõ ràng kèm đơn vị tính. Nông dân có thể tham khảo tính năng *AI gợi ý giá* của chúng tôi để đưa ra mức giá hợp lý nhất trên thị trường.</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>4. Quy chế đối với khách hàng (Người mua)</h2>
              <p>
                Người mua khi tham gia đặt mua nông sản trên hệ thống cần đồng ý:
              </p>
              <ul>
                <li>Cung cấp địa chỉ giao nhận hàng chính xác (4 cấp: Tỉnh/Thành, Quận/Huyện, Phường/Xã và địa chỉ chi tiết).</li>
                <li>Thanh toán đúng số tiền đơn hàng và phí vận chuyển theo thỏa thuận giao dịch.</li>
                <li>Nhận hàng và kiểm tra tính tươi ngon của nông sản tại thời điểm bàn nhận.</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>5. Quyền sở hữu trí tuệ</h2>
              <p>
                Toàn bộ nội dung trên website, bao gồm nhưng không giới hạn ở văn bản, mã code, giao diện thiết kế, logo AgriMarket và cấu trúc thương hiệu đều thuộc quyền sở hữu trí tuệ của AgriMarket và được bảo hộ theo luật pháp Việt Nam. Mọi hành vi sao chép trái phép không có sự đồng ý bằng văn bản của chúng tôi đều bị cấm.
              </p>
            </section>

            <section className="terms-section">
              <h2>6. Giới hạn trách nhiệm</h2>
              <p>
                AgriMarket đóng vai trò là cầu nối thương mại trực tiếp giữa nông dân và khách hàng. Chúng tôi nỗ lực tối đa kiểm duyệt các thông tin và giấy chứng nhận được tải lên, tuy nhiên:
              </p>
              <ul>
                <li>Chất lượng sản phẩm cuối cùng và quy trình giao nhận do thỏa thuận trực tiếp giữa nông dân và người mua quyết định.</li>
                <li>Chúng tôi không chịu trách nhiệm đối với bất kỳ thiệt hại trực tiếp hoặc gián tiếp nào phát sinh từ các giao dịch tranh chấp cá nhân giữa các thành viên.</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>7. Giải quyết tranh chấp và Khiếu nại</h2>
              <p>
                Mọi tranh chấp phát sinh trong quá trình mua bán sẽ được khuyến khích giải quyết trước hết bằng hình thức thương lượng, hòa giải trực tiếp giữa các bên. Nếu không đạt được sự thống nhất, ban quản trị AgriMarket sẽ hỗ trợ làm trung gian đối chất thông tin dựa trên dữ liệu giao dịch đã ghi nhận trên hệ thống.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
