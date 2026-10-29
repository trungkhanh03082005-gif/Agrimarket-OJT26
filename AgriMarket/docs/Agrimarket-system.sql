-- ==========================================================
-- CREATE DATABASE
-- ==========================================================
CREATE DATABASE AgriMarketplace;
GO

USE AgriMarketplace;
GO

-- ==========================================================
-- 1. ROLE (Danh mục vai trò)
-- ==========================================================
CREATE TABLE role (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
GO

-- Chèn mặc định các vai trò hệ thống
INSERT INTO role (name) VALUES ('ROLE_CUSTOMER'), ('ROLE_FARMER'), ('ROLE_ADMIN'), ('ROLE_SHIPPER');
GO

-- ==========================================================
-- 2. USERS (Bảng người dùng chung - Unified User)
-- ==========================================================
CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name NVARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    avatar_url NVARCHAR(500),
    status VARCHAR(20) CHECK(status IN ('active','banned','pending')) DEFAULT 'pending',
    user_type VARCHAR(30) NOT NULL, -- Phân biệt thực thể ở mức JPA: 'CUSTOMER', 'FARMER', 'ADMIN', 'SHIPPER'
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME NULL
);
GO

-- ==========================================================
-- 3. ADMIN (Kế thừa từ USERS)
-- ==========================================================
CREATE TABLE admin (
    id BIGINT PRIMARY KEY,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 4. CUSTOMER (Kế thừa từ USERS)
-- ==========================================================
CREATE TABLE customer (
    id BIGINT PRIMARY KEY,
    password_set BIT DEFAULT 1,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 4.1 CUSTOMER ADDRESS (Địa chỉ khách nhận hàng)
-- ==========================================================
CREATE TABLE customer_address (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    receiver_name NVARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address NVARCHAR(1000) NOT NULL,
    is_default BIT DEFAULT 0,
    latitude DECIMAL(9,6) NULL,
    longitude DECIMAL(9,6) NULL,
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 5. FARMER (Kế thừa từ USERS)
-- ==========================================================
CREATE TABLE farmer (
    id BIGINT PRIMARY KEY,
    farm_name NVARCHAR(255) NOT NULL,
    farm_address NVARCHAR(1000) NOT NULL,
    description NVARCHAR(MAX),
    identity_card VARCHAR(50),
    business_registration_url NVARCHAR(1000),
    vietgap_url NVARCHAR(1000),
    globalgap_url NVARCHAR(1000),
    organic_url NVARCHAR(1000),
    verification_status VARCHAR(20) CHECK(verification_status IN ('pending','verified','rejected')) DEFAULT 'pending',
    rating_average DECIMAL(3,2) DEFAULT 0,
    total_products INT DEFAULT 0,
    rejection_reason NVARCHAR(MAX),
    admin_notes NVARCHAR(MAX),
    max_delivery_distance DECIMAL(10,2) NULL,
    latitude DECIMAL(9,6) NULL,
    longitude DECIMAL(9,6) NULL,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 6. PARTNER (Đơn vị vận chuyển - Kế thừa từ USERS)
-- ==========================================================
CREATE TABLE partner (
    id BIGINT PRIMARY KEY,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 7. OTP VERIFICATION
-- ==========================================================
CREATE TABLE otp_verification (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) CHECK(user_type IN ('customer','farmer','admin','partner')),
    otp_code VARCHAR(10) NOT NULL,
    type VARCHAR(30) CHECK(type IN ('register','forgot_password')),
    expired_at DATETIME NOT NULL,
    verified BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================================
-- 8. CATEGORY (Danh mục sản phẩm)
-- ==========================================================
CREATE TABLE category (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    parent_id BIGINT NULL,
    FOREIGN KEY (parent_id) REFERENCES category(id)
);
GO

-- ==========================================================
-- 9. PRODUCT (Sản phẩm nông sản)
-- ==========================================================
CREATE TABLE product (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    farmer_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    price DECIMAL(18,2) NOT NULL CHECK(price >= 0),
    stock_quantity INT DEFAULT 0 CHECK(stock_quantity >= 0),
    unit NVARCHAR(50),
    status VARCHAR(20) CHECK(status IN ('draft','pending','approved','rejected','hidden','sold_out')) DEFAULT 'draft',
    harvest_date DATE,
    expiration_date DATE,
    traceability_image_url NVARCHAR(1000),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME NULL,
    rejection_reason NVARCHAR(MAX),
    admin_notes NVARCHAR(MAX),
    perishability NVARCHAR(50) NULL,
    is_preorder BIT DEFAULT 0,
    FOREIGN KEY (farmer_id) REFERENCES farmer(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category(id)
);
GO

-- ==========================================================
-- 9.1 PRODUCT IMAGE
-- ==========================================================
CREATE TABLE product_image (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    img_url NVARCHAR(1000) NOT NULL,
    is_thumbnail BIT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 9.2 PRODUCT DISCOUNT
-- ==========================================================
CREATE TABLE product_discount (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    discount_percent DECIMAL(5,2) CHECK(discount_percent >= 0 AND discount_percent <= 100),
    start_date DATETIME,
    end_date DATETIME,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 9.3 PRODUCT VIEW HISTORY
-- ==========================================================
CREATE TABLE product_view_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    viewed_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
);
GO

-- ==========================================================
-- 10. CART
-- ==========================================================
CREATE TABLE cart (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================================
-- 10.1 CART ITEM
-- ==========================================================
CREATE TABLE cart_item (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    cart_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL CHECK(quantity > 0),
    checked BIT DEFAULT 1,
    UNIQUE(cart_id, product_id),
    FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 11. WISHLIST
-- ==========================================================
CREATE TABLE wishlist (
    customer_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY(customer_id, product_id),
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE NO ACTION,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 12. ORDER GROUP (Đơn hàng cha / Transaction)
-- ==========================================================
CREATE TABLE order_group (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    group_code VARCHAR(100) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL,
    total_subtotal DECIMAL(18,2) NOT NULL CHECK(total_subtotal >= 0),
    total_shipping_fee DECIMAL(18,2) NOT NULL CHECK(total_shipping_fee >= 0),
    total_service_fee DECIMAL(18,2) NOT NULL CHECK(total_service_fee >= 0),
    total_discount DECIMAL(18,2) NOT NULL CHECK(total_discount >= 0),
    grand_total DECIMAL(18,2) NOT NULL CHECK(grand_total >= 0),
    recipient_name NVARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    delivery_address NVARCHAR(1000) NOT NULL,
    payment_method NVARCHAR(100) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer(id)
);
GO

-- ==========================================================
-- 13. ORDERS (Đơn hàng con - Sub-Order)
-- ==========================================================
CREATE TABLE orders (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_code VARCHAR(100) UNIQUE NOT NULL,
    order_group_id BIGINT NOT NULL,
    farmer_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    shipping_note NVARCHAR(1000),
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    status VARCHAR(20) DEFAULT 'pending',
    subtotal DECIMAL(18,2) NOT NULL CHECK(subtotal >= 0),
    shipping_fee DECIMAL(18,2) NOT NULL CHECK(shipping_fee >= 0),
    service_fee DECIMAL(18,2) NOT NULL CHECK(service_fee >= 0),
    discount DECIMAL(18,2) NOT NULL CHECK(discount >= 0),
    amount DECIMAL(18,2) NOT NULL CHECK(amount >= 0),
    tracking_number VARCHAR(100),
    cancel_reason NVARCHAR(1000),
    cancel_by VARCHAR(50),
    cancelled_at DATETIME,
    partner_id BIGINT NULL,
    shipper_notes NVARCHAR(1000),
    pod_photo NVARCHAR(MAX),
    detailed_status VARCHAR(50),
    driver_name NVARCHAR(255),
    driver_code VARCHAR(100),
    driver_phone VARCHAR(50),
    vehicle_type VARCHAR(100),
    license_plate VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME NULL,

    FOREIGN KEY (order_group_id) REFERENCES order_group(id) ON DELETE CASCADE,
    FOREIGN KEY (farmer_id) REFERENCES farmer(id),
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (partner_id) REFERENCES partner(id)
);
GO

-- ==========================================================
-- 13.1 ORDER ITEM (Chi tiết đơn hàng con)
-- ==========================================================
CREATE TABLE order_item (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    farmer_id BIGINT NOT NULL,
    product_name NVARCHAR(255) NOT NULL,
    product_price DECIMAL(18,2) NOT NULL CHECK(product_price >= 0),
    product_unit NVARCHAR(255),
    image_url NVARCHAR(1000),
    quantity INT NOT NULL CHECK(quantity > 0),

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id),
    FOREIGN KEY (farmer_id) REFERENCES farmer(id)
);
GO

-- ==========================================================
-- 14. PAYMENT
-- ==========================================================
CREATE TABLE payment (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_group_id BIGINT NOT NULL,
    payment_method NVARCHAR(100),
    transaction_code VARCHAR(255),
    amount DECIMAL(18,2) CHECK(amount >= 0),
    status VARCHAR(50),
    paid_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (order_group_id) REFERENCES order_group(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 15. VOUCHER
-- ==========================================================
CREATE TABLE voucher (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_percent DECIMAL(5,2) CHECK(discount_percent >= 0 AND discount_percent <= 100),
    max_discount DECIMAL(18,2) CHECK(max_discount >= 0),
    quantity INT CHECK(quantity >= 0),
    expired_at DATETIME
);
GO

-- ==========================================================
-- 15.1 VOUCHER USAGE
-- ==========================================================
CREATE TABLE voucher_usage (
    voucher_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    used_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY(voucher_id, customer_id),
    FOREIGN KEY (voucher_id) REFERENCES voucher(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 17. PRODUCT REVIEW
-- ==========================================================
CREATE TABLE product_review (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    rating INT CHECK(rating BETWEEN 1 AND 5),
    comment NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(order_id, product_id, customer_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id),
    FOREIGN KEY (customer_id) REFERENCES customer(id)
);
GO


-- ==========================================================
-- 19. PREORDER
-- ==========================================================
CREATE TABLE preorder (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    status VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 19.1 PREORDER ITEM
-- ==========================================================
CREATE TABLE preorder_item (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    preorder_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT CHECK(quantity > 0),
    expected_harvest_date DATE,
    FOREIGN KEY (preorder_id) REFERENCES preorder(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
);
GO

-- ==========================================================
-- 20. CONVERSATION (Chat giữa khách hàng và nhà vườn)
-- ==========================================================
CREATE TABLE conversation (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    farmer_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    UNIQUE(customer_id, farmer_id),
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (farmer_id) REFERENCES farmer(id)
);
GO

-- ==========================================================
-- 20.1 MESSAGE (Tin nhắn chi tiết - Trỏ trực tiếp tới bảng users)
-- ==========================================================
CREATE TABLE message (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL, -- Khóa ngoại trực tiếp tới bảng users (Khắc phục lỗi đa hình)
    message NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
GO

-- ==========================================================
-- 21. LIVESTREAM
-- ==========================================================
CREATE TABLE livestream (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    farmer_id BIGINT NOT NULL,
    title NVARCHAR(255),
    description NVARCHAR(MAX),
    start_time DATETIME,
    status NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (farmer_id) REFERENCES farmer(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 21.1 LIVESTREAM PRODUCT (Ghim sản phẩm trong live)
-- ==========================================================
CREATE TABLE livestream_product (
    livestream_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    PRIMARY KEY(livestream_id, product_id),
    FOREIGN KEY (livestream_id) REFERENCES livestream(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
);
GO

-- ==========================================================
-- 21.2 LIVESTREAM COMMENT
-- ==========================================================
CREATE TABLE livestream_comment (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    livestream_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL, -- Khóa ngoại trực tiếp tới bảng users (Khắc phục lỗi đa hình)
    comment NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (livestream_id) REFERENCES livestream(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
GO

-- ==========================================================
-- 22. SUPPORT REQUEST (Yêu cầu hỗ trợ gửi lên Admin)
-- ==========================================================
CREATE TABLE support_request (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sender_id BIGINT NOT NULL, -- Khóa ngoại trực tiếp tới bảng users (Khắc phục lỗi đa hình)
    title NVARCHAR(255),
    description NVARCHAR(MAX),
    status NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
GO

-- ==========================================================
-- 23. NOTIFICATION (Thông báo hệ thống)
-- ==========================================================
CREATE TABLE notification (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    receiver_type VARCHAR(20) NOT NULL CHECK(receiver_type IN ('customer','farmer')),
    receiver_id BIGINT NOT NULL,
    title NVARCHAR(255),
    content NVARCHAR(MAX),
    is_read BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 24. REPORT (Báo cáo vi phạm)
-- ==========================================================
CREATE TABLE report (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    reporter_id BIGINT NOT NULL, -- Khóa ngoại trực tiếp tới bảng users (Khắc phục lỗi đa hình)
    target_type VARCHAR(20) CHECK(target_type IN ('customer','farmer','product')),
    target_id BIGINT NOT NULL,
    reason NVARCHAR(255),
    description NVARCHAR(MAX),
    status NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (reporter_id) REFERENCES users(id)
);
GO

-- ==========================================================
-- 25. FARMER FOLLOW
-- ==========================================================
CREATE TABLE farmer_follow (
    customer_id BIGINT NOT NULL,
    farmer_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY(customer_id, farmer_id),
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (farmer_id) REFERENCES farmer(id)
);
GO

-- ==========================================================
-- 26. AI CONVERSATION
-- ==========================================================
CREATE TABLE AI_conversation (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    title NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 26.1 AI MESSAGE
-- ==========================================================
CREATE TABLE AI_message (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_type VARCHAR(20) CHECK(sender_type IN ('user','AI')),
    message NVARCHAR(MAX),
    send_time DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (conversation_id) REFERENCES AI_conversation(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 27. AI PRODUCT DESCRIPTION HISTORY
-- ==========================================================
CREATE TABLE AI_product_description_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    farmer_id BIGINT NOT NULL,
    product_id BIGINT NULL,
    product_name NVARCHAR(255),
    input_prompt NVARCHAR(MAX),
    generated_description NVARCHAR(MAX),
    generated_keywords NVARCHAR(MAX),
    generated_hashtags NVARCHAR(MAX),
    language VARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (farmer_id) REFERENCES farmer(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
);
GO

-- ==========================================================
-- 28. AI PRICE SUGGESTION
-- ==========================================================
CREATE TABLE AI_price_suggestion (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    farmer_id BIGINT NOT NULL,
    product_id BIGINT NULL,
    product_name NVARCHAR(255),
    input_cost_price DECIMAL(18,2) CHECK(input_cost_price >= 0),
    market_average_price DECIMAL(18,2) CHECK(market_average_price >= 0),
    suggested_price DECIMAL(18,2) CHECK(suggested_price >= 0),
    min_price DECIMAL(18,2) CHECK(min_price >= 0),
    max_price DECIMAL(18,2) CHECK(max_price >= 0),
    ai_reason NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (farmer_id) REFERENCES farmer(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
);
GO

-- ==========================================================
-- 29. AI RECOMMENDATION
-- ==========================================================
CREATE TABLE AI_recommendation (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    recommendation_score DECIMAL(5,2),
    reason NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id)
);
GO

-- ==========================================================
-- 30. AI SEARCH HISTORY
-- ==========================================================
CREATE TABLE AI_search_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    prompt NVARCHAR(MAX),
    ai_response NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- 31. AI CONTENT MODERATION
-- ==========================================================
CREATE TABLE AI_content_moderation (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    is_safe BIT DEFAULT 1,
    flagged_reason NVARCHAR(MAX),
    checked_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
GO

-- ==========================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==========================================================
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_product_farmer ON product(farmer_id);
CREATE INDEX IX_product_category ON product(category_id);
CREATE INDEX IX_product_status ON product(status);
CREATE INDEX IX_orders_order_group ON orders(order_group_id);
CREATE INDEX IX_orders_farmer ON orders(farmer_id);
CREATE INDEX IX_orders_customer ON orders(customer_id);
CREATE INDEX IX_orders_status ON orders(status);
CREATE INDEX IX_orders_created_at ON orders(created_at);
CREATE INDEX IX_order_item_order ON order_item(order_id);
GO