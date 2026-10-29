// src/hooks/useProfile.js

import { useEffect, useState } from "react";
import profileService from "../services/profileService";

const useProfile = () => {
  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile =
        localStorage.getItem("farmconnect_user") ||
        localStorage.getItem("profile") ||
        localStorage.getItem("user");
      return savedProfile ? JSON.parse(savedProfile) : null;
    } catch {
      return null;
    }
  });
  const [isProfileLoading, setIsProfileLoading] = useState(!profile);
  const [profileError, setProfileError] = useState("");

  const loadProfile = async () => {
    try {
      if (!profile) {
        setIsProfileLoading(true);
      }
      setProfileError("");

      const currentProfile = await profileService.getCurrentProfile();
      setProfile(currentProfile);
      localStorage.setItem("farmconnect_user", JSON.stringify(currentProfile));
    } catch (error) {
      console.error("Load profile error:", error);
      if (!profile) {
        setProfileError("Không thể tải hồ sơ người dùng.");
      }
    } finally {
      setIsProfileLoading(false);
    }
  };

  const updateProfile = async (payload) => {
    try {
      const updatedProfile = await profileService.updateProfile(payload);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    profile,
    isProfileLoading,
    profileError,
    loadProfile,
    updateProfile,
  };
};

export default useProfile;