package org.example.agrimarket.dto;

public class GoogleLoginRequest {
    private String token;
    private String role; // customer, farmer
    private String phone;
    private Boolean isRegister;

    public GoogleLoginRequest() {}

    public GoogleLoginRequest(String token, String role) {
        this.token = token;
        this.role = role;
    }

    public GoogleLoginRequest(String token, String role, String phone) {
        this.token = token;
        this.role = role;
        this.phone = phone;
    }

    public GoogleLoginRequest(String token, String role, String phone, Boolean isRegister) {
        this.token = token;
        this.role = role;
        this.phone = phone;
        this.isRegister = isRegister;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Boolean getIsRegister() {
        return isRegister;
    }

    public void setIsRegister(Boolean isRegister) {
        this.isRegister = isRegister;
    }
}
