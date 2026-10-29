# AgriMarket 🌾

**AgriMarket** is a modern e-commerce platform designed to bridge the gap between **Growers/Farmers (Nông dân/Nhà vườn)** and **Customers (Khách hàng)**. By eliminating intermediate traders and middlemen, AgriMarket optimizes final prices for buyers while increasing direct profit margins for farmers. 

The system features advanced integrations, including Google Gemini AI for agricultural description generation and price suggestions, OSRM road distance routing to limit fresh product delivery ranges, VNPay for secure payments, Agora RTC for live-stream selling, and Giao Hàng Nhanh (GHN) API integration for simulated automated shipping operations.

---

## 🚀 Key Features

### 1. General & Authentications
- **Stateless Authentication**: Protected REST APIs using JWT tokens stored securely on the frontend (`localStorage`).
- **Google OAuth2**: Single sign-on with Google Identity Services.
- **Support Requests & Violation Reports**: Direct ticket submitting to system administrators for dispute or feedback resolution.

### 2. For Customers (Buyers)
- **Dynamic Search & Filtering**: Multi-faceted product search by categories, prices, farmer ratings, and freshness.
- **Shopping Cart & Checkout**: Add/remove products and place split orders across multiple farms.
- **Direct Chat**: Direct messaging with farmers (text, images, locations).
- **Pre-order Harvests**: Place early orders (pre-orders) on upcoming crops with a **20% deposit** model via VNPay.
- **Wishlist & Follows**: Keep track of favorite products and follow specific farm stores for updates and livestreams.

### 3. For Farmers (Sellers)
- **Farm Profile Management**: Showcase agricultural quality certificates (VietGAP, GlobalGAP, Organic).
- **Produce Management**: Register crops, stock details, and mark products as pre-orders (`is_preorder`).
- **AI-Assisted Writing & Pricing**:
  - Automatically write rich Markdown product descriptions using Google Gemini.
  - Query Gemini for suggested price limits based on crop type, certifications, and geography.
- **Order Processing**: Confirm, reject, or prepare incoming orders and pre-orders.
- **Agora Livestream**: Start interactive video streaming sessions and pin products on-screen for instant buyer checkouts.
- **Revenue Dashboard**: Real-time sales statistics and customer reviews history.

### 4. For Administrators (System Admins)
- **Content Moderation**: Approve or reject new grower profiles and products before display.
- **User Management**: Activate or ban profiles violating community terms.
- **System Metrics**: Visual overview of registrations, transaction volume, and platform performance.
- **Voucher Management**: Create system-wide promo codes.

---

## 🛠️ Technology Stack (Tech Stack)

### Backend
- **Core Framework**: Java 21, Spring Boot 3.3.0
- **Security**: Spring Security & Stateless JWT tokens (Passwords hashed via BCrypt)
- **Data Access**: Spring Data JPA & Hibernate
- **Database**: PostgreSQL (Hosted on **Supabase Cloud**)
- **API Documentation**: Springdoc OpenAPI / Swagger (`/swagger-ui/index.html`)
- **Email Dispatcher**: Spring Mail (SMTP) for OTPs and scheduler alerts

### Frontend
- **Framework**: React JS (bootstrapped with Vite)
- **Routing**: React Router Dom v6
- **HTTP Client**: Axios with Response Interceptors for automatic `401 Unauthorized` logouts
- **Maps & GIS**: Leaflet & React Leaflet (displays coordinates for farm addresses and shipping delivery pins)
- **Design System**: Vanilla CSS for flexibility and high performance

### Integrations
- **Google Gemini API**: Uses `gemini-3.1-flash-lite` for content generation and price checking.
- **Agora RTC SDK**: Real-time stream processing for farmer-to-buyer interactive live video.
- **VNPay Sandbox**: Integrated payment gateway for immediate checkouts and pre-order deposits.
- **OSRM (Open Source Routing Machine) & Nominatim**: Address geocoding and real-time driving route distance calculations.
- **Giao Hàng Nhanh (GHN) API**: Delivery scheduling, shipping fee calculations, tracking number generation, and automated delivery simulator.

---

## 📐 Architecture & Core Logic Highlights

### 1. Account Inheritance (JPA Joined Inheritance)
The database structure handles account roles using a single core parent table `users` linked to subclasses through a JPA **JOINED** inheritance strategy:
- `users` (Discriminator: `user_type` = `CUSTOMER`, `FARMER`, or `ADMIN`)
  - `customer` (inherits from `users`)
    - `farmer` (inherits from `customer`)

*Note: Since `Farmer` inherits from `Customer`, a farmer has access to all purchasing features (wishlists, customer addresses, orders) in addition to their farm configurations.*

### 2. Multi-Vendor Split-Order Logic
When a customer purchases items from different growers in a single transaction:
1. The frontend creates a master transaction associated with an `OrderGroup` (linked to a VNPay transaction ID).
2. The backend automatically splits the items into individual sub-orders (`Order`) grouped by `Farmer`.
3. Each farmer only sees and processes the subset of items that belongs to their farm, maintaining merchant privacy.

