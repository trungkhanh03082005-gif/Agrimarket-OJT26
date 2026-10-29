package org.example.agrimarket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class VoiceSearchDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private String transcript;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private String search;
        private String category;
        private String location;
        private Double minPrice;
        private Double maxPrice;
        private String sort;
        private String originalTranscript;
        private String aiSummary;
    }
}
