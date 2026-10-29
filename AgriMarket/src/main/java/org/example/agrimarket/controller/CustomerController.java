package org.example.agrimarket.controller;

import org.example.agrimarket.model.Customer;
import org.example.agrimarket.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.security.Principal;
import org.example.agrimarket.model.CustomerAddress;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {
    @Autowired
    private CustomerService customerService;

    @PostMapping("/register")
    public ResponseEntity<Customer> register(@RequestBody Customer customer) {
        return ResponseEntity.ok(customerService.register(customer));
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody Map<String, String> loginData) {
        Optional<Customer> customer = customerService.login(loginData.get("email"), loginData.get("password"));
        if (customer.isPresent()) {
            return ResponseEntity.ok("Login successful");
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Tài khoản hoặc mật khẩu không chính xác");
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateProfile(@PathVariable Long id, @RequestBody Customer customer) {
        return ResponseEntity.ok(customerService.updateProfile(id, customer));
    }

    @PostMapping("/addresses")
    public ResponseEntity<?> addAddress(Principal principal, @RequestBody CustomerAddress address) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            CustomerAddress saved = customerService.addAddressByEmail(principal.getName(), address);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
