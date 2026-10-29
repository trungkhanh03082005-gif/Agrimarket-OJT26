import React from "react";
import { Link } from "react-router-dom";
import { Sprout, UserCheck, Tag } from "lucide-react";
import "./ProductCard.css";

const ProductCard = ({
  product,
  promo,
  isFavorite,
  onFavoriteClick,
  onAddToCart,
  statusBadge = null, // "IN_STOCK" or "OUT_OF_STOCK"
  removeMode = false, // If true, the favorite button looks like a cross/remove instead of a heart
}) => {
  const calcDiscountedPrice = (price, promo) => {
    if (!promo) return price;
    if (promo.discountType === 'percent') return Math.round(price * (1 - promo.discountVal / 100));
    if (promo.discountType === 'amount') return Math.max(0, price - promo.discountVal);
    return price;
  };

  const discountedPrice = promo ? calcDiscountedPrice(product.price, promo) : product.price;
  const discountLabel = promo
    ? (promo.discountType === 'percent' ? `-${promo.discountVal}%` : `-${(promo.discountVal / 1000).toFixed(0)}K`)
    : (product.saleTag || null);

  const handleFavClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteClick) onFavoriteClick(product, e);
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) onAddToCart(product, e);
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className={`new-product-card ${removeMode && !isFavorite ? "removing-anim" : ""}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="new-card-img-wrapper">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="new-card-img" />
        ) : (
          <div className="new-card-img-fallback">
            <Sprout size={32} />
          </div>
        )}
        
        {discountLabel && (
          <span className={`new-card-sale-tag ${promo ? 'promo-badge' : ''}`}>{discountLabel}</span>
        )}

        {statusBadge === "IN_STOCK" && (
          <span className="wishlist-status-badge in-stock" style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(16, 185, 129, 0.9)", color: "white", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>Còn hàng</span>
        )}
        {statusBadge === "OUT_OF_STOCK" && (
          <span className="wishlist-status-badge out-of-stock" style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(107, 114, 128, 0.9)", color: "white", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>Hết hàng</span>
        )}

        {promo && (
          <div className="new-card-promo-name">
            <span style={{ marginRight: 4, display: 'inline-block' }}>🏷️</span>
            Khuyến mãi
          </div>
        )}

        <button
          className={`new-card-favorite-btn ${isFavorite ? "active" : ""}`}
          aria-label={removeMode ? "Xóa" : "Yêu thích"}
          onClick={handleFavClick}
          title={removeMode ? "Xóa khỏi mục yêu thích" : "Thêm vào yêu thích"}
        >
          {removeMode ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={isFavorite ? "#DC2626" : "none"}
              stroke={isFavorite ? "#DC2626" : "currentColor"}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
        </button>
      </div>

      <div className="new-card-body">
        <div className="new-card-body-top">
          <span className="new-card-category">{product.category ? product.category.toUpperCase() : "KHÁC"}</span>
          <h3 className="new-card-title" title={product.name}>{product.name}</h3>

          <div className="new-card-tags-row">
            {product.farmerOrganicUrl && <span className="new-card-tag organic">Hữu cơ</span>}
            {product.farmerVietgapUrl && <span className="new-card-tag vietgap">VietGAP</span>}
            {product.farmerGlobalgapUrl && <span className="new-card-tag globalgap">GlobalGAP</span>}
          </div>

          <div className="new-card-farm-row">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <UserCheck size={14} /> {product.farmerName || "Nhà vườn Agri"}
            </span>
          </div>

          <div className="new-card-rating-sold-row">
            <div className="new-card-rating">
              <span className="star-gold">★</span>
              <span className="rating-value">{product.rating ? product.rating.toFixed(1) : "0.0"}</span>
              <span className="reviews-count">({product.reviewsCount || 0})</span>
            </div>
            {product.sold !== undefined ? (
              <span className="new-card-sold">Đã bán {product.sold}</span>
            ) : null}
          </div>
        </div>

        <div className="new-card-price-cart-row">
          <div className="new-card-price-col">
            <span className="new-card-price" style={promo ? { color: '#dc2626' } : {}}>
              {discountedPrice.toLocaleString("vi-VN")}đ
            </span>
            {promo ? (
              <span className="new-card-old-price">
                {product.price.toLocaleString("vi-VN")}đ
              </span>
            ) : product.oldPrice ? (
              <span className="new-card-old-price">
                {product.oldPrice.toLocaleString("vi-VN")}đ
              </span>
            ) : null}
          </div>

          <button
            className="new-card-add-cart-btn"
            aria-label="Thêm vào giỏ hàng"
            onClick={handleCartClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              <line x1="12" y1="10" x2="16" y2="10"></line>
              <line x1="14" y1="8" x2="14" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
