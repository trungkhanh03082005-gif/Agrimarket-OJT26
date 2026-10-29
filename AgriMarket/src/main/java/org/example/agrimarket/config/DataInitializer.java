package org.example.agrimarket.config;

import org.example.agrimarket.model.Admin;
import org.example.agrimarket.model.Category;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.repository.AdminRepository;
import org.example.agrimarket.repository.CategoryRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // ========== Ensure default admin account exists ==========
        String adminEmail = "admin@agrimarket.com";
        if (adminRepository.findByEmail(adminEmail).isEmpty()) {
            Admin admin = new Admin();
            admin.setFullName("Administrator");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setCreatedAt(LocalDateTime.now());
            adminRepository.save(admin);
            System.out.println(">>> DataInitializer: Created default admin account: " + adminEmail);
        } else {
            // Always reset password to ensure it's correct
            Admin admin = adminRepository.findByEmail(adminEmail).get();
            admin.setPassword(passwordEncoder.encode("admin123"));
            adminRepository.save(admin);
            System.out.println(">>> DataInitializer: Reset admin password for: " + adminEmail);
        }

        // ========== Ensure the 7 main categories exist ==========
        String[] targetCategories = {
                "Cây lương thực",
                "Rau củ quả",
                "Trái cây",
                "Cây công nghiệp",
                "Chăn nuôi",
                "Giống cây trồng",
                "Nông sản chế biến"
        };

        for (String name : targetCategories) {
            if (!categoryRepository.findByName(name).isPresent()) {
                Category cat = new Category();
                cat.setName(name);
                cat.setDescription("Danh mục nông sản " + name);
                categoryRepository.save(cat);
                System.out.println(">>> DataInitializer: Đã tạo danh mục mới: " + name);
            }
        }
    }
}
