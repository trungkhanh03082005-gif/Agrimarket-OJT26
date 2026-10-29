import React, { useState, useEffect, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Star,
  Search,
  Filter,
  Image as ImageIcon,
  MessageCircle,
  ShoppingBag,
  TrendingUp,
  X,
  Sparkles,
  Award,
  Package,
  Truck,
  Leaf
} from "lucide-react";
import reviewService from "../../../services/reviewService";
import "./FarmerReviews.css";

const StarRating = ({ rating, size = 16 }) => {
  return (
    <div className="fr-stars-box">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill={s <= rating ? "#f59e0b" : "none"}
          stroke="#f59e0b"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
};

export const FarmerReviews = () => {
  const { farmerProfile } = useOutletContext();
  const [reviewsData, setReviewsData] = useState({
    summary: {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      avgQuality: 0,
      avgFreshness: 0,
      avgPackaging: 0,
      avgDelivery: 0
    },
    reviews: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all"); // "all" | "5" | "4" | "3" | "2" | "1" | "has_images" | "has_comment"
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "oldest" | "highest" | "lowest"
  const [activeImageModal, setActiveImageModal] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await reviewService.getFarmerReviews();
      if (data) {
        setReviewsData({
          summary: data.summary || {
            averageRating: 0,
            totalReviews: 0,
            ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            avgQuality: 0,
            avgFreshness: 0,
            avgPackaging: 0,
            avgDelivery: 0
          },
          reviews: data.reviews || []
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách đánh giá của nông dân:", err);
    } finally {
      setLoading(false);
    }
  };

  const positiveRatio = useMemo(() => {
    const counts = reviewsData.summary.ratingCounts || {};
    const total = reviewsData.summary.totalReviews || 0;
    if (total === 0) return 0;
    const positive = (counts[4] || 0) + (counts[5] || 0);
    return Math.round((positive / total) * 100);
  }, [reviewsData.summary]);

  const filteredReviews = useMemo(() => {
    let list = [...(reviewsData.reviews || [])];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const prodName = (r.productName || "").toLowerCase();
        const ordCode = (r.orderCode || "").toLowerCase();
        const comment = (r.comment || "").toLowerCase();
        const author = (r.author || "").toLowerCase();
        return (
          prodName.includes(q) ||
          ordCode.includes(q) ||
          comment.includes(q) ||
          author.includes(q)
        );
      });
    }

    // Rating / feature filter
    if (ratingFilter !== "all") {
      if (ratingFilter === "has_images") {
        list = list.filter((r) => r.images && r.images.length > 0);
      } else if (ratingFilter === "has_comment") {
        list = list.filter((r) => r.comment && r.comment.trim().length > 0);
      } else {
        const starNum = parseInt(ratingFilter, 10);
        list = list.filter((r) => r.rating === starNum);
      }
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.date || 0) - new Date(a.date || 0);
      } else if (sortBy === "oldest") {
        return new Date(a.date || 0) - new Date(b.date || 0);
      } else if (sortBy === "highest") {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === "lowest") {
        return (a.rating || 0) - (b.rating || 0);
      }
      return 0;
    });

    return list;
  }, [reviewsData.reviews, searchQuery, ratingFilter, sortBy]);

  return (
    <div className="fr-container">
      {/* OVERVIEW STATS GRID */}
      <div className="fr-stats-grid">
        {/* Main Rating Summary Card */}
        <div className="fr-stat-card fr-main-rating-card">
          <div className="fr-card-title" style={{ justifyContent: "center" }}>
            <Award size={20} color="#166534" />
            <span>Đánh giá trung bình</span>
          </div>
          <div className="fr-rating-number-wrap">
            <span className="fr-big-number">
              {reviewsData.summary.averageRating > 0
                ? reviewsData.summary.averageRating.toFixed(1)
                : "0.0"}
            </span>
            <span className="fr-rating-max">/ 5.0</span>
          </div>
          <div className="fr-stars-row">
            <StarRating
              rating={Math.round(reviewsData.summary.averageRating || 0)}
              size={22}
            />
          </div>
          <p className="fr-total-subtitle">
            Dựa trên {reviewsData.summary.totalReviews || 0} lượt đánh giá từ người dùng
          </p>
        </div>

        {/* Rating Breakdown Card */}
        <div className="fr-stat-card fr-breakdown-card">
          <div className="fr-card-title">
            <TrendingUp size={18} color="#0f172a" />
            <span>Phân bố mức sao</span>
          </div>
          <div className="fr-breakdown-bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = (reviewsData.summary.ratingCounts || {})[star] || 0;
              const total = reviewsData.summary.totalReviews || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={star} className="fr-bar-row">
                  <span className="fr-star-label">{star} ★</span>
                  <div className="fr-bar-bg">
                    <div
                      className="fr-bar-fill"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="fr-count-num">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratings Breakdown Card */}
        <div className="fr-stat-card">
          <div className="fr-card-title">
            <Sparkles size={18} color="#15803d" />
            <span>Tiêu chí trải nghiệm ({positiveRatio}% hài lòng)</span>
          </div>
          <div className="fr-aspects-grid">
            <div className="fr-aspect-box">
              <div className="fr-aspect-label">
                <Leaf size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                Độ tươi ngon
              </div>
              <div className="fr-aspect-val-row">
                <span className="fr-aspect-score">
                  {reviewsData.summary.avgFreshness > 0
                    ? reviewsData.summary.avgFreshness.toFixed(1)
                    : "0.0"}
                </span>
                <StarRating
                  rating={Math.round(reviewsData.summary.avgFreshness || 0)}
                  size={12}
                />
              </div>
            </div>

            <div className="fr-aspect-box">
              <div className="fr-aspect-label">
                <Award size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                Chất lượng
              </div>
              <div className="fr-aspect-val-row">
                <span className="fr-aspect-score">
                  {reviewsData.summary.avgQuality > 0
                    ? reviewsData.summary.avgQuality.toFixed(1)
                    : "0.0"}
                </span>
                <StarRating
                  rating={Math.round(reviewsData.summary.avgQuality || 0)}
                  size={12}
                />
              </div>
            </div>

            <div className="fr-aspect-box">
              <div className="fr-aspect-label">
                <Package size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                Đóng gói
              </div>
              <div className="fr-aspect-val-row">
                <span className="fr-aspect-score">
                  {reviewsData.summary.avgPackaging > 0
                    ? reviewsData.summary.avgPackaging.toFixed(1)
                    : "0.0"}
                </span>
                <StarRating
                  rating={Math.round(reviewsData.summary.avgPackaging || 0)}
                  size={12}
                />
              </div>
            </div>

            <div className="fr-aspect-box">
              <div className="fr-aspect-label">
                <Truck size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                Giao hàng
              </div>
              <div className="fr-aspect-val-row">
                <span className="fr-aspect-score">
                  {reviewsData.summary.avgDelivery > 0
                    ? reviewsData.summary.avgDelivery.toFixed(1)
                    : "0.0"}
                </span>
                <StarRating
                  rating={Math.round(reviewsData.summary.avgDelivery || 0)}
                  size={12}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR: Search, Sort & Filters */}
      <div className="fr-controls-bar">
        <div className="fr-search-sort-row">
          <div className="fr-search-wrap">
            <Search className="fr-search-icon" size={18} />
            <input
              type="text"
              className="fr-search-input"
              placeholder="Tìm kiếm theo Tên sản phẩm, Mã đơn hàng (#ORD-...) hoặc nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="fr-sort-wrap">
            <span>Sắp xếp:</span>
            <select
              className="fr-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="highest">Đánh giá cao nhất</option>
              <option value="lowest">Đánh giá thấp nhất</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="fr-filter-pills">
          <button
            className={`fr-pill-btn ${ratingFilter === "all" ? "active" : ""}`}
            onClick={() => setRatingFilter("all")}
          >
            Tất cả ({reviewsData.reviews.length})
          </button>
          <button
            className={`fr-pill-btn ${ratingFilter === "5" ? "active" : ""}`}
            onClick={() => setRatingFilter("5")}
          >
            5 Sao ({reviewsData.summary.ratingCounts?.[5] || 0})
          </button>
          <button
            className={`fr-pill-btn ${ratingFilter === "4" ? "active" : ""}`}
            onClick={() => setRatingFilter("4")}
          >
            4 Sao ({reviewsData.summary.ratingCounts?.[4] || 0})
          </button>
          <button
            className={`fr-pill-btn ${ratingFilter === "3" ? "active" : ""}`}
            onClick={() => setRatingFilter("3")}
          >
            3 Sao ({reviewsData.summary.ratingCounts?.[3] || 0})
          </button>
          <button
            className={`fr-pill-btn ${ratingFilter === "2" ? "active" : ""}`}
            onClick={() => setRatingFilter("2")}
          >
            2 Sao ({reviewsData.summary.ratingCounts?.[2] || 0})
          </button>
          <button
            className={`fr-pill-btn ${ratingFilter === "1" ? "active" : ""}`}
            onClick={() => setRatingFilter("1")}
          >
            1 Sao ({reviewsData.summary.ratingCounts?.[1] || 0})
          </button>
          <button
            className={`fr-pill-btn ${ratingFilter === "has_images" ? "active" : ""}`}
            onClick={() => setRatingFilter("has_images")}
          >
            <ImageIcon size={14} /> Có hình ảnh
          </button>
          <button
            className={`fr-pill-btn ${ratingFilter === "has_comment" ? "active" : ""}`}
            onClick={() => setRatingFilter("has_comment")}
          >
            <MessageCircle size={14} /> Có nhận xét
          </button>
        </div>
      </div>

      {/* REVIEWS LIST AREA */}
      {loading ? (
        <div className="fr-reviews-list">
          {[1, 2, 3].map((n) => (
            <div key={n} className="fr-review-card" style={{ minHeight: "140px" }}>
              <div className="fr-skeleton" style={{ width: "200px", height: "24px" }}></div>
              <div className="fr-skeleton" style={{ width: "100%", height: "40px" }}></div>
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="fr-empty-box">
          <div className="fr-empty-icon">
            <Star size={32} />
          </div>
          <h3 className="fr-empty-title">Không tìm thấy đánh giá phù hợp</h3>
          <p className="fr-empty-desc">
            Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc sao để xem toàn bộ phản hồi từ khách hàng.
          </p>
        </div>
      ) : (
        <div className="fr-reviews-list">
          {filteredReviews.map((rev) => (
            <div key={rev.id} className="fr-review-card">
              {/* Card Header: Customer info & Order Code */}
              <div className="fr-card-header">
                <div className="fr-user-info">
                  <div className="fr-user-avatar">{rev.avatarText || "KH"}</div>
                  <div className="fr-user-details">
                    <span className="fr-user-name">{rev.author}</span>
                    <span className="fr-review-date">{rev.date || "Vừa xong"}</span>
                  </div>
                </div>

                {rev.orderCode && (
                  <Link
                    to={`/farmer/orders`}
                    className="fr-order-badge"
                    title="Xem danh sách đơn hàng"
                  >
                    <ShoppingBag size={14} />
                    <span>Mã đơn: #{rev.orderCode}</span>
                  </Link>
                )}
              </div>

              {/* Product Chip */}
              {rev.productName && (
                <div className="fr-product-chip">
                  {rev.productImage ? (
                    <img
                      src={rev.productImage}
                      alt={rev.productName}
                      className="fr-product-img"
                    />
                  ) : (
                    <div
                      className="fr-product-img"
                      style={{
                        background: "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <ShoppingBag size={16} color="#64748b" />
                    </div>
                  )}
                  <span className="fr-product-title">{rev.productName}</span>
                </div>
              )}

              {/* Star Rating & Criteria */}
              <div className="fr-ratings-row">
                <StarRating rating={rev.rating || 5} size={18} />

                {rev.specificRatings && (
                  <div className="fr-criteria-tags">
                    {rev.specificRatings.freshness > 0 && (
                      <span className="fr-crit-chip">
                        Tươi ngon: {rev.specificRatings.freshness}★
                      </span>
                    )}
                    {rev.specificRatings.quality > 0 && (
                      <span className="fr-crit-chip">
                        Chất lượng: {rev.specificRatings.quality}★
                      </span>
                    )}
                    {rev.specificRatings.packaging > 0 && (
                      <span className="fr-crit-chip">
                        Đóng gói: {rev.specificRatings.packaging}★
                      </span>
                    )}
                    {rev.specificRatings.delivery > 0 && (
                      <span className="fr-crit-chip">
                        Giao hàng: {rev.specificRatings.delivery}★
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Comment Body */}
              {rev.comment && (
                <p className="fr-comment-text">{rev.comment}</p>
              )}

              {/* Tags List */}
              {rev.tags && rev.tags.length > 0 && (
                <div className="fr-tags-row">
                  {rev.tags.map((t, idx) => (
                    <span key={idx} className="fr-tag-pill">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Images Grid */}
              {rev.images && rev.images.length > 0 && (
                <div className="fr-images-grid">
                  {rev.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="fr-thumb-wrap"
                      onClick={() => setActiveImageModal(imgUrl)}
                    >
                      <img src={imgUrl} alt={`Đánh giá đính kèm ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {activeImageModal && (
        <div
          className="fr-modal-overlay"
          onClick={() => setActiveImageModal(null)}
        >
          <div
            className="fr-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="fr-modal-close"
              onClick={() => setActiveImageModal(null)}
            >
              <X size={20} />
            </button>
            <img src={activeImageModal} alt="Xem ảnh đánh giá cỡ lớn" />
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerReviews;
