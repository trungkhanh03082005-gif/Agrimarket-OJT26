import React from 'react';
import Button from '../../components/common/Button/Button';

import successIcon from '../../assets/icons/icon-20.svg';
import warningIcon from '../../assets/icons/icon-21.svg';

import './ChangePasswordSuccess.css';

const ChangePasswordSuccess = ({
                                 isOpen = false,
                                 onClose,
                               }) => {

  if (!isOpen) return null;

  const handleClose = () => {
    onClose?.();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
      <div
          className="change-password-success-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-success-title"
          onClick={handleOverlayClick}
      >
        <div className="change-password-success-modal">

          {/* Success Icon */}
          <div className="change-password-success__icon-wrapper">
            <div className="change-password-success__icon-circle">
              <img
                  src={successIcon}
                  alt="Success"
                  className="change-password-success__icon"
              />
            </div>
          </div>

          {/* Content */}
          <div className="change-password-success__content">
            <h2
                id="change-success-title"
                className="change-password-success__title"
            >
              Đổi mật khẩu thành công!
            </h2>

            <p className="change-password-success__message">
              Mật khẩu tài khoản của bạn đã được cập nhật an toàn.
            </p>
          </div>

          {/* Warning */}
          <div
              className="change-password-success__warning"
              role="note"
          >
            <img
                src={warningIcon}
                alt="Warning"
                className="change-password-success__warning-icon"
            />

            <p className="change-password-success__warning-text">
              Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với bộ phận hỗ trợ ngay lập tức.
            </p>
          </div>

          {/* Button */}
          <div className="change-password-success__close-btn">
            <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleClose}
            >
              Đóng
            </Button>
          </div>

        </div>
      </div>
  );
};

export default ChangePasswordSuccess;