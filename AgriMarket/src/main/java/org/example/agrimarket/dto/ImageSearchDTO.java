package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class ImageSearchDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private String imageBase64;
        private String mimeType;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DetectedObject {
        private String name;
        private String category;
        private Integer confidence;
        private List<Integer> box2d;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Prediction {
        private String name;
        private Integer confidence;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Attributes {
        private String color;        // Màu sắc: "Xanh", "Vàng", "Đỏ"...
        private Integer ripeness;     // Độ chín %: 85
        private String condition;    // Tình trạng: "Tươi mới", "Nông sản chế biến"...
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgriKnowledge {
        private String seasonality;  // Mùa vụ: "Tháng 3 - Tháng 7"
        private String origin;       // Nguồn gốc: "Việt Nam"
        private String storage;      // Bảo quản: "5-7 ngày ở nhiệt độ phòng"
        private String avgPrice;     // Giá trung bình: "40.000đ/kg"
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private String recognizedProduct;    // Tên nông sản bóc tách chính
        private String search;               // Từ khóa tìm kiếm chính
        private String category;             // Danh mục nông sản chuẩn hệ thống
        private Integer confidence;          // Độ chính xác (%) VD: 98
        private Boolean isAgriculturalProduct; // True nếu là nông sản, False nếu không phải
        private String aiSummary;            // Thông điệp tóm tắt ngắn gọn từ AI
        private List<String> suggestedKeywords; // Danh sách từ khóa tìm kiếm gợi ý
        private List<Integer> box2d;         // Bounding box [ymin, xmin, ymax, xmax] (thang đo 0-1000)

        // Bổ sung các tính năng AI nâng cao
        private List<DetectedObject> detectedObjects; // Nhận diện nhiều đối tượng trong 1 ảnh
        private List<Prediction> predictions;         // Danh sách top-3 dự đoán (VD: Xoài Cát 94%, Đu đủ 17%)
        private Attributes attributes;                 // Thuộc tính AI bóc tách (Màu sắc, độ chín, tình trạng)
        private AgriKnowledge agriKnowledge;           // Kiến thức giáo dục nông sản (Mùa vụ, bảo quản, giá trung bình)
    }
}
