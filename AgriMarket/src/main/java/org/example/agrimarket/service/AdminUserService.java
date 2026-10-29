package org.example.agrimarket.service;

import org.example.agrimarket.model.Admin;
import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.CustomerAddress;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.repository.AdminRepository;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class AdminUserService {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Cacheable(value = "admin_all_users")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllUsersList() {
        List<Map<String, Object>> userList = new ArrayList<>();

        // Fetch admins
        for (Admin a : adminRepository.findAll()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("fullName", a.getFullName());
            map.put("email", a.getEmail());
            map.put("phone", "");
            map.put("role", "admin");
            map.put("status", "active");
            map.put("avatarUrl", a.getAvatarUrl());
            map.put("createdAt", a.getCreatedAt());
            map.put("address", "");
            userList.add(map);
        }

        // Fetch customers
        for (Customer c : customerRepository.findAll()) {
            if (farmerRepository.findByEmail(c.getEmail()).isPresent()) {
                continue; // Skip customer record, display as farmer with role="farmer"
            }
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("fullName", c.getFullName());
            map.put("email", c.getEmail());
            map.put("phone", c.getPhone());
            map.put("role", "customer");
            map.put("status", c.getStatus() != null ? c.getStatus() : "active");
            map.put("avatarUrl", c.getAvatarUrl());
            map.put("createdAt", c.getCreatedAt());

            String address = "";
            if (c.getAddresses() != null && !c.getAddresses().isEmpty()) {
                address = c.getAddresses().stream()
                        .filter(addr -> addr.getIsDefault() != null && addr.getIsDefault())
                        .map(CustomerAddress::getAddress)
                        .findFirst()
                        .orElse(c.getAddresses().get(0).getAddress());
            }
            map.put("address", address);

            userList.add(map);
        }

        // Fetch farmers
        for (Farmer f : farmerRepository.findAll()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", f.getId());
            map.put("fullName", f.getFullName());
            map.put("email", f.getEmail());
            map.put("phone", f.getPhone());
            map.put("role", "farmer");
            map.put("status", f.getStatus() != null ? f.getStatus() : "active");
            map.put("avatarUrl", f.getAvatarUrl());
            map.put("createdAt", f.getCreatedAt());
            map.put("farmName", f.getFarmName());
            map.put("farmAddress", f.getFarmAddress());
            map.put("description", f.getDescription());
            map.put("address", f.getFarmAddress() != null ? f.getFarmAddress() : "");
            
            // farm-profile fields
            map.put("identityCard", f.getIdentityCard());
            map.put("businessRegistrationUrl", f.getBusinessRegistrationUrl());
            map.put("vietgapUrl", f.getVietgapUrl());
            map.put("globalgapUrl", f.getGlobalgapUrl());
            map.put("organicUrl", f.getOrganicUrl());
            map.put("maxDeliveryDistance", f.getMaxDeliveryDistance());
            map.put("latitude", f.getLatitude());
            map.put("longitude", f.getLongitude());

            userList.add(map);
        }

        return userList;
    }

    @CacheEvict(value = "admin_all_users", allEntries = true)
    public void clearUserCache() {
        // Evict cache on mutations
    }
}
