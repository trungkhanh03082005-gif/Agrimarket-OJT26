package org.example.agrimarket.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import java.util.List;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:trungkhanh03082005@gmail.com}")
    private String mailFrom;

    public void sendOtpEmail(String toEmail, String otpCode, String type) {
        System.out.println("==================================================");
        System.out.println("SENDING OTP TO EMAIL: " + toEmail + " | TYPE: " + type);
        System.out.println("YOUR VERIFICATION OTP IS: " + otpCode);
        System.out.println("==================================================");

        if (mailSender == null) {
            System.out.println("[WARNING] JavaMailSender not configured. Only logging OTP to console.");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(toEmail);
            
            String subject = "forgot_password".equalsIgnoreCase(type) ? "AgriMarket - Password Reset OTP" : "AgriMarket - Account Registration OTP";
            String body = "forgot_password".equalsIgnoreCase(type)
                ? "Hello,\n\nYour OTP to reset your password is: " + otpCode + "\n\nThis OTP is valid for 5 minutes. Do not share it with anyone."
                : "Hello,\n\nYour OTP to verify your registration is: " + otpCode + "\n\nThis OTP is valid for 5 minutes. Do not share it with anyone.";
            
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            System.out.println("[INFO] OTP Email sent successfully via JavaMailSender.");
        } catch (Exception e) {
            System.out.println("[ERROR] Failed to send OTP email: " + e.getMessage() + ". Please check the printed OTP in console above to proceed.");
        }
    }

    @Async("emailExecutor")
    public void sendBroadcastEmailsAsync(List<String> recipients, String title, String content) {
        if (mailSender == null || recipients == null || recipients.isEmpty()) {
            System.out.println("[WARNING] JavaMailSender not configured or no recipients. Skipping broadcast emails.");
            return;
        }

        System.out.println("==================================================");
        System.out.println("STARTING ASYNC BROADCAST EMAIL SENDING");
        System.out.println("TOTAL RECIPIENTS: " + recipients.size());
        System.out.println("SUBJECT: " + title);
        System.out.println("==================================================");

        for (String toEmail : recipients) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(mailFrom);
                message.setTo(toEmail);
                message.setSubject(title);
                message.setText(content);
                
                mailSender.send(message);
                System.out.println("[INFO] Broadcast email sent to: " + toEmail);
                
                // Throttle sending slightly to avoid spam flags or SMTP limits
                Thread.sleep(200);
            } catch (Exception e) {
                System.err.println("[ERROR] Failed to send broadcast email to: " + toEmail + " | Error: " + e.getMessage());
            }
        }
        System.out.println("==================================================");
        System.out.println("ASYNC BROADCAST EMAIL SENDING COMPLETED");
        System.out.println("==================================================");
    }
}
