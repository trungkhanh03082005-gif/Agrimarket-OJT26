package org.example.agrimarket.service;

import org.example.agrimarket.model.Order;
import org.example.agrimarket.model.OrderItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GhnService {

    @Value("${ghn.api.token:}")
    private String ghnToken;

    @Value("${ghn.api.shopid:}")
    private String ghnShopId;

    @Value("${ghn.api.url:https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create}")
    private String ghnUrl;

    @Value("${ghn.simulation.enabled:true}")
    private boolean simulationEnabled;

    private final RestTemplate restTemplate = new RestTemplate();

    public void createShipment(Order order) {
        if (simulationEnabled) {
            applySimulation(order, "Chạy chế độ giả lập GiaoHangNhanh.");
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Token", ghnToken);
            headers.set("ShopId", ghnShopId);

            Map<String, Object> body = new HashMap<>();
            body.put("payment_type_id", 2); // Buyer pays shipping (COD)
            body.put("note", order.getShippingNote() != null ? order.getShippingNote() : "Giao hàng nông sản");
            body.put("required_note", "CHOXEMHANGKHONGTHU");
            String fromAddr = order.getFarmer().getFarmAddress();
            if (fromAddr == null || fromAddr.isBlank()) {
                fromAddr = "Tiền Giang, Việt Nam";
            }
            String[] fromComponents = parseAddressComponents(fromAddr, "Phường 1", "Thành Phố Mỹ Tho", "Tiền Giang");

            body.put("from_name", order.getFarmer().getFarmName() != null ? order.getFarmer().getFarmName() : order.getFarmer().getFullName());
            String farmPhone = order.getFarmer().getPhone();
            if (farmPhone == null || farmPhone.isBlank()) {
                farmPhone = "0946189176";
            }
            body.put("from_phone", farmPhone);
            body.put("from_address", fromAddr);
            body.put("from_ward_name", fromComponents[0]);
            body.put("from_district_name", fromComponents[1]);
            body.put("from_province_name", fromComponents[2]);

            String toAddr = (order.getOrderGroup() != null) ? order.getOrderGroup().getDeliveryAddress() : "Hồ Chí Minh, Việt Nam";
            String[] toComponents = parseAddressComponents(toAddr, "Phường 1", "Quận 1", "Hồ Chí Minh");

            body.put("to_name", order.getOrderGroup() != null ? order.getOrderGroup().getRecipientName() : "Khách hàng");
            body.put("to_phone", order.getOrderGroup() != null ? order.getOrderGroup().getRecipientPhone() : "0946189176");
            body.put("to_address", toAddr);
            body.put("to_ward_name", toComponents[0]);
            body.put("to_district_name", toComponents[1]);
            body.put("to_province_name", toComponents[2]);

            body.put("weight", 1000); // 1kg default
            body.put("length", 15);
            body.put("width", 15);
            body.put("height", 15);
            body.put("service_type_id", 2); // E-commerce delivery

            List<Map<String, Object>> items = new ArrayList<>();
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    Map<String, Object> itemMap = new HashMap<>();
                    itemMap.put("name", item.getProductName());
                    itemMap.put("code", String.valueOf(item.getProductId()));
                    itemMap.put("quantity", item.getQuantity());
                    items.add(itemMap);
                }
            } else {
                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("name", "Nông sản sạch");
                itemMap.put("code", "NS01");
                itemMap.put("quantity", 1);
                items.add(itemMap);
            }
            body.put("items", items);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(ghnUrl, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map responseBody = response.getBody();
                if (responseBody.containsKey("data")) {
                    Map data = (Map) responseBody.get("data");
                    if (data != null && data.containsKey("order_code")) {
                        String orderCode = (String) data.get("order_code");
                        order.setTrackingNumber(orderCode);
                        order.setDetailedStatus("assigned");
                        order.setStatus("shipping");
                        order.setDriverName("Nguyễn Văn Hùng (GiaoHangNhanh)");
                        order.setDriverPhone("0946189176");
                        order.setVehicleType("Xe máy");
                        order.setLicensePlate("29-G1 567.89");
                        order.setShipperNotes("GHN Sandbox: Tạo đơn thành công. Đã gán tài xế đến lấy hàng.");
                        return;
                    }
                }
            }
            // Fallback if structure is unexpected
            applySimulation(order, "GHN API trả về phản hồi không mong muốn. Tự động chuyển sang chế độ giả lập.");
        } catch (Exception e) {
            System.err.println("Lỗi khi kết nối API GHN Sandbox: " + e.getMessage());
            applySimulation(order, "Lỗi kết nối GHN API. Hệ thống tự động kích hoạt bộ giả lập.");
        }
    }

    private void applySimulation(Order order, String reason) {
        String trackingNum = "GHN" + (100000000 + new Random().nextInt(900000000));
        order.setTrackingNumber(trackingNum);
        order.setDetailedStatus("assigned");
        order.setStatus("shipping");
        order.setDriverName("Nguyễn Văn Hùng (GiaoHangNhanh)");
        order.setDriverPhone("0946189176");
        order.setVehicleType("Xe máy");
        order.setLicensePlate("29-G1 567.89");
        order.setShipperNotes("GHN Sandbox (Giả lập): " + reason + " Đã điều phối tài xế.");
    }

    public double calculateShippingFee(String fromAddress, String toAddress, int totalWeightInGrams) {
        if (simulationEnabled) {
            return 30000.0;
        }

        try {
            String[] fromComponents = parseAddressComponents(fromAddress, "Phường 1", "Thành Phố Mỹ Tho", "Tiền Giang");
            String[] toComponents = parseAddressComponents(toAddress, "Phường 1", "Quận 1", "Hồ Chí Minh");

            Integer fromProvId = getProvinceId(fromComponents[2]);
            Integer fromDistId = getDistrictId(fromProvId, fromComponents[1]);
            String fromWardCode = getWardCode(fromDistId, fromComponents[0]);

            Integer toProvId = getProvinceId(toComponents[2]);
            Integer toDistId = getDistrictId(toProvId, toComponents[1]);
            String toWardCode = getWardCode(toDistId, toComponents[0]);

            if (fromDistId == null || toDistId == null || toWardCode == null) {
                return 30000.0;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Token", ghnToken);
            headers.set("ShopId", ghnShopId);

            Map<String, Object> body = new HashMap<>();
            body.put("from_district_id", fromDistId);
            body.put("from_ward_code", fromWardCode);
            body.put("to_district_id", toDistId);
            body.put("to_ward_code", toWardCode);
            body.put("weight", totalWeightInGrams > 0 ? totalWeightInGrams : 1000);
            body.put("length", 15);
            body.put("width", 15);
            body.put("height", 15);
            body.put("service_type_id", 2); // E-commerce delivery

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee",
                entity,
                Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map responseBody = response.getBody();
                if (responseBody.containsKey("data")) {
                    Map data = (Map) responseBody.get("data");
                    if (data != null && data.containsKey("total")) {
                        Object totalVal = data.get("total");
                        if (totalVal instanceof Number) {
                            return ((Number) totalVal).doubleValue();
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi tính phí vận chuyển GHN: " + e.getMessage());
        }
        return 30000.0;
    }

    private Integer getProvinceId(String provinceName) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Token", ghnToken);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province",
                HttpMethod.GET,
                entity,
                Map.class
            );
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> provinces = (List<Map<String, Object>>) response.getBody().get("data");
                String normalizedSearch = normalizeName(provinceName);
                for (Map<String, Object> prov : provinces) {
                    String name = (String) prov.get("ProvinceName");
                    if (normalizeName(name).equals(normalizedSearch)) {
                        return (Integer) prov.get("ProvinceID");
                    }
                    List<String> extensions = (List<String>) prov.get("NameExtension");
                    if (extensions != null) {
                        for (String ext : extensions) {
                            if (normalizeName(ext).equals(normalizedSearch)) {
                                return (Integer) prov.get("ProvinceID");
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching GHN provinces: " + e.getMessage());
        }
        return null;
    }

    private Integer getDistrictId(Integer provinceId, String districtName) {
        if (provinceId == null) return null;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Token", ghnToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = new HashMap<>();
            body.put("province_id", provinceId);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district",
                entity,
                Map.class
            );
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> districts = (List<Map<String, Object>>) response.getBody().get("data");
                String normalizedSearch = normalizeName(districtName);
                for (Map<String, Object> dist : districts) {
                    String name = (String) dist.get("DistrictName");
                    if (normalizeName(name).equals(normalizedSearch)) {
                        return (Integer) dist.get("DistrictID");
                    }
                    List<String> extensions = (List<String>) dist.get("NameExtension");
                    if (extensions != null) {
                        for (String ext : extensions) {
                            if (normalizeName(ext).equals(normalizedSearch)) {
                                return (Integer) dist.get("DistrictID");
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching GHN districts: " + e.getMessage());
        }
        return null;
    }

    private String getWardCode(Integer districtId, String wardName) {
        if (districtId == null) return null;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Token", ghnToken);
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = new HashMap<>();
            body.put("district_id", districtId);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=" + districtId,
                entity,
                Map.class
            );
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> wards = (List<Map<String, Object>>) response.getBody().get("data");
                String normalizedSearch = normalizeName(wardName);
                for (Map<String, Object> ward : wards) {
                    String name = (String) ward.get("WardName");
                    if (normalizeName(name).equals(normalizedSearch)) {
                        return (String) ward.get("WardCode");
                    }
                    List<String> extensions = (List<String>) ward.get("NameExtension");
                    if (extensions != null) {
                        for (String ext : extensions) {
                            if (normalizeName(ext).equals(normalizedSearch)) {
                                return (String) ward.get("WardCode");
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching GHN wards: " + e.getMessage());
        }
        return null;
    }

    private String normalizeName(String name) {
        if (name == null) return "";
        String normalized = name.toLowerCase()
                .replaceAll("[àáạảãâầấậẩẫăằắặẳẵ]", "a")
                .replaceAll("[èéẹẻẽêềếệểễ]", "e")
                .replaceAll("[ìíịỉĩ]", "i")
                .replaceAll("[òóọỏõôồốộổỗơờớợởỡ]", "o")
                .replaceAll("[ùúụủũưừứựửữ]", "u")
                .replaceAll("[ỳýỵỷỹ]", "y")
                .replaceAll("đ", "d")
                .replaceAll("^(tinh|thanh pho|quan|huyen|thi xa|phuong|xa|thi tran|tp)\\s+", "")
                .trim();
        return normalized;
    }

    private String[] parseAddressComponents(String fullAddress, String defaultWard, String defaultDistrict, String defaultProvince) {
        if (fullAddress == null || fullAddress.isBlank()) {
            return new String[]{defaultWard, defaultDistrict, defaultProvince};
        }
        String[] parts = fullAddress.split(",");
        if (parts.length >= 3) {
            String province = parts[parts.length - 1].trim();
            String district = parts[parts.length - 2].trim();
            String ward = parts[parts.length - 3].trim();
            return new String[]{ward, district, province};
        }
        return new String[]{defaultWard, defaultDistrict, defaultProvince};
    }
}
