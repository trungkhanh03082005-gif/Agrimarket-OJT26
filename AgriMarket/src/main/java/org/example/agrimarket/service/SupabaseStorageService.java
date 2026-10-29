package org.example.agrimarket.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.key:}")
    private String supabaseKey;

    @Value("${supabase.bucket:agrimarket}")
    private String bucketName;

    @Value("${storage.local.dir:uploads}")
    private String localStorageDir;

    private final RestTemplate restTemplate;

    public SupabaseStorageService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000); // 3 seconds connect timeout
        factory.setReadTimeout(5000);    // 5 seconds read timeout
        this.restTemplate = new RestTemplate(factory);
    }

    private boolean isSupabaseConfigured() {
        return supabaseUrl != null && !supabaseUrl.trim().isEmpty()
                && supabaseKey != null && !supabaseKey.trim().isEmpty()
                && !supabaseUrl.contains("bwrzbzwbpiczdsuzbbcq"); // ignore old dead project
    }

    /**
     * Uploads file bytes. Tries Supabase Storage first; if unconfigured or fails,
     * seamlessly falls back to saving locally on disk and serving via /uploads/**.
     */
    public String uploadFileBytes(byte[] fileBytes, String originalFileName, String contentType, String folder) {
        String cleanedFolder = folder != null ? folder.trim().replaceAll("^/|/$", "") : "uploads";

        // Generate a unique file name to avoid collisions
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String uniqueFileName = UUID.randomUUID().toString() + extension;
        String filePath = cleanedFolder + "/" + uniqueFileName;

        // 1. Try Supabase Storage if configured and valid
        if (isSupabaseConfigured()) {
            try {
                String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + filePath;

                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Bearer " + supabaseKey);
                headers.set("apikey", supabaseKey);

                if (contentType != null && !contentType.isEmpty()) {
                    headers.setContentType(MediaType.parseMediaType(contentType));
                } else {
                    headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
                }

                HttpEntity<byte[]> entity = new HttpEntity<>(fileBytes, headers);

                log.info("Uploading file to Supabase Storage: {}", uploadUrl);
                ResponseEntity<Map> response = restTemplate.postForEntity(uploadUrl, entity, Map.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    String publicUrl = supabaseUrl + "/storage/v1/object/public/" + bucketName + "/" + filePath;
                    log.info("File uploaded successfully to Supabase Storage: {}", publicUrl);
                    return publicUrl;
                } else {
                    log.warn("Supabase Storage responded with status: {}. Falling back to local storage.", response.getStatusCode());
                }
            } catch (Exception e) {
                log.warn("Supabase Storage upload failed ({}). Falling back to local storage.", e.getMessage());
            }
        }

        // 2. Fallback: Save to local storage
        return saveLocally(fileBytes, uniqueFileName, cleanedFolder);
    }

    /**
     * Saves file bytes to local disk under uploads/{folder}/{fileName} and returns public HTTP URL.
     */
    private String saveLocally(byte[] fileBytes, String fileName, String folder) {
        try {
            Path targetDir = Paths.get(localStorageDir, folder).toAbsolutePath().normalize();
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            Path targetFile = targetDir.resolve(fileName);
            Files.write(targetFile, fileBytes);

            log.info("File saved locally at: {}", targetFile);

            String baseUrl = getBaseUrl();
            String localUrl = baseUrl + "/uploads/" + folder + "/" + fileName;
            log.info("Public local URL: {}", localUrl);
            return localUrl;
        } catch (IOException e) {
            log.error("Failed to save file locally", e);
            throw new RuntimeException("Failed to save file locally: " + e.getMessage(), e);
        }
    }

    /**
     * Detects base URL dynamically from current HTTP request, or defaults to http://localhost:8080.
     */
    private String getBaseUrl() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null && attributes.getRequest() != null) {
                return ServletUriComponentsBuilder.fromRequestUri(attributes.getRequest())
                        .replacePath(null)
                        .replaceQuery(null)
                        .toUriString();
            }
        } catch (Exception ignored) {
        }
        return "http://localhost:8080";
    }

    /**
     * Uploads a MultipartFile to Supabase Storage (with fallback to local storage).
     */
    public String uploadMultipartFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file");
        }
        try {
            return uploadFileBytes(file.getBytes(), file.getOriginalFilename(), file.getContentType(), folder);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file bytes for upload", e);
        }
    }

    /**
     * Deletes a file from Supabase Storage or local storage given its public URL.
     */
    public void deleteFileByUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        // If local storage URL
        if (fileUrl.contains("/uploads/")) {
            try {
                int index = fileUrl.indexOf("/uploads/");
                String relativePath = fileUrl.substring(index + "/uploads/".length());
                Path filePath = Paths.get(localStorageDir).resolve(relativePath).toAbsolutePath().normalize();
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    log.info("File deleted successfully from local storage: {}", filePath);
                }
            } catch (Exception e) {
                log.warn("Failed to delete local file {}: {}", fileUrl, e.getMessage());
            }
            return;
        }

        // If Supabase URL
        if (isSupabaseConfigured()) {
            try {
                String searchPattern = "/storage/v1/object/public/" + bucketName + "/";
                int index = fileUrl.indexOf(searchPattern);
                if (index == -1) {
                    log.warn("URL does not match Supabase Storage public format, skipping delete: {}", fileUrl);
                    return;
                }

                String filePath = fileUrl.substring(index + searchPattern.length());
                String deleteUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + filePath;

                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Bearer " + supabaseKey);
                headers.set("apikey", supabaseKey);

                HttpEntity<Void> entity = new HttpEntity<>(headers);

                log.info("Deleting file from Supabase Storage: {}", deleteUrl);
                ResponseEntity<Map> response = restTemplate.exchange(deleteUrl, HttpMethod.DELETE, entity, Map.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    log.info("File deleted successfully from Supabase Storage: {}", filePath);
                } else {
                    log.warn("Supabase Storage delete request returned status: {}", response.getStatusCode());
                }

            } catch (Exception e) {
                log.error("Failed to delete file from Supabase Storage: {}", fileUrl, e);
            }
        }
    }
}