### 3. Perishability Delivery Range Protection
To protect fresh produce from spoiling during transit, products carry a `perishability` rating which constrains how far away a buyer can live:
- **Very Perishable (rất dễ hư)**: Delivery limit is **15.0 km**.
- **Perishable (dễ hư)**: Delivery limit is **40.0 km**.
- **Medium (trung bình)**: Delivery limit is **85.0 km**.
- **Dry (khô)**: Unrestricted (**999999.0 km**).

*Distance is calculated using real driving distances via OSRM. If OSRM fails, the system falls back to Haversine calculations.*

### 4. Automated Shipping Simulation
Under development configurations (`ghn.simulation.enabled=true`), a background thread (`GhnSimulationScheduler`) scans active orders every 20 seconds, automatically advancing shipping states (`assigned` ➔ `picked_up` ➔ `in_transit` ➔ `delivered`) to simulate driver movements and complete orders with POD (Proof of Delivery) assets.

---

## 📂 Project Structure

### Backend (Spring Boot)
```text
AgriMarket/
├── pom.xml                                   # Maven dependencies
└── src/main/
    ├── java/org/example/agrimarket/
    │   ├── MainApplication.java              # Entry point
    │   ├── config/                           # CORS, VNPay, database seeders
    │   ├── controller/                       # REST controllers (API endpoints)
    │   ├── dto/                              # Request/Response payloads
    │   ├── model/                            # JPA entities (Database tables)
    │   ├── repository/                       # Spring Data repositories
    │   ├── scheduler/                        # Background simulators and notification dispatchers
    │   ├── security/                         # JWT filters and authorization
    │   └── service/                          # Business logic layer (Gemini, OSRM, VNPay, GHN)
    └── resources/
        └── application.properties            # System configuration properties
```

### Frontend (React)
```text
agrimarket-frontend/
├── package.json                              # Node dependencies
├── vite.config.js                            # Vite packaging config
├── index.html                                # HTML root
└── src/
    ├── main.jsx                              # Entry mount
    ├── App.jsx                               # Main application component
    ├── index.css                             # Global styles and design tokens
    ├── components/                           # Reusable UI parts
    ├── services/                             # API clients and routing hooks
    ├── routes/                               # Route path definitions
    └── pages/                                # Views (Home, Checkout, Farmer Dashboard, Admin panel, Chat)
```

---

## ⚙️ Local Setup Instructions

### Prerequisites
- **Java Development Kit (JDK) 21**
- **Node.js (v18+) & npm**
- **Maven**
- **PostgreSQL Database** (e.g., Supabase or Local Instance)

---

### Step 1: Database Setup
1. Create a new, blank PostgreSQL database schema.
2. (Optional) Run the migration scripts located in the `docs` directory:
   - `docs/Agrimarket-system-postgres.sql`
   
   *Note: If you skip running the SQL file, Hibernate's `ddl-auto=update` configuration will automatically generate the database schema upon starting the backend application.*

---

### Step 2: Configure the Backend Properties
Open `AgriMarket/AgriMarket/src/main/resources/application.properties` and update the properties with your environment credentials:

```properties
# Database connection configurations
spring.datasource.url=jdbc:postgresql://<your-db-host>:5432/<your-db-name>
spring.datasource.username=<your-db-username>
spring.datasource.password=<your-db-password>

# Supabase Storage configs (for uploads)
supabase.url=https://<your-supabase-project>.supabase.co
supabase.key=<your-supabase-api-key>
supabase.bucket=<your-bucket-name>

# Google Gemini API Key
gemini.api.key=<your-google-gemini-api-key>

# Mail Server Configurations
spring.mail.username=<your-email>@gmail.com
spring.mail.password=<your-google-app-password>

# Agora RTC configs (for livestreaming)
agora.app-id=<your-agora-app-id>
agora.app-certificate=<your-agora-app-certificate>

# Giao Hàng Nhanh (GHN) API configs
ghn.api.token=<your-ghn-token>
ghn.api.shopid=<your-ghn-shop-id>
ghn.simulation.enabled=true
```

---

### Step 3: Run the Backend
Navigate to the directory containing `pom.xml` (`AgriMarket/AgriMarket`) and run:
```bash
# Clean & install dependencies
mvn clean install

# Launch Spring Boot application
mvn spring-boot:run
```
The server will start on default port `8080`. API docs can be viewed at `http://localhost:8080/swagger-ui/index.html`.

---

### Step 4: Configure & Run the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd AgriMarket/agrimarket-frontend
   ```
2. Create a `.env` file in the frontend root and set the backend URL:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```
3. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```
The frontend will start on default port `5173` or `3000` (check terminal output).

---

### Step 5: Default Login Credentials
Upon launch, a default administrator account is generated automatically by the seeder class:
- **Admin Email**: `admin@agrimarket.com`
- **Admin Password**: `admin123`
