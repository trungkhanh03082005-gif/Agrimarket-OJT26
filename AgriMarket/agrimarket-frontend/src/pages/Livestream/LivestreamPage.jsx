import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/common/Header/Header";
import AgoraRTC from "agora-rtc-sdk-ng";
import apiClient from "../../services/apiClient";
import wishlistService from "../../services/wishlistService";
import cartService from "../../services/cartService";
import "./LivestreamPage.css";



const LivestreamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Video player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(5085); // 01:24:45
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);

  // Farmer follow state
  const [isFollowing, setIsFollowing] = useState(false);

  // Voucher state
  const [voucherClaimed, setVoucherClaimed] = useState(false);
  const [voucherTime, setVoucherTime] = useState(296); // 04:56 (seconds)

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });



  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  // Upcoming subscription state
  const [isSubscribed, setIsSubscribed] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem("subscribed_lives")) || [];
      return list.map(x => x.toString()).includes(id?.toString());
    } catch (e) {
      return false;
    }
  });

  // Agora & Backend Stream integration states
  const [agoraToken, setAgoraToken] = useState(null);
  const [agoraAppId, setAgoraAppId] = useState("");
  const [agoraChannelName, setAgoraChannelName] = useState("");
  const [backendStream, setBackendStream] = useState(null);
  const rtcRef = useRef({ client: null, remoteVideoTrack: null, remoteAudioTrack: null });
  const videoRef = useRef(null);

  const chatContainerRef = useRef(null);
  const [tabId] = useState(() => Math.random().toString(36).substring(2) + Date.now().toString(36));
  const videoTimerRef = useRef(null);
  const voucherTimerRef = useRef(null);
  const chatSimRef = useRef(null);

  // Fallback default placeholder stream data
  const getStreamData = () => {
    return {
      id: "thomas-miller",
      farmerName: "Nhà vườn",
      farmerBrand: "Nông trại sạch địa phương",
      farmerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      title: "Đang tải livestream...",
      description: "",
      status: "live",
      viewersCount: "0 đang xem",
      videoSrc: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800",
      voucherTitle: "Voucher nhà vườn",
      voucherTimeInit: 300,
      products: []
    };
  };

  const [activeStream, setActiveStream] = useState(null);
  const rawStreamData = backendStream || activeStream || getStreamData();
  
  const startTimeStr = rawStreamData.startTime ? new Date(rawStreamData.startTime).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  }) + " - " + new Date(rawStreamData.startTime).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }) : rawStreamData.scheduledTime || "Chưa lên lịch";

  const streamData = {
    ...rawStreamData,
    status: rawStreamData.status === "active" ? "live" : rawStreamData.status,
    scheduledTime: startTimeStr
  };

  // Initialize page variables when streamData changes, and poll for changes in LocalStorage or Backend
  useEffect(() => {
    // Reset states
    setBackendStream(null);
    setAgoraToken(null);
    setAgoraAppId("");
    setAgoraChannelName("");

    const isNumericId = /^\d+$/.test(id);

    const loadStream = async () => {
      let currentFarmerId = null;
      if (isNumericId) {
        try {
          const response = await apiClient.get(`/api/livestreams/${id}`);
          const data = response.data;
          setBackendStream(data);
          setAgoraToken(data.token);
          setAgoraAppId(data.appId);
          setAgoraChannelName(data.channelName);
          setVoucherTime(300); // 5 mins dummy voucher timer
          setVoucherClaimed(false);
          setChatMessages([
            { id: "sys-1", type: "system", text: "Hệ thống: Chào mừng bạn đến với livestream trực tiếp của nhà vườn!" }
          ]);
          currentFarmerId = data.farmerId;
        } catch (err) {
          console.error("Lỗi tải livestream từ backend:", err);
          setBackendStream({
            status: "ended",
            title: "Phiên livestream đã kết thúc",
            description: "Nhà vườn đã ngắt kết nối phiên livestream này.",
            farmerName: "Nhà vườn",
            farmerBrand: "Đang ngoại tuyến",
            farmerAvatar: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=150",
            viewersCount: 0,
            heartsCount: 0,
            products: []
          });
        }
      } else {
        const data = getStreamData();
        setActiveStream(data);
        setVoucherTime(data.voucherTimeInit);
        setVoucherClaimed(false);
        setChatMessages(data.initialChats);
        currentFarmerId = data.farmerId;
      }
      
      if (currentFarmerId) {
        try {
          const followed = await wishlistService.isFarmerFollowed(currentFarmerId);
          setIsFollowing(followed);
        } catch (err) {
          console.error("Lỗi đồng bộ trạng thái follow:", err);
          setIsFollowing(false);
        }
      } else {
        setIsFollowing(false);
      }
      setIsShopChatOpen(false);
      setShopChatMessages([]);
    };

    loadStream();

    if (isNumericId) {
      apiClient.post(`/api/livestreams/${id}/join?tabId=${tabId}`).catch(err => console.error(err));
    }

    const handleBeforeUnload = () => {
      if (isNumericId) {
        const url = `${apiClient.defaults.baseURL || ""}/api/livestreams/${id}/leave?tabId=${tabId}`;
        navigator.sendBeacon(url);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (isNumericId) {
        apiClient.post(`/api/livestreams/${id}/leave?tabId=${tabId}`).catch(err => console.error(err));
      }
    };
  }, [id, tabId]);

  // Sync livestream details and comments from backend (numeric IDs only)
  useEffect(() => {
    const isNumericId = /^\d+$/.test(id);
    if (!isNumericId) return;

    const interval = setInterval(async () => {
      try {
        const detailRes = await apiClient.get(`/api/livestreams/${id}`);
        const data = detailRes.data;
        setBackendStream(data);

        // Check if stream ended
        if (data.status !== "active") {
          setIsPlaying(false);
          if (rtcRef.current.client) {
            await rtcRef.current.client.leave();
            rtcRef.current.client = null;
          }
          clearInterval(interval);
          return;
        }

        // Fetch comments
        const commentsRes = await apiClient.get(`/api/livestreams/${id}/comments`);
        setChatMessages((prev) => {
          const systemMsgs = prev.filter(m => m.type === "system");
          const dbMsgs = commentsRes.data.map(c => ({
            id: `comment-${c.id}`,
            user: c.user,
            text: c.text,
            avatar: c.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
            isHost: c.isHost
          }));
          return [...systemMsgs, ...dbMsgs];
        });
      } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu live từ backend:", err);
        // Nếu lỗi 404 tức là livestream đã kết thúc và bị xóa khỏi cơ sở dữ liệu
        if (err.response && err.response.status === 404) {
          setBackendStream(prev => prev ? { ...prev, status: "ended" } : { status: "ended" });
          setIsPlaying(false);
          if (rtcRef.current.client) {
            rtcRef.current.client.leave().catch(e => console.error("Lỗi ngắt kết nối Agora:", e));
            rtcRef.current.client = null;
          }
          clearInterval(interval);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id]);

  // Join Agora Channel for spectator
  useEffect(() => {
    if (!agoraAppId || !agoraChannelName || !agoraToken) return;

    let client;
    const joinAgoraChannel = async () => {
      try {
        client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        await client.setClientRole("audience");

        // Handle remote stream publishing event
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video") {
            const remoteVideoTrack = user.videoTrack;
            rtcRef.current.remoteVideoTrack = remoteVideoTrack;
            if (videoRef.current) {
              remoteVideoTrack.play(videoRef.current);
            }
          }
          if (mediaType === "audio") {
            const remoteAudioTrack = user.audioTrack;
            rtcRef.current.remoteAudioTrack = remoteAudioTrack;
            remoteAudioTrack.play();
          }
        });

        await client.join(agoraAppId, agoraChannelName, agoraToken, null);
        rtcRef.current.client = client;
      } catch (err) {
        console.error("Lỗi kết nối Agora RTC:", err);
      }
    };

    joinAgoraChannel();

    return () => {
      if (rtcRef.current.remoteVideoTrack) rtcRef.current.remoteVideoTrack.stop();
      if (rtcRef.current.remoteAudioTrack) rtcRef.current.remoteAudioTrack.stop();
      if (client) {
        client.leave().catch(e => console.error(e));
      }
      rtcRef.current.client = null;
    };
  }, [agoraToken, agoraAppId, agoraChannelName]);

  // Random names and messages for simulating other users' chat comments (Live only)
  const mockUsers = [
    { name: "John Doe", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" },
    { name: "Maria Green", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100" },
    { name: "David K.", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100" },
    { name: "Emma Watson", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" },
    { name: "Alex Rivera", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100" }
  ];

  const mockComments = [
    "Nhà vườn này mật ong ngon lắm ạ, em mua lần thứ 3 rồi!",
    "Cà rốt nhìn tươi ngon quá, có ship đi tỉnh không anh?",
    "Voucher giảm giá áp dụng cho toàn bộ đơn hàng luôn đúng không ạ?",
    "Hôm nay nông trại đẹp trời thế, thích quá!",
    "Đã nhận voucher thành công. Vừa chốt đơn xong nhé!",
    "Rau quả đợt này khi nào thu hoạch vậy nông trang?",
    "Ủng hộ nông dân Việt Nam và nông nghiệp hữu cơ sạch 👍",
    "Giao hàng nhanh lắm cả nhà, đóng gói rất cẩn thận nữa."
  ];

  // Helper to show custom toasts
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // 1. Live stream counter timer & voucher timer logic
  useEffect(() => {
    if (streamData.status !== "live") return;

    // Voucher countdown
    voucherTimerRef.current = setInterval(() => {
      setVoucherTime((prev) => {
        if (prev <= 1) {
          clearInterval(voucherTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Live video duration timer
    videoTimerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        return isPlaying ? prev + 1 : prev;
      });
    }, 1000);

    // Scroll chat to bottom on load
    scrollToBottom();

    return () => {
      clearInterval(voucherTimerRef.current);
      clearInterval(videoTimerRef.current);
    };
  }, [isPlaying, id]);

  // 2. Automated chat comments simulator (Live only)
  useEffect(() => {
    const isNumericId = /^\d+$/.test(id);
    if (streamData.status !== "live" || isNumericId) return;

    chatSimRef.current = setInterval(() => {
      const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const randomComment = mockComments[Math.floor(Math.random() * mockComments.length)];
      
      const isBot = Math.random() < 0.2;
      
      const newMsg = {
        id: Date.now(),
        user: isBot ? "Hệ thống AgriMarket" : randomUser.name,
        text: isBot 
          ? `💡 Hãy nhanh tay nhấn 'Nhận Voucher' để được hưởng ưu đãi độc quyền trên livestream của ${streamData.farmerName}!` 
          : randomComment,
        isBot: isBot,
        avatar: isBot ? "" : randomUser.avatar
      };

      setChatMessages((prev) => [...prev, newMsg]);
    }, 7000);

    return () => clearInterval(chatSimRef.current);
  }, [id, streamData.status, streamData.farmerName]);

  // 3. Scroll to bottom when messages list updates
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  // Format time (seconds to hh:mm:ss)
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h > 0 ? String(h).padStart(2, "0") : null,
      String(m).padStart(2, "0"),
      String(s).padStart(2, "0")
    ].filter(Boolean).join(":");
  };

  // Format voucher countdown time (mm:ss)
  const formatVoucherTime = (secs) => {
    if (secs <= 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Interactive toggle for play/pause
  const togglePlay = () => {
    if (streamData.status === "upcoming") return; // Upcoming has no playback
    setIsPlaying(!isPlaying);
    setShowPlayOverlay(true);
    setTimeout(() => setShowPlayOverlay(false), 800);
  };

  // Mute volume toggle
  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume > 0 ? prevVolume : 80);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleFullscreen = () => {
    const container = document.querySelector(".video-player-container");
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error("Lỗi khi mở toàn màn hình:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (rtcRef.current && rtcRef.current.remoteAudioTrack) {
      if (isMuted) {
        rtcRef.current.remoteAudioTrack.setVolume(0);
      } else {
        rtcRef.current.remoteAudioTrack.setVolume(volume);
      }
    }
  }, [volume, isMuted]);

  // Claim voucher click handler
  const handleClaimVoucher = () => {
    if (streamData.status !== "live") return;
    if (voucherClaimed) return;
    setVoucherClaimed(true);
    showToast(`Chúc mừng! Bạn đã nhận thành công ${streamData.voucherTitle}. Mã giảm giá đã được thêm vào ví của bạn!`, "success");
  };

  // Follow farmer click handler
  const handleFollowToggle = async () => {
    if (!streamData || !streamData.farmerId) return;
    try {
      const farmerObj = {
        id: streamData.farmerId,
        name: streamData.farmerName,
        avatarUrl: streamData.farmerAvatar,
        farmName: streamData.farmerBrand
      };
      const res = await wishlistService.toggleFollowFarmer(farmerObj);
      setIsFollowing(res.followed);
      showToast(res.message, res.followed ? "success" : "info");
    } catch (err) {
      console.error("Lỗi toggle follow farmer:", err);
    }
  };

  // Subscribe to upcoming livestream
  const handleToggleSubscribe = () => {
    try {
      const list = JSON.parse(localStorage.getItem("subscribed_lives")) || [];
      const idStr = id?.toString();
      let nextList;
      if (list.map(x => x.toString()).includes(idStr)) {
        nextList = list.filter(x => x.toString() !== idStr);
        setIsSubscribed(false);
        showToast(`Đã hủy đăng ký nhận thông báo.`, "info");
      } else {
        nextList = [...list, idStr];
        setIsSubscribed(true);
        showToast(`Đăng ký thành công! Bạn sẽ nhận được thông báo trước khi phiên live của ${streamData.farmerName} lên sóng.`, "success");
      }
      localStorage.setItem("subscribed_lives", JSON.stringify(nextList));
    } catch (e) {
      console.error(e);
      setIsSubscribed(!isSubscribed);
    }
  };

  // Shop direct message handlers
  const handleOpenShopChat = () => {
    if (streamData && streamData.farmerId) {
      window.dispatchEvent(
        new CustomEvent("open_agrimarket_chat", {
          detail: { farmId: streamData.farmerId }
        })
      );
    }
  };

  // Submit comment in live chat
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (streamData.status === "upcoming") {
      showToast("Phòng chat hiện tại đang khóa. Vui lòng quay lại khi phiên live bắt đầu!", "info");
      return;
    }
    if (streamData.isBlocked) {
      showToast("Bạn đã bị chặn bình luận trong phiên livestream này!", "error");
      return;
    }
    if (!chatInput.trim()) return;

    const isNumericId = /^\d+$/.test(id);
    if (isNumericId) {
      try {
        await apiClient.post(`/api/livestreams/${id}/comments`, {
          comment: chatInput.trim()
        });
        setChatInput("");
      } catch (err) {
        console.error("Lỗi gửi bình luận lên backend:", err);
        const errorMsg = typeof err.response?.data === "string" 
          ? err.response.data 
          : "Không thể gửi bình luận. Vui lòng thử lại!";
        showToast(errorMsg, "error");
      }
    } else {
      const currentUser = JSON.parse(localStorage.getItem("agrimarket_user")) || { fullName: "Bạn", avatarUrl: "" };

      const newUserMsg = {
        id: Date.now(),
        user: currentUser.fullName || "Bạn",
        text: chatInput.trim(),
        isBot: false,
        avatar: currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
      };

      setChatMessages((prev) => [...prev, newUserMsg]);
      setChatInput("");
    }
  };

  // Like livestream (Thả tim)
  const handleLikeClick = async () => {
    const isNumericId = /^\d+$/.test(id);
    if (isNumericId) {
      try {
        const res = await apiClient.post(`/api/livestreams/${id}/like`);
        setBackendStream(prev => ({
          ...prev,
          heartsCount: res.data
        }));
      } catch (err) {
        console.error("Lỗi thả tim:", err);
      }
    } else {
      showToast("Cảm ơn bạn đã thả tim! ❤️", "success");
    }
  };

  // Functional add to cart logic (with livestream price override for logged-in users)
  const handleBuyProduct = async (product) => {
    if (streamData.status === "upcoming") {
      showToast(`Sản phẩm "${product.name}" sẽ chính thức mở bán khi phiên live lên sóng!`, "info");
      return;
    }

    // Lấy giá livestream (đã giảm) hoặc giá gốc
    const livePrice = product.price;
    const currentLivestreamId = /^\d+$/.test(id) ? Number(id) : null;

    // Kiểm tra xem user đã đăng nhập chưa (dùng cùng key với apiClient.js)
    const token = localStorage.getItem("farmconnect_token");
    const isLoggedIn = !!token;

    if (isLoggedIn && currentLivestreamId) {
      // Người dùng đã đăng nhập → gọi API backend với giá live
      try {
        showToast(`Đã thêm "${product.name}" vào giỏ hàng với giá ưu đãi Live! 🛒`, "success");
        window.dispatchEvent(new Event("cartUpdated"));
        await cartService.addToCart(product.id, 1, livePrice, currentLivestreamId);
      } catch (err) {
        console.error("Lỗi thêm vào giỏ hàng:", err);
        const errorMsg = typeof err.response?.data === "string"
          ? err.response.data
          : "Không thể thêm vào giỏ hàng. Vui lòng thử lại!";
        showToast(errorMsg, "error");
      }
    } else {
      // Chưa đăng nhập hoặc không phải livestream thật → dùng localStorage (guest flow)
      const localCart = JSON.parse(localStorage.getItem("agrimarket_cart")) || [];
      const existingItemIndex = localCart.findIndex((item) => item.id === product.id);

      if (existingItemIndex > -1) {
        localCart[existingItemIndex].quantity += 1;
        // Cập nhật giá live nếu chưa có
        if (!localCart[existingItemIndex].livestreamPrice && livePrice) {
          localCart[existingItemIndex].price = livePrice;
          localCart[existingItemIndex].livestreamPrice = livePrice;
          localCart[existingItemIndex].livestreamId = currentLivestreamId;
        }
      } else {
        localCart.push({
          id: product.id,
          name: product.name,
          price: livePrice,
          unit: product.unit,
          imageUrl: product.imageUrl,
          quantity: 1,
          checked: true,
          stockQuantity: product.stockQuantity,
          farmerId: product.farmerId,
          farmerName: product.farmerName,
          livestreamPrice: currentLivestreamId ? livePrice : null,
          livestreamId: currentLivestreamId,
        });
      }

      localStorage.setItem("agrimarket_cart", JSON.stringify(localCart));

      // Dispatch custom event để Header cập nhật badge giỏ hàng
      window.dispatchEvent(new Event("cartUpdated"));

      showToast(`Đã thêm "${product.name}" vào giỏ hàng thành công! 🛒`, "success");
    }
  };

  const pinnedProduct = streamData.pinnedProductId && streamData.products
    ? streamData.products.find(p => Number(p.id) === Number(streamData.pinnedProductId))
    : null;

  return (
    <div className="livestream-page-root">
      {/* App Header */}
      <Header activeTab="live" />

      {/* Back Button and Navigation Path */}
      <div className="livestream-nav-bar">
        <button className="btn-back-to-list" onClick={() => navigate("/livestream")}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Quay lại danh sách
        </button>
        <span className="nav-divider">/</span>
        <span className="nav-current-title">{streamData.title}</span>
      </div>

      {/* Main Livestream Layout */}
      <main className="livestream-main-wrapper">
        <div className="livestream-layout-grid">
          
          {/* LEFT SIDE: Video Feed & Info */}
          <div className="livestream-left-column">
            
            {/* Simulated Live Video Player */}
            <div className={`video-player-container state-${streamData.status} ${streamData.isBanned ? "is-banned" : ""}`}>
              {streamData.isBanned ? (
                <div className="video-viewport banned" onClick={(e) => e.stopPropagation()}>
                  <div className="banned-blur-bg" style={{ backgroundImage: `url(${streamData.videoSrc})` }}></div>
                  <div className="banned-media-overlay">
                    <div className="banned-icon-wrapper">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18.63 11.37L12 4.74l-6.63 6.63a3.56 3.56 0 1 0 5 5l6.63-6.63c.27-.27.42-.64.42-1.02V8.18c0-.66-.54-1.2-1.2-1.2h-.55a1.44 1.44 0 0 0-1.02.42L8.03 14.03a3.56 3.56 0 1 0 5 5l5.6-5.6"></path>
                        <path d="m14 11 1.5 1.5"></path>
                      </svg>
                    </div>
                    <h3 className="banned-overlay-title">PHIÊN PHÁT SÓNG ĐÃ DỪNG</h3>
                    <div className="banned-explanation-box">
                      Phiên livestream này đã bị quản trị viên dừng phát sóng do vi phạm tiêu chuẩn cộng đồng.
                    </div>
                    <div className="banned-overlay-actions">
                      <button className="btn-banned-more-info" onClick={() => setToast({ show: true, message: "Đã mở trang hướng dẫn tiêu chuẩn cộng đồng.", type: "success" })}>
                        Tìm hiểu thêm
                      </button>
                      <button className="btn-banned-report" onClick={() => setToast({ show: true, message: "Cảm ơn bạn đã đóng góp ý kiến.", type: "success" })}>
                        Báo cáo thêm
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="video-viewport" onClick={streamData.status === "live" || streamData.status === "ended" ? null : togglePlay}>
                  {streamData.status === "ended" ? (
                    <div className="upcoming-media-overlay" style={{ background: "rgba(15, 23, 42, 0.9)" }} onClick={(e) => e.stopPropagation()}>
                      <div className="upcoming-glass-card" style={{ padding: "30px", textAlign: "center" }}>
                        <span style={{ fontSize: "3rem", marginBottom: "16px", display: "block" }}>🏁</span>
                        <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f8fafc", margin: "0 0 10px 0" }}>
                          PHIÊN LIVESTREAM ĐÃ KẾT THÚC
                        </h3>
                        <p style={{ fontSize: "0.95rem", color: "#94a3b8", margin: "0 0 20px 0" }}>
                          Cảm ơn bạn đã theo dõi! Nhà vườn hẹn gặp lại bạn ở các phiên livestream tiếp theo.
                        </p>
                        <button 
                          onClick={() => navigate("/livestream")}
                          style={{
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#059669"}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#10b981"}
                        >
                          Xem các phiên live khác
                        </button>
                      </div>
                    </div>
                  ) : agoraToken && isPlaying ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="video-background-img playing"
                      style={{ objectFit: "cover", width: "100%", height: "100%", background: "#000", transform: "scaleX(-1)" }}
                    ></video>
                  ) : (
                    <img 
                      src={streamData.videoSrc} 
                      alt="Livestream nông trại" 
                      className={`video-background-img ${isPlaying && streamData.status !== "upcoming" ? "playing" : "paused"}`}
                    />
                  )}

                  {pinnedProduct && (
                    <div 
                      className="pinned-product-overlay" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleBuyProduct(pinnedProduct); 
                      }} 
                      style={{ cursor: "pointer" }}
                    >
                      <img src={pinnedProduct.imageUrl} alt={pinnedProduct.name} className="pinned-prod-img" />
                      <div className="pinned-prod-info">
                        <span className="pinned-prod-badge">🔥 ĐANG GHIM</span>
                        <h4 className="pinned-prod-name">{pinnedProduct.name}</h4>
                        <div className="pinned-prod-prices">
                          {pinnedProduct.discountPercent > 0 && (
                            <span className="pinned-price-orig">{pinnedProduct.originalPrice.toLocaleString()}đ</span>
                          )}
                          <span className="pinned-price-live">{pinnedProduct.price.toLocaleString()}đ</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Play/Pause center overlay icon on hover or action */}
                  {showPlayOverlay && streamData.status !== "upcoming" && (
                    <div className="center-play-overlay">
                      {isPlaying ? (
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="white">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Upcoming Livestream Overlay */}
                  {streamData.status === "upcoming" && (
                    <div className="upcoming-media-overlay" onClick={(e) => e.stopPropagation()}>
                      <div className="upcoming-glass-card">
                        <div className="upcoming-timer-badge">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                            <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Sắp lên sóng
                        </div>
                        <h3>Phiên Live Sắp Bắt Đầu</h3>
                        <p className="scheduled-date-string">Thời gian phát sóng: <strong>{streamData.scheduledTime}</strong></p>
                        <button 
                          className={`upcoming-action-notify-btn ${isSubscribed ? "subscribed" : ""}`}
                          onClick={handleToggleSubscribe}
                        >
                          {isSubscribed ? (
                            <>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: "6px" }}>
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                              </svg>
                              Đã đăng ký nhận tin
                            </>
                          ) : (
                            "Đăng ký nhận thông báo"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Top Overlay Badges */}
                  <div className="video-top-overlays">
                    {streamData.status === "live" && (
                      <span className="live-status-badge">
                        <span className="live-dot"></span>
                        TRỰC TIẾP
                      </span>
                    )}
                    {streamData.status === "upcoming" && (
                      <span className="live-status-badge upcoming-badge">
                        LÊN LỊCH
                      </span>
                    )}
                    {streamData.status === "replay" && (
                      <span className="live-status-badge replay-badge">
                        PHÁT LẠI
                      </span>
                    )}
                    
                    <span className="viewers-count-badge">
                      {streamData.status === "live" && (
                        <svg className="viewer-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      )}
                      {streamData.viewersCount}
                    </span>
                  </div>

                  {/* Bottom Video Controls (Hide on upcoming) */}
                  {streamData.status !== "upcoming" && (
                    <div className="video-bottom-controls" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Progress Line */}
                      <div className="video-progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: streamData.status === "replay" ? (isPlaying ? "65%" : "35%") : (isPlaying ? "100%" : "99%") }}
                        ></div>
                      </div>

                      <div className="controls-flex">
                        <div className="controls-left">
                          {/* Play/Pause Button */}
                          {streamData.status !== "live" && (
                            <button className="control-btn" onClick={togglePlay} title={isPlaying ? "Tạm dừng" : "Phát"}>
                              {isPlaying ? (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                          )}

                          {/* Volume controls */}
                          <div className="volume-control-group">
                            <button className="control-btn" onClick={toggleMute}>
                              {isMuted || volume === 0 ? (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                              )}
                            </button>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={isMuted ? 0 : volume} 
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setVolume(val);
                                if (val === 0) {
                                  setIsMuted(true);
                                } else {
                                  setIsMuted(false);
                                  setPrevVolume(val);
                                }
                              }}
                              className="volume-slider-bar" 
                              style={{
                                "--volume-percent": `${isMuted ? 0 : volume}%`
                              }}
                            />
                          </div>
                        </div>

                        <div className="controls-right">
                          {streamData.status === "replay" && (
                            <span className="live-timer-duration">
                              00:45:12 / 01:15:30
                            </span>
                          )}

                          <button className="control-btn heart-btn" onClick={handleLikeClick} title="Thả tim" style={{ color: "#ef4444", fontSize: "1.1rem" }}>
                            ❤️ {backendStream ? backendStream.heartsCount : 0}
                          </button>
                          
                          <button className="control-btn" title="Cài đặt">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                            </svg>
                          </button>

                          <button className="control-btn" onClick={handleFullscreen} title="Toàn màn hình">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Livestream Title & Description */}
            <div className="livestream-info-card" style={{
              backgroundColor: "white",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "16px",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)"
            }}>
              <h1 className="livestream-info-title" style={{
                fontSize: "1.3rem",
                fontWeight: "700",
                color: "#0f172a",
                margin: "0 0 8px 0"
              }}>
                {streamData.title}
              </h1>
              {streamData.description && (
                <p className="livestream-info-desc" style={{
                  fontSize: "0.95rem",
                  color: "#475569",
                  margin: 0,
                  whiteSpace: "pre-line"
                }}>
                  {streamData.description}
                </p>
              )}
            </div>

            {/* Farmer Profile & Voucher Row */}
            <div className="farmer-voucher-cards-row">
              
              {/* Farmer Info Card */}
              <div className="livestream-farmer-card">
                <div className="profile-details-left">
                  <img src={streamData.farmerAvatar} alt={streamData.farmerName} className="livestream-farmer-avatar" />
                  <div className="livestream-farmer-meta">
                    <h3 className="livestream-farmer-name">{streamData.farmerName}</h3>
                    <p className="livestream-farmer-brand">{streamData.farmerBrand}</p>
                    <span className="verified-badge-label">
                      <svg className="verified-badge-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Nhà vườn đã xác minh
                    </span>
                  </div>
                </div>
                <div className="farmer-actions-group">
                  <button 
                    className="btn-visit-farm" 
                    onClick={() => navigate(`/farmer-profile/${streamData.farmerId}`)} 
                    title="Ghé thăm Trang trại"
                  >
                    🏡 Trang trại
                  </button>
                  <button 
                    className={`follow-toggle-btn ${isFollowing ? "following-state" : "unfollowed-state"}`}
                    onClick={handleFollowToggle}
                  >
                    {isFollowing ? (
                      <>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: "4px" }}>
                          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                        </svg>
                        Đang theo dõi
                      </>
                    ) : (
                      "+ Theo dõi"
                    )}
                  </button>
                  <button className="btn-chat-shop" onClick={handleOpenShopChat} title="Nhắn tin riêng với shop">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Live Voucher Coupon Card */}
              <div className={`live-voucher-deal-card status-${streamData.status}`}>
                <div className="voucher-details-left">
                  <div className="deal-status-badge">
                    {streamData.status === "live" ? "ƯU ĐÃI TRÊN LIVE" : streamData.status === "upcoming" ? "ƯU ĐÃI SẮP DIỄN RA" : "ƯU ĐÃI ĐÃ KẾT THÚC"}
                  </div>
                  <h4 className="voucher-promo-text">{streamData.voucherTitle}</h4>
                  {streamData.status === "live" && (
                    <div className="voucher-timer-countdown">
                      Kết thúc sau <span className="timer-digits-monospace">{formatVoucherTime(voucherTime)}</span>
                    </div>
                  )}
                  {streamData.status === "upcoming" && (
                    <div className="voucher-timer-countdown">
                      Sẽ kích hoạt khi phiên live lên sóng
                    </div>
                  )}
                  {streamData.status === "replay" && (
                    <div className="voucher-timer-countdown">
                      Mã ưu đãi đã hết hạn sử dụng
                    </div>
                  )}
                </div>
                <button 
                  className={`claim-voucher-action-btn ${voucherClaimed || streamData.status !== "live" ? "claimed-state" : "active-state"}`}
                  onClick={handleClaimVoucher}
                  disabled={voucherClaimed || streamData.status !== "live"}
                >
                  <svg className="voucher-ticket-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M20 12c0-1.1.9-2 2-2V8c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2v2c1.1 0 1.99.9 1.99 2s-.89 2-2 2v2c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-2c-1.1 0-2-.9-2-2zm-9 1.5H9v-3h2v3zm4 0h-2v-3h2v3z"/>
                  </svg>
                  {streamData.status !== "live" ? "Hết hạn" : voucherClaimed ? "Đã nhận" : "Nhận Voucher"}
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT SIDE: Chat & Products */}
          <div className="livestream-right-column">
            
            {/* Live Chat Panel */}
            <div className="live-chat-panel-card">
              <div className="chat-header-row">
                <svg className="chat-bubble-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                </svg>
                <h3 className="chat-title-heading">
                  {streamData.status === "live" ? "Trò chuyện trực tiếp" : streamData.status === "upcoming" ? "Phòng chờ phiên live" : "Lịch sử cuộc trò chuyện"}
                </h3>
              </div>

              {/* Scrollable chat messages container */}
              {streamData.isBanned ? (
                <div className="banned-chat-placeholder">
                  <div className="banned-chat-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                  </div>
                  <p className="banned-chat-title">Tính năng trò chuyện không khả dụng</p>
                  <p className="banned-chat-desc">Khung chat đã bị vô hiệu hóa cùng với phiên phát sóng này.</p>
                </div>
              ) : (
                <>
                  {streamData.pinnedComment && (
                    <div className="spectator-pinned-chat-row" style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "#fef3c7",
                      borderBottom: "1px solid #fcd34d",
                      padding: "8px 12px",
                      fontSize: "0.85rem",
                      color: "#78350f"
                    }}>
                      <span style={{ fontWeight: "700", whiteSpace: "nowrap" }}>📌 Đã ghim:</span>
                      <span style={{ fontWeight: "600", whiteSpace: "nowrap" }}>{streamData.pinnedComment.user}:</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {streamData.pinnedComment.text}
                      </span>
                    </div>
                  )}
                  <div className="chat-messages-container" ref={chatContainerRef} style={{ padding: "12px" }}>
                    {chatMessages.map((msg) => {
                      const currentUser = JSON.parse(localStorage.getItem("farmconnect_user")) || {};
                      const currentUserName = currentUser.fullName || "Bạn";
                      const isSelf = msg.user === currentUserName;

                      return (
                        <div 
                          key={msg.id} 
                          className={`chat-message-bubble-wrapper ${isSelf ? "self-bubble-wrapper" : ""} ${msg.isBot ? "bot-highlight-bubble" : ""}`}
                          style={{
                            display: "flex",
                            flexDirection: isSelf ? "row-reverse" : "row",
                            alignItems: "flex-start",
                            gap: "8px",
                            marginBottom: "12px",
                            alignSelf: isSelf ? "flex-end" : "flex-start",
                            width: "100%"
                          }}
                        >
                          {!msg.isBot && (
                            <img 
                              src={msg.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                              alt={msg.user} 
                              className="chat-user-avatar-circle" 
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                objectFit: "cover"
                              }}
                            />
                          )}
                          <div 
                            className="message-content-inner"
                            style={{
                              backgroundColor: isSelf ? "#eff6ff" : (msg.isHost ? "#ecfdf5" : "#f1f5f9"),
                              border: isSelf ? "1px solid #bfdbfe" : (msg.isHost ? "1px solid #a7f3d0" : "1px solid #e2e8f0"),
                              padding: "8px 12px",
                              borderRadius: "12px",
                              borderTopRightRadius: isSelf ? "0" : "12px",
                              borderTopLeftRadius: isSelf ? "12px" : "0",
                              maxWidth: "75%",
                              textAlign: "left"
                            }}
                          >
                            <div className="chat-user-name-title" style={{
                              fontWeight: "700",
                              fontSize: "0.75rem",
                              color: isSelf ? "#1e40af" : (msg.isHost ? "#065f46" : "#475569"),
                              marginBottom: "2px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}>
                              {msg.isBot ? (
                                <span className="bot-badge-name-row" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <svg className="bot-status-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                  </svg>
                                  {msg.user}
                                </span>
                              ) : (
                                <>
                                  <span>{msg.user}</span>
                                  {msg.isHost && (
                                    <span className="host-badge-tag" style={{
                                      backgroundColor: "#059669",
                                      color: "white",
                                      padding: "1px 4px",
                                      borderRadius: "3px",
                                      fontSize: "0.6rem",
                                      fontWeight: "700",
                                      lineHeight: "1"
                                    }}>
                                      Chủ phòng
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <p className="chat-message-body-text" style={{ margin: 0, fontSize: "0.85rem", color: "#1e293b", wordBreak: "break-word" }}>
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="chat-input-row-form">
                <input
                  type="text"
                  placeholder={
                    streamData.status === "upcoming"
                      ? "Phòng chat chưa mở..."
                      : streamData.isBlocked
                      ? "Bạn đã bị chặn bình luận trong phiên live này"
                      : "Nhập tin nhắn..."
                  }
                  value={chatInput}
                  disabled={streamData.status === "upcoming" || streamData.isBlocked}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="chat-text-input-field"
                  style={streamData.isBlocked ? { backgroundColor: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" } : {}}
                />
                <button
                  type="submit"
                  className="chat-submit-action-btn"
                  disabled={streamData.status === "upcoming" || streamData.isBlocked}
                  title="Gửi tin nhắn"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Featured Products list panel */}
            <div className="featured-products-panel-card">
              <div className="products-header-row">
                <svg className="shopping-bag-status-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/>
                </svg>
                <h3 className="products-title-heading">
                  {streamData.status === "upcoming" ? "Sản phẩm sẽ bán" : "Sản phẩm trong Live"}
                </h3>
              </div>

              <div className="products-list-scrollable">
                {streamData.products.map((prod) => {
                  const hasDiscount = prod.discountPercent > 0 || (prod.originalPrice && prod.price < prod.originalPrice);
                  return (
                    <div key={prod.id} className="product-row-item-card">
                      <img src={prod.imageUrl} alt={prod.name} className="product-thumbnail-img" />
                      <div className="product-details-mid">
                        <h4 className="product-title-text">{prod.name}</h4>
                        <p className="product-specifications-text">{prod.unit}</p>
                        {hasDiscount ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="product-price-label" style={{ color: "#ef4444", fontWeight: "700" }}>
                              {prod.price.toLocaleString()}đ
                            </span>
                            <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "0.85rem" }}>
                              {prod.originalPrice.toLocaleString()}đ
                            </span>
                          </div>
                        ) : (
                          <span className="product-price-label">
                            {prod.price.toLocaleString()}đ
                          </span>
                        )}
                      </div>
                      <button 
                        className={`product-purchase-action-btn status-${streamData.status}`}
                        onClick={() => handleBuyProduct(prod)}
                      >
                        {streamData.status === "upcoming" ? "Xem trước" : "Mua"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </main>



      {/* Stacked Toasts Container */}
      {toast.show && (
        <div className="toast-container">
          <div className={`custom-toast ${toast.type}`}>
            <span className="custom-toast-icon">
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
            </span>
            <span className="custom-toast-message">{toast.message}</span>
            <button className="custom-toast-close" onClick={() => setToast({ show: false })}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivestreamPage;
