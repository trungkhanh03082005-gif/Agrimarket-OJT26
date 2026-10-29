package org.example.agrimarket.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import org.example.agrimarket.service.SupabaseStorageService;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam(value = "avatar", required = false) MultipartFile avatar,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        MultipartFile uploadFile = avatar != null ? avatar : file;
        if (uploadFile == null || uploadFile.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            String fileUrl = supabaseStorageService.uploadMultipartFile(uploadFile, "avatars");
            return ResponseEntity.ok(Map.of("avatarUrl", fileUrl));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload image: " + e.getMessage());
        }
    }

    @PostMapping("/file")
    public ResponseEntity<?> uploadFile(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "document", required = false) MultipartFile document) {
        MultipartFile uploadFile = file != null ? file : document;
        if (uploadFile == null || uploadFile.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            String fileUrl = supabaseStorageService.uploadMultipartFile(uploadFile, "documents");
            return ResponseEntity.ok(Map.of("fileUrl", fileUrl));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload file: " + e.getMessage());
        }
    }

    @PostMapping("/promotion")
    public ResponseEntity<?> uploadPromotionImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            String fileUrl = supabaseStorageService.uploadMultipartFile(file, "promotions");
            return ResponseEntity.ok(Map.of("fileUrl", fileUrl));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload promotion image: " + e.getMessage());
        }
    }
}

