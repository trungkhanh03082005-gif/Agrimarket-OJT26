package org.example.agrimarket.service;

import org.example.agrimarket.dto.AuthResponse;
import org.example.agrimarket.dto.RegisterRequest;
import org.example.agrimarket.model.Admin;
import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.model.OtpVerification;
import org.example.agrimarket.repository.AdminRepository;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.example.agrimarket.repository.OtpVerificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
public class AuthService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private AdminRepository adminRepository;



    @Autowired
    private OtpVerificationRepository otpVerificationRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public AuthResponse login(String email, String password, String role) {
        if (email != null) {
            email = email.trim().toLowerCase();
        }

        Object user = null;
        String resolvedRole = null;

        // 1. Try logging in as Admin
        Optional<Admin> adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            user = adminOpt.get();
            resolvedRole = "admin";
        }

        // 2. Try logging in as Customer
        if (user == null) {
            Optional<Customer> customerOpt = customerRepository.findByEmail(email);
            if (customerOpt.isPresent()) {
                // Check if this Customer is also registered as a Farmer
                Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
                if (farmerOpt.isPresent()) {
                    user = farmerOpt.get();
                    resolvedRole = "farmer";
                } else {
                    user = customerOpt.get();
                    resolvedRole = "customer";
                }
            }
        }

        // 3. Fallback for legacy users who are only in Farmer table
        if (user == null) {
            Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
            if (farmerOpt.isPresent()) {
                user = farmerOpt.get();
                resolvedRole = "farmer";
            }
        }

        if (user == null) {
            throw new RuntimeException("Không tìm thấy tài khoản với email này");
        }

        String hashedPassword;
        if ("admin".equals(resolvedRole)) {
            hashedPassword = ((Admin) user).getPassword();
        } else if (user instanceof Farmer) {
            hashedPassword = ((Farmer) user).getPassword();
        } else {
            hashedPassword = ((Customer) user).getPassword();
        }

        System.out.println("DEBUG LOGIN: email=" + email + ", resolvedRole=" + resolvedRole + ", inputPassword=" + password + ", storedHashedPassword=" + hashedPassword);
        if (!passwordEncoder.matches(password, hashedPassword)) {
            System.out.println("DEBUG LOGIN: matches FAILED!");
            throw new RuntimeException("Tài khoản hoặc mật khẩu không chính xác");
        } else {
            System.out.println("DEBUG LOGIN: matches SUCCESS!");
        }

        String token = jwtUtil.generateToken(email, resolvedRole);

        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setUser(user);

        return response;
    }

    public Object register(RegisterRequest request) {

        if (request.getRole() == null || request.getRole().isBlank()) {
            throw new RuntimeException("Vai trò là bắt buộc");
        }

        String email = request.getEmail();
        if (email != null) {
            email = email.trim().toLowerCase();
            request.setEmail(email);
        }
        String otpCode = request.getOtpCode();
        if (otpCode == null || otpCode.isBlank()) {
            throw new RuntimeException("Mã OTP là bắt buộc.");
        }

        OtpVerification otp = otpVerificationRepository
                .findFirstByEmailAndOtpCodeAndTypeOrderByCreatedAtDesc(email, otpCode, "register")
                .orElseThrow(() -> new RuntimeException("Mã OTP không hợp lệ."));

        if (otp.isVerified()) {
            throw new RuntimeException("Mã OTP này đã được sử dụng.");
        }

        if (otp.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã OTP đã hết hạn.");
        }

        otp.setVerified(true);
        otpVerificationRepository.save(otp);

        String role = request.getRole().toLowerCase();

        String hashedPassword = passwordEncoder.encode(request.getPassword());

        String rawPhone = request.getPhoneNumber();
        String normalizedPhone = (rawPhone != null && !rawPhone.trim().isEmpty()) ? rawPhone.trim() : null;

        switch (role) {

            case "customer":

                Customer customer = new Customer();

                customer.setFullName(request.getFullName());
                customer.setEmail(request.getEmail());
                customer.setPhone(normalizedPhone);
                customer.setPassword(hashedPassword);
                customer.setStatus("active");
                customer.setCreatedAt(LocalDateTime.now());

                return customerRepository.save(customer);

            case "farmer":

                Farmer farmer = new Farmer();

                farmer.setFullName(request.getFullName());
                farmer.setEmail(request.getEmail());
                farmer.setPhone(normalizedPhone);
                farmer.setPassword(hashedPassword);
                farmer.setVerificationStatus("pending");
                farmer.setStatus("pending");
                farmer.setCreatedAt(LocalDateTime.now());
                farmer.setFarmName("Farm of " + (request.getFullName() != null ? request.getFullName() : "Farmer"));
                farmer.setFarmAddress("Not updated");

                return farmerRepository.save(farmer);

            case "admin":

                Admin admin = new Admin();

                admin.setFullName(request.getFullName());
                admin.setEmail(request.getEmail());
                admin.setPassword(hashedPassword);
                admin.setCreatedAt(LocalDateTime.now());

                return adminRepository.save(admin);

            default:
                throw new RuntimeException("Vai trò không hợp lệ");
        }
    }

    public AuthResponse googleLogin(String googleAccessToken, String role, String phone, Boolean isRegister) {
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("Authorization", "Bearer " + googleAccessToken);
        org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>("parameters", headers);

        org.springframework.http.ResponseEntity<java.util.Map> responseEntity;
        try {
            responseEntity = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    java.util.Map.class
            );
        } catch (Exception e) {
            throw new RuntimeException("Xác thực token Google thất bại: " + e.getMessage());
        }

        java.util.Map<String, Object> userInfo = responseEntity.getBody();
        if (userInfo == null || !userInfo.containsKey("email")) {
            throw new RuntimeException("Phản hồi token không hợp lệ hoặc không tìm thấy email");
        }

        String email = (String) userInfo.get("email");
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        String name = (String) userInfo.get("name");
        String picture = (String) userInfo.get("picture");

        // Check if the user already exists in the database
        Customer customer = customerRepository.findByEmail(email).orElse(null);
        Farmer farmer = farmerRepository.findByEmail(email).orElse(null);

        boolean userExists = (customer != null || farmer != null);
        if (Boolean.TRUE.equals(isRegister) && userExists) {
            throw new RuntimeException("Tài khoản email này đã được đăng ký trên hệ thống. Vui lòng chuyển sang trang Đăng nhập.");
        }

        Object user = null;
        String resolvedRole = null;

        if (customer != null) {
            if (phone != null && !phone.trim().isEmpty()) {
                customer.setPhone(phone.trim());
                customer = customerRepository.save(customer);
            }
            Optional<Farmer> farmerOpt = farmerRepository.findByEmail(email);
            if (farmerOpt.isPresent()) {
                user = farmerOpt.get();
                resolvedRole = "farmer";
            } else {
                user = customer;
                resolvedRole = "customer";
            }
        } else if (farmer != null) {
            if (phone != null && !phone.trim().isEmpty()) {
                farmer.setPhone(phone.trim());
                farmer = farmerRepository.save(farmer);
            }
            user = farmer;
            resolvedRole = "farmer";
        }

        if (user != null) {
            // User exists, login immediately and return successful auth response
            String token = jwtUtil.generateToken(email, resolvedRole);
            AuthResponse response = new AuthResponse();
            response.setToken(token);
            response.setUser(user);
            response.setNewUser(false);
            return response;
        }

        // New Google User: Auto-register as Customer by default
        customer = new Customer();
        customer.setFullName(name != null ? name : "Google User");
        customer.setEmail(email);
        customer.setAvatarUrl(picture);
        customer.setStatus("active");
        customer.setCreatedAt(LocalDateTime.now());
        // Auto-generate remaining attributes:
        customer.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        customer.setPasswordSet(false);
        if (phone != null && !phone.trim().isEmpty()) {
            customer.setPhone(phone.trim());
        }
        customer = customerRepository.save(customer);

        String token = jwtUtil.generateToken(email, "customer");
        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setUser(customer);
        
        // If role is not provided, it is the initial login check -> mark as newUser to force onboarding/role/phone selection
        if (role == null || role.trim().isEmpty()) {
            response.setNewUser(true);
        } else {
            response.setNewUser(false);
        }
        return response;
    }


    public void sendForgotPasswordOtp(String email) {
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        String userType = null;
        if (customerRepository.findByEmail(email).isPresent()) {
            userType = "customer";
        } else if (farmerRepository.findByEmail(email).isPresent()) {
            userType = "farmer";
        } else if (adminRepository.findByEmail(email).isPresent()) {
            userType = "admin";
        }

        if (userType == null) {
            throw new RuntimeException("Email không tồn tại trong hệ thống.");
        }

        // Generate 6 digit OTP code
        String otpCode = String.format("%06d", new Random().nextInt(999999));

        OtpVerification otpVerification = new OtpVerification();
        otpVerification.setEmail(email);
        otpVerification.setUserType(userType);
        otpVerification.setOtpCode(otpCode);
        otpVerification.setType("forgot_password");
        otpVerification.setExpiredAt(LocalDateTime.now().plusMinutes(5));
        otpVerification.setVerified(false);
        otpVerification.setCreatedAt(LocalDateTime.now());

        otpVerificationRepository.save(otpVerification);

        emailService.sendOtpEmail(email, otpCode, "forgot_password");
    }

    public void sendRegisterOtp(RegisterRequest request) {
        String email = request.getEmail();
        if (email != null) {
            email = email.trim().toLowerCase();
            request.setEmail(email);
        }
        if (customerRepository.findByEmail(email).isPresent() ||
            farmerRepository.findByEmail(email).isPresent() ||
            adminRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Địa chỉ email đã được đăng ký.");
        }

        if (customerRepository.existsByPhone(request.getPhoneNumber()) ||
            farmerRepository.existsByPhone(request.getPhoneNumber())) {
            throw new RuntimeException("Số điện thoại đã được đăng ký.");
        }

        String otpCode = String.format("%06d", new Random().nextInt(999999));

        OtpVerification otpVerification = new OtpVerification();
        otpVerification.setEmail(email);
        otpVerification.setUserType(request.getRole().toLowerCase());
        otpVerification.setOtpCode(otpCode);
        otpVerification.setType("register");
        otpVerification.setExpiredAt(LocalDateTime.now().plusMinutes(5));
        otpVerification.setVerified(false);
        otpVerification.setCreatedAt(LocalDateTime.now());

        otpVerificationRepository.save(otpVerification);

        emailService.sendOtpEmail(email, otpCode, "register");
    }

    public void resetPassword(String email, String otpCode, String newPassword) {
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        OtpVerification otp = otpVerificationRepository
                .findFirstByEmailAndOtpCodeAndTypeOrderByCreatedAtDesc(email, otpCode, "forgot_password")
                .orElseThrow(() -> new RuntimeException("Mã OTP không chính xác."));

        if (otp.isVerified()) {
            throw new RuntimeException("Mã OTP này đã được sử dụng.");
        }

        if (otp.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã OTP đã hết hạn.");
        }

        otp.setVerified(true);
        otpVerificationRepository.save(otp);

        String hashedPassword = passwordEncoder.encode(newPassword);

        if ("customer".equals(otp.getUserType())) {
            Customer customer = customerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản khách hàng"));
            customer.setPassword(hashedPassword);
            customer.setPasswordSet(true);
            customerRepository.save(customer);
        } else if ("farmer".equals(otp.getUserType())) {
            Farmer farmer = farmerRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản nông dân"));
            farmer.setPassword(hashedPassword);
            farmer.setPasswordSet(true);
            farmerRepository.save(farmer);
        } else if ("admin".equals(otp.getUserType())) {
            Admin admin = adminRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản quản trị viên"));
            admin.setPassword(hashedPassword);
            adminRepository.save(admin);
        }
    }
}