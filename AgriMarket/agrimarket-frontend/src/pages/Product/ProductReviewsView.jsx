// src/pages/Product/ProductReviewsView.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import authService from "../../services/authService";
import cartService from "../../services/cartService";
import { getProductById } from "../../services/productService";
import reviewService from "../../services/reviewService";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import "./ProductReviewsView.css";

/*
  Trang này dùng để XEM đánh giá sản phẩm.
  Không dùng để viết đánh giá sau khi mua hàng.

  ProductReview.jsx trong src/pages/Orders/ vẫn giữ nguyên:
  - Dùng cho customer đánh giá sản phẩm đã mua và đã giao.
  - Route dạng: /profile/orders/:orderId/review/:itemIndex

  ProductReviews.jsx này dùng cho mọi người xem review:
  - Route gợi ý: /products/:id/reviews
*/

const MOCK_PRODUCT = {
    id: "mock-1",
    name: "Cà chua Roma hữu cơ",
    price: 45000,
    unit: "500g",
    imageUrl:
        "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
    rating: 4.8,
    reviewsCount: 124,
};

const MOCK_REVIEWS = [
    {
        id: 1,
        author: "Nguyễn Minh Anh",
        avatarText: "MA",
        rating: 5,
        date: "12/10/2026",
        title: "Hương vị rất ngon, rất phù hợp để làm sốt",
        comment:
            "Cà chua rất tươi, màu đẹp, vị ngọt tự nhiên và đóng gói cẩn thận. Mình dùng để nấu sốt mì Ý, thành phẩm rất thơm và đậm vị. Sẽ tiếp tục đặt lại nếu chất lượng ổn định như lần này.",
        images: [
            "https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=300&auto=format&fit=crop&q=80",
        ],
        helpful: 24,
        notHelpful: 1,
        tags: ["Sản phẩm tươi", "Đóng gói tốt", "Đúng mô tả"],
        specificRatings: { quality: 5, freshness: 5, packaging: 5, delivery: 5 },
    },
    {
        id: 2,
        author: "Trần Quốc Huy",
        avatarText: "QH",
        rating: 4,
        date: "08/10/2026",
        title: "Chất lượng tốt, có vài quả hơi mềm",
        comment:
            "Sản phẩm nhìn chung ổn, vị ngon hơn cà chua mua ở siêu thị. Tuy nhiên trong hộp có một vài quả hơi mềm do vận chuyển. Nhà vườn đóng gói khá kỹ, giao hàng đúng thời gian.",
        images: [],
        helpful: 8,
        notHelpful: 0,
        tags: ["Sản phẩm tươi", "Giá hợp lý", "Nhà vườn nhiệt tình"],
        specificRatings: { quality: 4, freshness: 4, packaging: 3, delivery: 5 },
    },
    {
        id: 3,
        author: "Lê Thanh Mai",
        avatarText: "TM",
        rating: 5,
        date: "01/10/2026",
        title: "Nông sản tươi, đóng gói rất cẩn thận",
        comment:
            "Cảm nhận được sự khác biệt so với hàng mua ngoài chợ. Quả chắc, vỏ đẹp, không bị dập nát. Rất phù hợp cho gia đình có trẻ nhỏ hoặc người thích thực phẩm sạch.",
        images: [],
        helpful: 15,
        notHelpful: 2,
        tags: ["Sản phẩm tươi", "Đóng gói tốt", "Đúng mô tả"],
        specificRatings: { quality: 5, freshness: 5, packaging: 5, delivery: 5 },
    },
    {
        id: 4,
        author: "Phạm Ngọc Linh",
        avatarText: "NL",
        rating: 5,
        date: "28/09/2026",
        title: "Rất hài lòng",
        comment:
            "Cà chua tươi, đúng mô tả, vị ngọt nhẹ. Mình thích nhất là phần đóng gói sạch và nhìn chuyên nghiệp.",
        images: [
            "https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=300&auto=format&fit=crop&q=80",
        ],
        helpful: 11,
        notHelpful: 0,
        tags: ["Sản phẩm tươi", "Đóng gói tốt", "Đúng mô tả"],
        specificRatings: { quality: 5, freshness: 5, packaging: 5, delivery: 5 },
    },
];

