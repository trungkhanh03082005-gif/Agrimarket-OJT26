// src/components/profile/ProfileHeader.jsx

const ProfileHeader = ({ title, subtitle, action }) => {
  return (
    <div className="profile-page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {action && <div>{action}</div>}
    </div>
  );
};

export default ProfileHeader;