import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ShieldAlert, MessageCircle, Phone, Truck, CreditCard, User, Wrench, ChevronRight } from "lucide-react";
import Header from "../../../components/common/Header/Header";
import Footer from "../../../components/common/Footer/Footer";
import supportRequestService from "../../../services/supportRequestService";
import reportService from "../../../services/reportService";
import authService from "../../../services/authService";
import "./SupportHub.css";

export default function SupportHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    const fetchRecentActivities = async () => {
      if (currentUser) {
        try {
          // Fetch both support requests and reports in parallel
          const [requestsData, reportsData] = await Promise.allSettled([
            supportRequestService.getMyRequests(),
            reportService.getMyReports(),
          ]);

          const requests = (requestsData.status === "fulfilled" ? requestsData.value : []).map((r) => ({
            ...r,
            _type: "request",
            _sortDate: r.updatedAt || r.createdAt,
          }));

          const reports = (reportsData.status === "fulfilled" ? reportsData.value : []).map((r) => ({
            ...r,
            _type: "report",
            _sortDate: r.updatedAt || r.createdAt,
          }));

          // Merge, sort by date descending, take top 4
          const combined = [...requests, ...reports]
            .sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate))
            .slice(0, 4);

          setRecentActivities(combined);
        } catch (err) {
          console.error("Lỗi khi tải hoạt động gần đây:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchRecentActivities();
  }, []);

  const getStatusClass = (status, type) => {
    if (type === "report") {
      switch (status) {
        case "pending": return "status-pending";
        case "reviewing": return "status-processing";
        case "resolved": return "status-resolved";
        case "rejected": return "status-rejected";
        default: return "";
      }
    }
    switch (status) {
      case "pending": return "status-pending";
      case "assigned": return "status-assigned";
      case "processing": return "status-processing";
      case "resolved": return "status-resolved";
      case "rejected": return "status-rejected";
      default: return "";
    }
  };

  const getStatusLabel = (status, type) => {
    if (type === "report") {
      switch (status) {
        case "pending": return "Đang chờ";
        case "reviewing": return "Đang xem xét";
        case "resolved": return "Đã xử lý";
        case "rejected": return "Đã từ chối";
        default: return status;
      }
    }
    switch (status) {
      case "pending": return "Đang chờ";
      case "assigned": return "Đã phân công";
      case "processing": return "Đang xử lý";
      case "resolved": return "Đã giải quyết";
      case "rejected": return "Đã từ chối";
      default: return status;
    }
  };

  const handleCreateRequestClick = () => {
    if (!user) {
      navigate("/login");
    } else {
      navigate("/support/create");
    }
  };

  return (
    <div className="support-hub-page">
      <Header activeTab="support" />

      {/* Hero Banner Section */}
      <section className="support-hero-section">
        <div className="support-hero-container">
          <div className="support-hero-text">
            <h1>Chúng tôi có thể giúp gì cho bạn?</h1>
            <p>
              Đội ngũ hỗ trợ của chúng tôi sẵn sàng giúp đỡ bạn với các đơn hàng,
              thanh toán, giao hàng, vấn đề kỹ thuật và báo cáo thị trường.
            </p>
          </div>
          <div className="support-hero-image">
            <div className="support-illustration-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" className="support-svg-illustration">
                {/* Soft Background circles */}
                <circle cx="250" cy="175" r="160" fill="#e8f5e9" opacity="0.3" />
                <circle cx="380" cy="120" r="70" fill="#c8e6c9" opacity="0.2" />

                {/* Foliage/Leaves on the Left (Background) */}
                <path d="M 40,240 C 20,200 30,120 80,100 C 70,140 60,190 40,240 Z" fill="#81c784" opacity="0.7" />
                <path d="M 60,260 C 40,220 50,150 95,130 C 85,170 80,210 60,260 Z" fill="#a5d6a7" opacity="0.8" />
                <path d="M 30,180 C 10,150 20,100 55,90 C 45,120 40,150 30,180 Z" fill="#c8e6c9" opacity="0.5" />

                {/* Foliage/Leaves on the Right (Background) */}
                <path d="M 460,240 C 480,200 470,120 420,100 C 430,140 440,190 460,240 Z" fill="#81c784" opacity="0.7" />
                <path d="M 440,260 C 460,220 450,150 405,130 C 415,170 420,210 440,260 Z" fill="#a5d6a7" opacity="0.8" />

                {/* Browser Card Mockup */}
                <rect x="90" y="60" width="320" height="210" rx="16" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" filter="drop-shadow(0px 8px 24px rgba(0,0,0,0.06))" />

                {/* Browser top dots */}
                <circle cx="115" cy="78" r="4" fill="#a5d6a7" />
                <circle cx="127" cy="78" r="4" fill="#a5d6a7" />
                <circle cx="139" cy="78" r="4" fill="#a5d6a7" />
                <line x1="155" y1="78" x2="385" y2="78" stroke="#f0f0f0" strokeWidth="2" strokeLinecap="round" />

                {/* Center Text (FARMING MARKETPLACE SUPPORT) */}
                <text x="250" y="130" fill="#1b5e20" fontWeight="900" fontSize="22" fontFamily="'Outfit', 'Inter', sans-serif" textAnchor="middle" letterSpacing="0.5">FARMING</text>
                <text x="250" y="158" fill="#1b5e20" fontWeight="900" fontSize="22" fontFamily="'Outfit', 'Inter', sans-serif" textAnchor="middle" letterSpacing="0.5">MARKETPLACE</text>
                <text x="250" y="186" fill="#1b5e20" fontWeight="900" fontSize="22" fontFamily="'Outfit', 'Inter', sans-serif" textAnchor="middle" letterSpacing="0.5">SUPPORT</text>

                {/* HELP CENTER Button */}
                <rect x="190" y="208" width="120" height="24" rx="12" fill="#81c784" />
                <text x="250" y="224" fill="#ffffff" fontWeight="bold" fontSize="9" fontFamily="'Inter', sans-serif" textAnchor="middle" letterSpacing="0.5">HELP CENTER</text>

                {/* Handshake Graphic (Bottom Left) */}
                <g transform="translate(45, 200)">
                  <circle cx="45" cy="45" r="32" fill="#ffffff" stroke="#e8f5e9" strokeWidth="2" filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.04))" />

                  {/* Left sleeve */}
                  <path d="M 20,52 L 32,45 L 35,50 L 23,57 Z" fill="#81c784" />
                  {/* Right sleeve */}
                  <path d="M 70,52 L 58,45 L 55,50 L 67,57 Z" fill="#81c784" />

                  {/* Shaking Hands Paths */}
                  <path d="M 32,45 C 38,40 45,45 47,48 C 49,50 51,51 53,49 C 55,47 52,43 47,40" stroke="#2e7d32" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 58,45 C 52,40 45,45 43,48 C 41,50 39,51 37,49 C 35,47 38,43 43,40" stroke="#2e7d32" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 40,48 L 50,48" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 42,52 L 48,52" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Tractor Graphic (Bottom Right) */}
                <g transform="translate(290, 190)">
                  {/* Tractor body */}
                  <path d="M 50,40 L 85,40 L 85,55 L 40,55 L 40,48 Z" fill="#2e7d32" />
                  <rect x="52" y="32" width="22" height="10" fill="#a5d6a7" />
                  {/* Cabin */}
                  <path d="M 50,30 L 78,30 L 78,40 L 48,40 Z" fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinejoin="round" />
                  <rect x="54" y="27" width="22" height="3" fill="#2e7d32" rx="1" />
                  {/* Exhaust pipe */}
                  <line x1="80" y1="20" x2="80" y2="40" stroke="#333333" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 80,20 Q 83,18 85,20" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" />
                  {/* Big Wheel */}
                  <circle cx="48" cy="55" r="16" fill="#1b5e20" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="48" cy="55" r="7" fill="#ffffff" />
                  <circle cx="48" cy="55" r="3" fill="#1b5e20" />
                  {/* Small Wheel */}
                  <circle cx="85" cy="59" r="11" fill="#1b5e20" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="85" cy="59" r="4" fill="#ffffff" />
                  {/* Mudguard */}
                  <path d="M 30,52 C 30,38 64,38 64,52" fill="none" stroke="#1b5e20" strokeWidth="3" strokeLinecap="round" />
                </g>

                {/* Speech Bubble "?" (Top Right) */}
                <g transform="translate(370, 40)">
                  <path d="M 12,28 L 6,36 L 20,32 Z" fill="#81c784" />
                  <circle cx="20" cy="18" r="18" fill="#81c784" filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.06))" />
                  <text x="20" y="24" fill="#ffffff" fontWeight="bold" fontSize="18" fontFamily="sans-serif" textAnchor="middle">?</text>
                </g>

                {/* Additional chat bubbles (Top Right secondary) */}
                <g transform="translate(390, 80)">
                  <rect x="10" y="5" width="28" height="18" rx="5" fill="#a5d6a7" opacity="0.8" />
                  <path d="M 15,23 L 13,27 L 19,23 Z" fill="#a5d6a7" opacity="0.8" />
                  <line x1="16" y1="11" x2="32" y2="11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="16" y1="16" x2="26" y2="16" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Main Options Grid */}
      <div className="support-main-container">
        <section className="support-options-section">
          <div className="support-options-grid">
            {/* Card 1 */}
            <div className="support-card glass-card">
              <div className="card-icon-wrapper purple-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><FileText size={20} /></div>
              <h2>Tạo Yêu cầu Hỗ trợ</h2>
              <p>Gửi yêu cầu hỗ trợ chi tiết cho các vấn đề phức tạp cần sự trợ giúp tận tình.</p>
              <button className="support-btn btn-primary-green" onClick={handleCreateRequestClick}>
                Tạo yêu cầu
              </button>
            </div>

            {/* Card 2 */}
            <div className="support-card glass-card">
              <div className="card-icon-wrapper red-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ShieldAlert size={20} /></div>
              <h2>Báo cáo Vi phạm</h2>
              <p>
                Báo cáo các hoạt động nghi vấn, gian lận hoặc vi phạm chính sách
                của thị trường.
              </p>
              <button
                className="support-btn btn-secondary"
                onClick={() => {
                  if (!user) {
                    navigate("/login");
                  } else {
                    navigate("/support/report");
                  }
                }}
              >
                Báo cáo ngay
              </button>
            </div>


            {/* Card 3 */}
            <div className="support-card glass-card">
              <div className="card-icon-wrapper blue-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><MessageCircle size={20} /></div>
              <h2>Chat trực tiếp</h2>
              <p>Nhận sự trợ giúp ngay lập tức từ các chuyên viên hỗ trợ của chúng tôi cho các thắc mắc khẩn cấp.</p>
              <button
                className="support-btn btn-secondary"
                onClick={() => {
                  if (!user) {
                    navigate("/login");
                  } else {
                    navigate("/support/chat");
                  }
                }}
              >
                Bắt đầu Chat
              </button>
            </div>
            <div className="support-card glass-card">
              <div className="card-icon-wrapper orange-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Phone size={20} /></div>
              <h2>Liên hệ Hỗ trợ</h2>
              <p>Tìm số điện thoại và giờ làm việc để liên lạc trực tiếp.</p>
              <button className="support-btn btn-secondary" onClick={() => alert("Hotline hỗ trợ: 1900 123 456 (08:00 - 17:30)")}>
                Liên hệ với chúng tôi
              </button>
            </div>
          </div>
        </section>

        <div className="support-bottom-layout">
          <aside className="support-categories-sidebar">
            <h3 className="section-title">Danh mục</h3>
            <ul className="support-cat-list">
              <li onClick={() => user ? navigate("/support/create?category=Theo dõi Giao hàng") : navigate("/login")} style={{ display: "flex", alignItems: "center" }}>
                <span className="cat-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Truck size={18} /></span>
                <span className="cat-text">Theo dõi Giao hàng</span>
                <span className="cat-arrow" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={14} /></span>
              </li>
              <li onClick={() => user ? navigate("/support/create?category=Thanh toán %26 Hóa đơn") : navigate("/login")} style={{ display: "flex", alignItems: "center" }}>
                <span className="cat-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={18} /></span>
                <span className="cat-text">Thanh toán & Hóa đơn</span>
                <span className="cat-arrow" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={14} /></span>
              </li>
              <li onClick={() => user ? navigate("/support/create?category=Tài khoản %26 Bảo mật") : navigate("/login")} style={{ display: "flex", alignItems: "center" }}>
                <span className="cat-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><User size={18} /></span>
                <span className="cat-text">Tài khoản & Bảo mật</span>
                <span className="cat-arrow" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={14} /></span>
              </li>
              <li onClick={() => user ? navigate("/support/create?category=Hỗ trợ Kỹ thuật") : navigate("/login")} style={{ display: "flex", alignItems: "center" }}>
                <span className="cat-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Wrench size={18} /></span>
                <span className="cat-text">Hỗ trợ Kỹ thuật</span>
                <span className="cat-arrow" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={14} /></span>
              </li>
            </ul>
          </aside>

          {/* Recent Activity */}
          <section className="support-recent-activity">
            <div className="recent-activity-header">
              <h3 className="section-title">Hoạt động Gần đây</h3>
              {user && recentActivities.length > 0 && (
                <button className="view-all-btn" onClick={() => navigate("/support/my-requests")}>
                  Xem tất cả
                </button>
              )}
            </div>

            {!user ? (
              <div className="activity-placeholder">
                <p>Vui lòng đăng nhập để theo dõi trạng thái các yêu cầu hỗ trợ.</p>
                <button className="support-btn btn-primary-green" onClick={() => navigate("/login")}>Đăng nhập</button>
              </div>
            ) : loading ? (
              <div className="activity-loading">Đang tải hoạt động gần đây...</div>
            ) : recentActivities.length === 0 ? (
              <div className="activity-placeholder">
                <p>Bạn chưa có hoạt động hỗ trợ nào gần đây.</p>
                <button className="support-btn btn-primary-green" onClick={() => navigate("/support/create")}>Tạo yêu cầu ngay</button>
              </div>
            ) : (
              <div className="activity-timeline">
                {recentActivities.map((item) => (
                  <div
                    key={`${item._type}-${item.id}`}
                    className="activity-item"
                    onClick={() => {
                      if (item._type === "request") {
                        navigate(`/support/detail/${item.id}`);
                      }
                      // reports don’t have a detail page yet, no navigation
                    }}
                    style={item._type === "report" ? { cursor: "default" } : {}}
                  >
                    <div className="activity-timeline-line">
                      <div
                        className="activity-node-dot"
                        style={item._type === "report" ? { background: "#ef5350" } : {}}
                      ></div>
                    </div>
                    <div className="activity-content-box">
                      <div className="activity-meta">
                        <span className="activity-id">
                          {item._type === "report" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ShieldAlert size={14} style={{ color: "#ef5350" }} /> RP-{item.id}
                          </span>
                        ) : (
                          <>#REQ-{item.id}</>
                        )}
                        </span>
                        <span className={`activity-status-badge ${getStatusClass(item.status, item._type)}`}>
                          {getStatusLabel(item.status, item._type)}
                        </span>
                      </div>
                      <h4>
                        {item._type === "report"
                          ? `Báo cáo vi phạm — ${item.reason || "Vi phạm chính sách"}`
                          : item.title}
                      </h4>
                      <p className="activity-desc">
                        {item._type === "report"
                          ? `Đối tượng: ${item.targetType === "product" ? "Sản phẩm" : item.targetType === "farmer" ? "Nông trại" : "Khách hàng"} (ID: ${item.targetId})`
                          : item.description}
                      </p>
                      <span className="activity-time">
                        {item._type === "report" ? "Báo cáo vi phạm" : `Danh mục: ${item.category}`} | Cập nhật lúc:{" "}
                        {new Date(item._sortDate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
