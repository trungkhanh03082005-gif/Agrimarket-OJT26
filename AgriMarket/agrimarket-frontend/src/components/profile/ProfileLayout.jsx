// src/components/profile/ProfileLayout.jsx

import ProfileSidebar from "./ProfileSidebar";

const ProfileLayout = ({ profile, children }) => {
  return (
    <div className="profile-page-wrapper">
      <ProfileSidebar profile={profile} />

      <main className="profile-main-content">
        {children}
      </main>
    </div>
  );
};

export default ProfileLayout;