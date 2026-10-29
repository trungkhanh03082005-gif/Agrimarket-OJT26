import { useNavigate } from "react-router-dom";
import profileService from "../../services/profileService";

const ProfileActionCards = ({ showToast, setConfirmModal }) => {
    const navigate = useNavigate();

    const handleDeleteAccount = async () => {
        if (!setConfirmModal || !showToast) {
            const confirmed = window.confirm(
                "Bạn có chắc chắn muốn xoá tài khoản không?\nHành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xoá."
            );
            if (!confirmed) return;

            try {
                await profileService.deleteAccount();
                alert("Xoá tài khoản thành công!");
                navigate("/");
                window.location.reload();
            } catch (error) {
                console.error("Xoá tài khoản thất bại:", error);
                alert(
                    error?.response?.data ||
                    error?.message ||
                    "Đã xảy ra lỗi khi xoá tài khoản. Vui lòng thử lại sau."
                );
            }
            return;
        }

        setConfirmModal({
            show: true,
            title: "Xác nhận xoá tài khoản",
            message: "Bạn có chắc chắn muốn xoá tài khoản không? Hành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xoá.",
            onConfirm: async () => {
                try {
                    await profileService.deleteAccount();
                    showToast("Xoá tài khoản thành công!", "success");
                    setTimeout(() => {
                        navigate("/");
                        window.location.reload();
                    }, 1500);
                } catch (error) {
                    console.error("Xoá tài khoản thất bại:", error);
                    showToast(
                        error?.response?.data ||
                        error?.message ||
                        "Đã xảy ra lỗi khi xoá tài khoản. Vui lòng thử lại sau.",
                        "error"
                    );
                }
            }
        });
    };

    return (
        <div className="profile-actions-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>


            <button 
                className="profile-action-card delete-account-card"
                onClick={handleDeleteAccount}
            >
                <span className="profile-action-icon">🗑️</span>

                <div>
                    <strong>Xoá tài khoản</strong>
                    <p>Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu của bạn</p>
                </div>

                <span>›</span>
            </button>
        </div>
    );
};

export default ProfileActionCards;