const StarDisplay = ({ rating = 0 }) => {
    return (
        <div className="prv-stars">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={star <= Math.round(rating) ? "filled" : ""}
                >
                    ★
                </span>
            ))}
        </div>
    );
};

export default function ProductReviewsView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [cartItemsCount, setCartItemsCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("all");
    const [sortType, setSortType] = useState("recent");
    const [currentPage, setCurrentPage] = useState(1);
    const [toastMessage, setToastMessage] = useState("");

    const reviewsPerPage = 3;

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        const loadCartCount = async () => {
            if (currentUser) {
                try {
                    const cart = await cartService.getCart();
                    setCartItemsCount(cart.length);
                } catch (err) {
                    const localCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
                    setCartItemsCount(localCart.length);
                }
            } else {
                const localCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
                setCartItemsCount(localCart.length);
            }
        };

        loadCartCount();
    }, []);

    useEffect(() => {
        const loadProductReviewsView = async () => {
            setLoading(true);

            try {
                /*
                  TODO BACKEND:
                  Sau này khi backend có API review, thay đoạn mock bên dưới bằng API thật.
        
                  Gợi ý API:
                  GET /api/products/{productId}
                  GET /api/products/{productId}/reviews
        
                  Backend nên trả về:
                  - productId
                  - productName
                  - imageUrl
                  - price
                  - unit
                  - averageRating
                  - reviewsCount
                  - reviews: [
                      {
                        id,
                        customerName,
                        rating,
                        title,
                        comment,
                        images,
                        createdAt,
                        helpfulCount,
                        notHelpfulCount
                      }
                    ]
        
                  Sau khi có backend, có thể xóa MOCK_PRODUCT và MOCK_REVIEWS.
                */

                const productData = await getProductById(id);

                setProduct({
                    id: productData.id,
                    name: productData.name,
                    price: productData.price,
                    unit: productData.unit,
                    imageUrl: productData.imageUrl || productData.images?.[0],
                    rating: (productData.rating !== undefined && productData.rating !== null) ? Number(productData.rating) : 0,
                    reviewsCount: (productData.reviewsCount !== undefined && productData.reviewsCount !== null) ? Number(productData.reviewsCount) : 0,
                    farmerOrganicUrl: productData.farmerOrganicUrl,
                });

                const reviewsData = await reviewService.getReviewsByProductId(id);
                setReviews(reviewsData);
            } catch (err) {
                console.error("Lỗi khi tải dữ liệu đánh giá sản phẩm:", err);
                setProduct(MOCK_PRODUCT);
                setReviews([]);
            } finally {
                setLoading(false);
            }
        };

        loadProductReviewsView();
    }, [id]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter, sortType]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat("vi-VN").format(Number(price || 0)) + " đ";
    };

    const triggerToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(""), 2500);
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        navigate("/");
    };

    const handleAddToCart = async () => {
        if (!product) return;

        try {
            triggerToast("Đã thêm sản phẩm vào giỏ hàng!");
            if (user) {
                const cart = await cartService.addToCart(product.id, 1);
                setCartItemsCount(cart.length);
            } else {
                const cartKey = "agrimarket_cart";
                const currentCart = JSON.parse(localStorage.getItem(cartKey)) || [];
                const existingIndex = currentCart.findIndex(
                    (item) => String(item.id) === String(product.id)
                );

                if (existingIndex >= 0) {
                    const newQty = currentCart[existingIndex].quantity + 1;
                    if (product.stock !== undefined && newQty > product.stock) {
                        triggerToast(`Không thể thêm số lượng vượt quá tồn kho hiện có (${product.stock}).`);
                        return;
                    }
                    currentCart[existingIndex].quantity = newQty;
                } else {
                    if (product.stock !== undefined && 1 > product.stock) {
                        triggerToast(`Không thể thêm số lượng vượt quá tồn kho hiện có (${product.stock}).`);
                        return;
                    }
                    currentCart.push({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        unit: product.unit,
                        imageUrl: product.imageUrl,
                        quantity: 1,
                        checked: true,
                        stockQuantity: product.stock,
                        farmerId: product.farmerId,
                        farmerName: product.farmerName
                    });
                }

                localStorage.setItem(cartKey, JSON.stringify(currentCart));
                setCartItemsCount(currentCart.length);
            }
        } catch (err) {
            console.error("Lỗi khi thêm vào giỏ hàng:", err);
            triggerToast("Không thể thêm vào giỏ hàng. Vui lòng thử lại.");
        }
    };

    const ratingStats = useMemo(() => {
        const total = reviews.length || 1;

        return [5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((review) => review.rating === star).length;
            const percent = Math.round((count / total) * 100);

            return {
                star,
                count,
                percent,
            };
        });
    }, [reviews]);

    const filteredReviews = useMemo(() => {
        let result = [...reviews];

        if (activeFilter === "photos") {
            result = result.filter((review) => review.images && review.images.length > 0);
        }

        if (sortType === "highest") {
            result.sort((a, b) => b.rating - a.rating);
        }

        if (sortType === "lowest") {
            result.sort((a, b) => a.rating - b.rating);
        }

        if (sortType === "recent") {
            result.sort((a, b) => b.id - a.id);
        }

        return result;
    }, [reviews, activeFilter, sortType]);

    const totalPages = Math.max(1, Math.ceil(filteredReviews.length / reviewsPerPage));

    const paginatedReviews = useMemo(() => {
        const startIndex = (currentPage - 1) * reviewsPerPage;
        return filteredReviews.slice(startIndex, startIndex + reviewsPerPage);
    }, [filteredReviews, currentPage]);

    if (loading) {
        return (
            <div className="product-reviews-page">
                <div className="prv-loading">
                    <div className="prv-spinner" />
                    <p>Đang tải đánh giá sản phẩm...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="product-reviews-page">
                <div className="prv-empty-page">
                    <h2>Không tìm thấy sản phẩm</h2>
                    <p>Sản phẩm này không tồn tại hoặc đã bị ẩn.</p>
                    <Link to="/shop">Quay lại cửa hàng</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="product-reviews-page">
            <Header />

            <main className="prv-main">
                <button
                    className="prv-back-link"
                    onClick={() => navigate(`/products/${product.id}`)}
                >
                    ← Quay lại chi tiết sản phẩm
                </button>

                <div className="prv-layout">
                    {/* LEFT PRODUCT CARD */}
                    <aside className="prv-product-card">
                        <div className="prv-product-image-box">
                            {product.farmerOrganicUrl && <span className="prv-organic-badge">Hữu cơ</span>}
                            <img src={product.imageUrl} alt={product.name} />
                        </div>

                        <div className="prv-product-info">
                            <h1>{product.name}</h1>
                            <p className="prv-price">
                                {formatPrice(product.price)}
                                <span> / {product.unit || "sản phẩm"}</span>
                            </p>

                            <div className="prv-product-rating">
                                <StarDisplay rating={product.rating} />
                                <span>
                                    {Number(product.rating || 0).toFixed(1)} ({product.reviewsCount || reviews.length} đánh giá)
                                </span>
                            </div>

                            <button className="prv-add-cart-btn" onClick={handleAddToCart}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                    <line x1="12" y1="10" x2="16" y2="10"></line>
                                    <line x1="14" y1="8" x2="14" y2="12"></line>
                                </svg>
                                Thêm vào giỏ hàng
                            </button>
                        </div>
                    </aside>

                    {/* RIGHT REVIEW CONTENT */}
                    <section className="prv-review-content">
                        <div className="prv-summary-card">
                            <div className="prv-score-box">
                                <strong>{Number(product.rating || 0).toFixed(1)}</strong>
                                <StarDisplay rating={product.rating} />
                                <span>Dựa trên {product.reviewsCount || reviews.length} đánh giá</span>
                            </div>

                            <div className="prv-rating-bars">
                                {ratingStats.map((stat) => (
                                    <div className="prv-rating-row" key={stat.star}>
                                        <span>{stat.star} sao</span>
                                        <div className="prv-bar-track">
                                            <div
                                                className="prv-bar-fill"
                                                style={{ width: `${stat.percent}%` }}
                                            />
                                        </div>
                                        <strong>{stat.percent}%</strong>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="prv-toolbar">
                            <div className="prv-filter-group">
                                <button
                                    className={activeFilter === "all" ? "active" : ""}
                                    onClick={() => setActiveFilter("all")}
                                >
                                    Tất cả đánh giá
                                </button>
                                <button
                                    className={activeFilter === "photos" ? "active" : ""}
                                    onClick={() => setActiveFilter("photos")}
                                >
                                    Có hình ảnh
                                </button>
                            </div>

                            <select
                                className="prv-sort-select"
                                value={sortType}
                                onChange={(e) => setSortType(e.target.value)}
                            >
                                <option value="recent">Mới nhất</option>
                                <option value="highest">Đánh giá cao nhất</option>
                                <option value="lowest">Đánh giá thấp nhất</option>
                            </select>
                        </div>

                        <div className="prv-review-list">
                            {paginatedReviews.length === 0 ? (
                                <div className="prv-no-review">
                                    <h3>Chưa có đánh giá phù hợp</h3>
                                    <p>Hãy thử đổi bộ lọc hoặc quay lại sau.</p>
                                </div>
                            ) : (
                                paginatedReviews.map((review) => (
                                    <article className="prv-review-card" key={review.id}>
                                        <div className="prv-review-header">
                                            <div className="prv-review-author">
                                                <div className="prv-avatar">{review.avatarText}</div>
                                                <div>
                                                    <h3>{review.author}</h3>
                                                    <span>{review.date}</span>
                                                </div>
                                            </div>

                                            <StarDisplay rating={review.rating} />
                                        </div>

                                        {/* Hiển thị tag đánh giá */}
                                        {review.tags && review.tags.length > 0 && (
                                            <div className="prv-review-tags">
                                                {review.tags.map((tag, idx) => (
                                                    <span key={idx} className="prv-tag-badge">✓ {tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Hiển thị đánh giá chi tiết */}
                                        {review.specificRatings && Object.keys(review.specificRatings).length > 0 && (
                                            <div className="prv-specific-ratings">
                                                {Object.entries(review.specificRatings).map(([key, rating]) => {
                                                    if (!rating || rating === 0) return null;
                                                    let label = "";
                                                    switch (key) {
                                                        case "quality":
                                                            label = "Chất lượng";
                                                            break;
                                                        case "freshness":
                                                            label = "Độ tươi ngon";
                                                            break;
                                                        case "packaging":
                                                            label = "Đóng gói";
                                                            break;
                                                        case "delivery":
                                                            label = "Giao hàng";
                                                            break;
                                                        default:
                                                            label = key;
                                                    }
                                                    return (
                                                        <div key={key} className="prv-specific-rating-item">
                                                            <span className="prv-specific-label">{label}:</span>
                                                            <span className="prv-specific-stars prv-stars">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span
                                                                        key={star}
                                                                        className={star <= rating ? "filled" : ""}
                                                                    >
                                                                        ★
                                                                    </span>
                                                                ))}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <h4>{review.title}</h4>
                                        <p>{review.comment}</p>

                                        {review.images && review.images.length > 0 && (
                                            <div className="prv-review-images">
                                                {review.images.map((image, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className="prv-review-image"
                                                        onClick={() => window.open(image, "_blank")}
                                                    >
                                                        <img src={image} alt={`Ảnh đánh giá ${index + 1}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                         <div className="prv-helpful-row">
                                             <span>Đánh giá này có hữu ích không?</span>
                                             <button style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><ThumbsUp size={14} /> {review.helpful}</button>
                                             <button style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><ThumbsDown size={14} /> {review.notHelpful}</button>
                                         </div>
                                    </article>
                                ))
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="prv-pagination">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                >
                                    ‹
                                </button>

                                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                                    (page) => (
                                        <button
                                            key={page}
                                            className={currentPage === page ? "active" : ""}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    )
                                )}

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() =>
                                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                                    }
                                >
                                    ›
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Footer />

            {toastMessage && (
                <div className="prv-toast">
                    <span>✅</span>
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}