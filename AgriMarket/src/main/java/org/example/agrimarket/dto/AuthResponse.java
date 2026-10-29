package org.example.agrimarket.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AuthResponse {
    private String token;
    private Object user;

    @JsonProperty("isNewUser")
    private boolean isNewUser;

    public AuthResponse() {}

    public AuthResponse(String token, Object user) {
        this.token = token;
        this.user = user;
        this.isNewUser = false;
    }

    public AuthResponse(String token, Object user, boolean isNewUser) {
        this.token = token;
        this.user = user;
        this.isNewUser = isNewUser;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Object getUser() {
        return user;
    }

    public void setUser(Object user) {
        this.user = user;
    }

    public boolean isNewUser() {
        return isNewUser;
    }

    public void setNewUser(boolean newUser) {
        isNewUser = newUser;
    }
}
