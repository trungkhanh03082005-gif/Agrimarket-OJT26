package org.example.agrimarket.service;

import org.example.agrimarket.model.Customer;
import org.example.agrimarket.model.CustomerAddress;
import org.example.agrimarket.model.Farmer;
import org.example.agrimarket.repository.CustomerRepository;
import org.example.agrimarket.repository.FarmerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class CustomerService {
    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    public Customer register(Customer customer) {
        customer.setPassword(new BCryptPasswordEncoder().encode(customer.getPassword()));
        customer.setCreatedAt(LocalDateTime.now());
        customer.setStatus("pending"); // mặc định chờ duyệt
        return customerRepository.save(customer);
    }

    public Optional<Customer> login(String email, String password) {
        Optional<Customer> customer = customerRepository.findByEmail(email);
        if (customer.isPresent() && new BCryptPasswordEncoder().matches(password, customer.get().getPassword())) {
            return customer;
        }
        return Optional.empty();
    }

    public Optional<Customer> findById(Long id) {
        Optional<Customer> customer = customerRepository.findById(id);
        customer.ifPresent(c -> c.setRole("customer"));
        return customer;
    }

    public Customer updateProfile(Long id, Customer updatedCustomer) {
        Customer customerExisting = null;
        Farmer farmerExisting = null;

        // Try to find Customer by ID
        Optional<Customer> customerOpt = customerRepository.findById(id);
        if (customerOpt.isPresent()) {
            customerExisting = customerOpt.get();
            // Try to find Farmer by email
            farmerExisting = farmerRepository.findByEmail(customerExisting.getEmail()).orElse(null);
        } else {
            // Try to find Farmer by ID
            Optional<Farmer> farmerOpt = farmerRepository.findById(id);
            if (farmerOpt.isPresent()) {
                farmerExisting = farmerOpt.get();
                // Try to find Customer by email
                customerExisting = customerRepository.findByEmail(farmerExisting.getEmail()).orElse(null);
            }
        }

        if (customerExisting == null) {
            throw new RuntimeException("Customer not found");
        }

        String fullName = updatedCustomer.getFullName();
        String phone = updatedCustomer.getPhone();
        String avatarUrl = updatedCustomer.getAvatarUrl();

        // Update Customer
        if (fullName != null) {
            customerExisting.setFullName(fullName);
        }
        if (phone != null) {
            String trimmedPhone = phone.trim();
            customerExisting.setPhone(trimmedPhone.isEmpty() ? null : trimmedPhone);
        }
        if (avatarUrl != null) {
            String newAvatar = avatarUrl;
            String oldAvatar = customerExisting.getAvatarUrl();
            if (!newAvatar.equals(oldAvatar)) {
                deletePhysicalAvatarFile(oldAvatar);
                customerExisting.setAvatarUrl(newAvatar.isEmpty() ? null : newAvatar);
            }
        }

        // Update Farmer if exists
        if (farmerExisting != null) {
            if (fullName != null) {
                farmerExisting.setFullName(fullName);
            }
            if (phone != null) {
                String trimmedPhone = phone.trim();
                farmerExisting.setPhone(trimmedPhone.isEmpty() ? null : trimmedPhone);
            }
            if (avatarUrl != null) {
                farmerExisting.setAvatarUrl(avatarUrl.isEmpty() ? null : avatarUrl);
            }
            farmerRepository.save(farmerExisting);
        }

        // Handle addresses
        if (updatedCustomer.getAddresses() != null) {
            if (customerExisting.getAddresses() == null) {
                customerExisting.setAddresses(new java.util.ArrayList<>());
            }
            if (updatedCustomer.getAddresses().isEmpty()) {
                customerExisting.getAddresses().clear();
            } else {
                CustomerAddress newAddrInput = updatedCustomer.getAddresses().get(0);
                
                String resolvedPhone = newAddrInput.getPhone();
                if (resolvedPhone == null || resolvedPhone.trim().isEmpty()) {
                    resolvedPhone = customerExisting.getPhone();
                }
                if (resolvedPhone == null || resolvedPhone.trim().isEmpty()) {
                    throw new RuntimeException("Số điện thoại là bắt buộc đối với địa chỉ giao hàng.");
                }
                resolvedPhone = resolvedPhone.trim();

                for (CustomerAddress addr : customerExisting.getAddresses()) {
                    addr.setIsDefault(false);
                }

                if (!customerExisting.getAddresses().isEmpty()) {
                    CustomerAddress existingAddr = customerExisting.getAddresses().get(0);
                    existingAddr.setAddress(newAddrInput.getAddress());
                    existingAddr.setReceiverName(newAddrInput.getReceiverName() != null ? newAddrInput.getReceiverName() : customerExisting.getFullName());
                    existingAddr.setPhone(resolvedPhone);
                    existingAddr.setLatitude(newAddrInput.getLatitude());
                    existingAddr.setLongitude(newAddrInput.getLongitude());
                    existingAddr.setIsDefault(true);
                } else {
                    CustomerAddress newAddr = new CustomerAddress();
                    newAddr.setAddress(newAddrInput.getAddress());
                    newAddr.setReceiverName(newAddrInput.getReceiverName() != null ? newAddrInput.getReceiverName() : customerExisting.getFullName());
                    newAddr.setPhone(resolvedPhone);
                    newAddr.setLatitude(newAddrInput.getLatitude());
                    newAddr.setLongitude(newAddrInput.getLongitude());
                    newAddr.setIsDefault(true);
                    newAddr.setCustomer(customerExisting);
                    customerExisting.getAddresses().add(newAddr);
                }
            }
        }

        customerExisting.setRole("customer");
        return customerRepository.save(customerExisting);
    }

    public CustomerAddress addAddressByEmail(String email, CustomerAddress newAddrInput) {
        Customer existing = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        if (existing.getAddresses() == null) {
            existing.setAddresses(new java.util.ArrayList<>());
        }

        String newAddrStr = newAddrInput.getAddress().trim();
        Optional<CustomerAddress> duplicate = existing.getAddresses().stream()
                .filter(a -> a.getAddress().trim().equalsIgnoreCase(newAddrStr))
                .findFirst();

        if (duplicate.isPresent()) {
            CustomerAddress existingDuplicate = duplicate.get();
            existingDuplicate.setReceiverName(newAddrInput.getReceiverName() != null ? newAddrInput.getReceiverName().trim() : existing.getFullName());
            existingDuplicate.setPhone(newAddrInput.getPhone() != null ? newAddrInput.getPhone().trim() : existing.getPhone());
            existingDuplicate.setLatitude(newAddrInput.getLatitude());
            existingDuplicate.setLongitude(newAddrInput.getLongitude());
            if (Boolean.TRUE.equals(newAddrInput.getIsDefault())) {
                for (CustomerAddress addr : existing.getAddresses()) {
                    addr.setIsDefault(false);
                }
                existingDuplicate.setIsDefault(true);
            }
            customerRepository.save(existing);
            return existingDuplicate;
        }

        if (Boolean.TRUE.equals(newAddrInput.getIsDefault())) {
            for (CustomerAddress addr : existing.getAddresses()) {
                addr.setIsDefault(false);
            }
        } else if (existing.getAddresses().isEmpty()) {
            newAddrInput.setIsDefault(true);
        } else {
            newAddrInput.setIsDefault(false);
        }

        CustomerAddress newAddr = new CustomerAddress();
        newAddr.setAddress(newAddrStr);
        newAddr.setReceiverName(newAddrInput.getReceiverName() != null ? newAddrInput.getReceiverName().trim() : existing.getFullName());
        newAddr.setPhone(newAddrInput.getPhone() != null ? newAddrInput.getPhone().trim() : existing.getPhone());
        newAddr.setLatitude(newAddrInput.getLatitude());
        newAddr.setLongitude(newAddrInput.getLongitude());
        newAddr.setIsDefault(newAddrInput.getIsDefault());
        newAddr.setCustomer(existing);
        
        existing.getAddresses().add(newAddr);
        customerRepository.save(existing);

        return existing.getAddresses().stream()
                .filter(a -> a.getAddress().trim().equalsIgnoreCase(newAddrStr))
                .findFirst()
                .orElse(newAddr);
    }

    private void deletePhysicalAvatarFile(String avatarUrl) {
        if (avatarUrl != null && !avatarUrl.isEmpty() && avatarUrl.contains("/storage/v1/object/public/")) {
            supabaseStorageService.deleteFileByUrl(avatarUrl);
        }
    }
}
