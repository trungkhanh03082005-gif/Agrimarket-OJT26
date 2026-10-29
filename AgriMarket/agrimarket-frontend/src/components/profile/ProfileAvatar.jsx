// src/components/profile/ProfileAvatar.jsx

const ProfileAvatar = ({ src, name, email, size = "large" }) => {
  const avatarText =
    name?.charAt(0)?.toUpperCase() ||
    email?.charAt(0)?.toUpperCase() ||
    "U";

  if (src) {
    return (
      <img
        src={src}
        alt="Avatar"
        className={`profile-avatar profile-avatar-${size}`}
      />
    );
  }

  return (
    <div className={`profile-avatar profile-avatar-${size} avatar-placeholder`}>
      {avatarText}
    </div>
  );
};

export default ProfileAvatar;