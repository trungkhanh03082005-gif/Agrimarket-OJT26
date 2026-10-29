package org.example.agrimarket.service;

import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DistanceService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Coordinate> geocodeCache = new ConcurrentHashMap<>();
    private static final Coordinate SENTINEL_COORDINATE = new Coordinate(-999.0, -999.0);


    public double calculateDistance(String fromAddress, String toAddress) {
        return calculateDistance(fromAddress, null, null, toAddress, null, null);
    }

    public double calculateDistance(String fromAddress, Double fromLat, Double fromLon, String toAddress, Double toLat, Double toLon) {
        if (fromAddress == null || fromAddress.isBlank() || toAddress == null || toAddress.isBlank()) {
            return 0.0;
        }

        Coordinate fromCoord = (fromLat != null && fromLon != null) ? new Coordinate(fromLat, fromLon) : (geocodeCache.containsKey(fromAddress.trim().toLowerCase()) ? geocodeCache.get(fromAddress.trim().toLowerCase()) : null);
        Coordinate toCoord = (toLat != null && toLon != null) ? new Coordinate(toLat, toLon) : (geocodeCache.containsKey(toAddress.trim().toLowerCase()) ? geocodeCache.get(toAddress.trim().toLowerCase()) : null);

        if (fromCoord == null || toCoord == null || fromCoord == SENTINEL_COORDINATE || toCoord == SENTINEL_COORDINATE) {
            // Instant fast path calculation (0ms)
            return calculateFallbackDistance(fromAddress, toAddress);
        }

        return calculateHaversineDistance(fromCoord, toCoord);
    }

    public double getMaxAllowedDistance(String perishability) {
        if (perishability == null) {
            return 999999.0; // default to dry (unlimited)
        }
        return switch (perishability.toLowerCase()) {
            case "rất dễ hư", "very_perishable", "rat_de_hu" -> 15.0;  // 10-20km (default 15)
            case "dễ hư", "perishable", "de_hu" -> 40.0;              // 30-50km (default 40)
            case "trung bình", "medium", "trung_binh" -> 85.0;       // 70-100km (default 85)
            case "khô", "dry", "kho" -> 999999.0;                     // unlimited
            default -> 999999.0;
        };
    }

    private Coordinate geocodeAddress(String address) {
        if (address == null || address.isBlank()) {
            return null;
        }
        String key = address.trim().toLowerCase();
        if (geocodeCache.containsKey(key)) {
            Coordinate cached = geocodeCache.get(key);
            return cached == SENTINEL_COORDINATE ? null : cached;
        }

        try {
            String query = URLEncoder.encode(address, StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search?q=" + query + "&format=json&limit=1";
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    // Nominatim requires a descriptive User-Agent
                    .header("User-Agent", "AgriMarket-Application/1.0 (contact@agrimarket.com)")
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.isArray() && root.size() > 0) {
                    JsonNode first = root.get(0);
                    double lat = first.get("lat").asDouble();
                    double lon = first.get("lon").asDouble();
                    Coordinate coord = new Coordinate(lat, lon);
                    geocodeCache.put(key, coord);
                    return coord;
                }
            }
        } catch (Exception e) {
            System.err.println("Geocoding failed for address: " + address + ". Error: " + e.getMessage());
        }
        geocodeCache.put(key, SENTINEL_COORDINATE);
        return null;
    }

    private Double getOSRMRouteDistance(Coordinate from, Coordinate to) {
        try {
            String url = String.format(java.util.Locale.US,
                    "http://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=false",
                    from.lon, from.lat, to.lon, to.lat);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "AgriMarket-Application/1.0")
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode routes = root.get("routes");
                if (routes != null && routes.isArray() && routes.size() > 0) {
                    double distanceMeters = routes.get(0).get("distance").asDouble();
                    return distanceMeters / 1000.0; // convert to km
                }
            }
        } catch (Exception e) {
            System.err.println("OSRM routing failed. Error: " + e.getMessage());
        }
        return null;
    }

    private double calculateHaversineDistance(Coordinate c1, Coordinate c2) {
        double R = 6371; // Earth's radius in km
        double dLat = Math.toRadians(c2.lat - c1.lat);
        double dLon = Math.toRadians(c2.lon - c1.lon);
        double lat1 = Math.toRadians(c1.lat);
        double lat2 = Math.toRadians(c2.lat);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private double calculateFallbackDistance(String addr1, String addr2) {
        if (addr1 == null || addr2 == null) return 50.0;
        String a1 = addr1.toLowerCase();
        String a2 = addr2.toLowerCase();
        if (a1.equals(a2) || a1.contains(a2) || a2.contains(a1)) return 5.0;

        String[] provinces = {
            "tiền giang", "bến tre", "vĩnh long", "cần thơ", "hồ chí minh", "sài gòn", "đồng tháp", 
            "long an", "trà vinh", "hà nội", "hải phòng", "đà nẵng", "quảng nam", "lâm đồng", "đắk lắk"
        };
        
        String p1 = null;
        String p2 = null;
        for (String p : provinces) {
            if (a1.contains(p)) p1 = p;
            if (a2.contains(p)) p2 = p;
        }
        
        if (p1 != null && p2 != null) {
            if (p1.equals(p2)) {
                return 10.0; // same province, default 10 km (fully allowed)
            } else {
                return 120.0; // different provinces, default 120 km (blocks perishable)
            }
        }
        return 35.0; // default generic guess
    }

    private static class Coordinate {
        final double lat;
        final double lon;

        Coordinate(double lat, double lon) {
            this.lat = lat;
            this.lon = lon;
        }
    }
}
