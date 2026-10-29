import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, ArrowRightLeft, MapPin, Phone, UserCheck } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="new-footer">
      <div className="footer-columns">
        <div className="footer-column footer-brand">
          <h3 className="footer-brand-title">AgriMarket Việt Nam</h3>
          <p className="footer-brand-desc">
            Kênh thương mại điện tử chuyên biệt cho nông nghiệp Việt, kết nối trực tiếp nhà vườn và người tiêu dùng.
          </p>
          <div className="footer-social-icons">
            <a href="#" className="social-icon" aria-label="Website">
              <Globe size={20} />
            </a>
            <a href="#" className="social-icon" aria-label="Share">
              <ArrowRightLeft size={20} />
            </a>
            <a href="#" className="social-icon" aria-label="Mail">
              <Mail size={20} />
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h4 className="footer-col-title">DANH MỤC NỔI BẬT</h4>
          <ul className="footer-links">
            <li>
              <Link to="/products/listing?category=Rau%20c%E1%BB%A7%20qu%E1%BA%A3">
                Rau củ quả sạch
              </Link>
            </li>
            <li>
              <Link to="/products/listing?category=Tr%C3%A1i%20c%C3%A2y">
                Trái cây tươi ngon
              </Link>
            </li>
            <li>
              <Link to="/products/listing?category=C%C3%A2y%20l%C6%B0%C6%A1ng%20th%E1%BB%B1c">
                Gạo & Ngũ cốc sạch
              </Link>
            </li>
            <li>
              <Link to="/products/listing?category=N%C3%B4ng%20s%E1%BA%A3n%20ch%E1%BA%BF%20bi%E1%BA%BFn">
                Nông sản chế biến
              </Link>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h4 className="footer-col-title">THÔNG TIN LIÊN HỆ</h4>
          <ul className="footer-contact-info">
            <li className="footer-contact-item">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><MapPin size={16} /></span>
              <span>268 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh</span>
            </li>
            <li className="footer-contact-item">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><Phone size={16} /></span>
              <span>Hotline: 1900 6789 (8:00 - 21:00)</span>
            </li>
            <li className="footer-contact-item">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><Mail size={16} /></span>
              <span>Email: hotro@agrimarket.vn</span>
            </li>
            <li className="footer-contact-item">
              <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}><UserCheck size={16} /></span>
              <span>Hợp tác nhà vườn: <strong className="footer-contact-highlight">0909 123 456</strong></span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2024 AgriMarket Việt Nam. Kết nối bền vững.</p>
      </div>
    </footer>
  );
};

export default Footer;
