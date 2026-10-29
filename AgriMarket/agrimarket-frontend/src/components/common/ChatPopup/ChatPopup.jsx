import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  X, 
  ArrowLeft, 
  Image as ImageIcon, 
  Paperclip, 
  PlusCircle, 
  SendHorizontal, 
  CheckCheck,
  CheckCircle2,
  Pin,
  BellOff,
  Trash2,
  Ban,
  Info,
  ChevronDown,
  MoreVertical,
  FileText,
  MapPin,
  UserSquare2,
  Download,
  MessageCircle,
  Bot,
  Sparkles
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import chatService from "../../../services/chatService";
import authService from "../../../services/authService";
import aiService from "../../../services/aiService";
import "./ChatPopup.css";

// Danh sách ảnh gửi mẫu mặc định
const DEFAULT_MEDIA_IMAGES = [
  "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&auto=format&fit=crop&q=80", // cà rốt
  "https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=300&auto=format&fit=crop&q=80", // súp lơ
  "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&auto=format&fit=crop&q=80", // cà chua
  "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=300&auto=format&fit=crop&q=80", // dứa
  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300&auto=format&fit=crop&q=80", // bắp cải
  "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=300&auto=format&fit=crop&q=80", // dưa leo
  "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&auto=format&fit=crop&q=80", // chuối
  "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=300&auto=format&fit=crop&q=80"  // cải thảo
];

// Dữ liệu mẫu khởi tạo ban đầu đã được xoá để kết nối backend thực tế
const INITIAL_CHATS = [];
const ALL_SYSTEM_FARMS = [];
const AUTO_RESPONSES = [];

// Danh sách tin nhắn nhanh mẫu
const QUICK_REPLIES = [
  "Nông sản hôm nay có những loại nào tươi vậy vườn?",
  "Bao lâu thì đơn hàng của mình được ship đi ạ?",
  "Nông trại mình có bán sỉ số lượng lớn không?",
  "Rau củ này có đạt chuẩn VietGAP không bạn?"
];

export const ChatPopup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const loggedInUser = authService.getCurrentUser();

  const isFarmerDashboard = location.pathname === "/farmer" || location.pathname.startsWith("/farmer/");
  const shouldHideChat = isFarmerDashboard || 
                         location.pathname.startsWith("/admin") || 
                         location.pathname.startsWith("/shipper") ||
                         location.pathname.startsWith("/login") ||
                         location.pathname.startsWith("/register");
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState("list"); // 'list' | 'chat' | 'new-chat'
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatQuery, setNewChatQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread' | 'pinned'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [inputText, setInputText] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [suggestedFarms, setSuggestedFarms] = useState([]);
  const [rowActionMenuId, setRowActionMenuId] = useState(null);

  // States cho Options Menu (3 chấm), Modal Thông tin, Modal Kho ảnh, Zoom Ảnh và Quick Actions
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const optionsMenuRef = useRef(null);
  
  // Refs cho input file ẩn
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── AgriBot AI Chat States ──────────────────────────────────────────────
  const [aiMessages, setAiMessages] = useState([
    {
      id: "agribot-welcome",
      role: "model",
      text: "Xin chào! Tôi là AgriBot 🤖 - trợ lý AI của AgriMarket.\n\nTôi có thể giúp bạn:\n• Hỏi đáp về nông sản (bảo quản, dinh dưỡng, cách chọn) 🌿\n• Hướng dẫn đặt hàng và thanh toán 🛒\n• Tư vấn sản phẩm phù hợp 🍅\n• Giải đáp chính sách giao hàng, đổi trả 📦\n\nBạn cần giúp gì nào?"
    }
  ]);
  const [aiInputText, setAiInputText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiMessagesEndRef = useRef(null);
  const AGRIBOT_QUICK_REPLIES = [
    "🛒 Cách đặt hàng?",
    "🚚 Phí vận chuyển bao nhiêu?",
    "🌿 Rau củ nên bảo quản thế nào?",
    "💳 Có những hình thức thanh toán nào?",
  ];
  // ──────────────────────────────────────────────────────────────────────────

  // Fetch conversations from backend
  const fetchConversations = async () => {
    const token = localStorage.getItem("farmconnect_token");
    if (!token) return;
    try {
      const data = await chatService.getConversations("customer");
      const pinnedIds = getPinnedIds();
      const clearedTimes = getClearedHistoryTimes();

      const sanitized = data.map(c => {
        const idStr = String(c.id);
        const clearedTime = clearedTimes[idStr] || 0;
        const filteredMessages = c.messages.filter(m => (m.timestamp || 0) > clearedTime);
        return {
          ...c,
          id: idStr,
          isPinned: pinnedIds.includes(idStr),
          isBlocked: c.isBlocked,
          messages: filteredMessages,
          mediaImages: c.mediaImages && c.mediaImages.length > 0 ? c.mediaImages : [...DEFAULT_MEDIA_IMAGES]
        };
      });
      setChats(sanitized);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  // Đóng Options Menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOptionsMenu]);

  // Đóng Row Action Menu khi click bên ngoài
  useEffect(() => {
    const handleCloseRowMenu = (event) => {
      const menu = document.querySelector(".zalo-item-dropdown-menu");
      const btn = document.querySelector(".zalo-item-more-btn");
      if (menu && !menu.contains(event.target) && btn && !btn.contains(event.target)) {
        setRowActionMenuId(null);
      }
    };
    if (rowActionMenuId) {
      document.addEventListener("mousedown", handleCloseRowMenu);
    }
    return () => {
      document.removeEventListener("mousedown", handleCloseRowMenu);
    };
  }, [rowActionMenuId]);

  // Lắng nghe sự kiện mở chat từ các trang ProductDetail hoặc FarmerProfile
  useEffect(() => {
    const handleOpenChatEvent = async (e) => {
      const { farmId } = e.detail;
      setIsOpen(true); // Mở cửa sổ chat popup lên
      
      const token = localStorage.getItem("farmconnect_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const startedConv = await chatService.startConversation(farmId);
        const sanitized = {
          ...startedConv,
          id: String(startedConv.id)
        };
        await fetchConversations();
        handleSelectFarm(sanitized);
      } catch (err) {
        console.error("Failed to start conversation:", err);
      }
    };
    
    window.addEventListener("open_agrimarket_chat", handleOpenChatEvent);
    return () => {
      window.removeEventListener("open_agrimarket_chat", handleOpenChatEvent);
    };
  }, [chats]);

  // Tính tổng unread
  useEffect(() => {
    const count = chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
    setTotalUnread(count);
  }, [chats]);

  // Auto-scroll cho chat thường
  useEffect(() => {
    if (activeView === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeView, selectedFarm, chats]);

  // Auto-scroll cho AgriBot
  useEffect(() => {
    if (activeView === "agribot" && aiMessagesEndRef.current) {
      aiMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeView, aiMessages]);

  // Fetch suggested farmers when new-chat query changes
  useEffect(() => {
    if (activeView === "new-chat") {
      const loadSuggestedFarms = async () => {
        try {
          const data = await chatService.suggestFarmers(newChatQuery);
          setSuggestedFarms(data);
        } catch (err) {
          console.error("Failed to load suggested farms:", err);
        }
      };
      loadSuggestedFarms();
    }
  }, [newChatQuery, activeView]);

  const handleSelectFarm = async (farm) => {
    setSelectedFarm(farm);
    setActiveView("chat");
    setShowOptionsMenu(false);
    setShowQuickActions(false);

    try {
      await chatService.getMessages(farm.id);
      fetchConversations();
    } catch (err) {
      console.error("Failed to fetch messages for conversation:", err);
    }
  };

  // ── AgriBot Handlers ───────────────────────────────────────────────────
  const handleSelectAgriBot = () => {
    setActiveView("agribot");
    setSelectedFarm(null);
    setShowOptionsMenu(false);
  };

  const handleSendAiMessage = async (text) => {
    const messageText = (text || aiInputText).trim();
    if (!messageText || aiLoading) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user", text: messageText };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInputText("");
    setAiLoading(true);

    try {
      // Build history for multi-turn (exclude welcome message)
      const history = aiMessages
        .filter(m => m.id !== "agribot-welcome")
        .map(m => ({ role: m.role, text: m.text }));

      const reply = await aiService.chat(messageText, history);
      const botMsg = { id: `b-${Date.now()}`, role: "model", text: reply };
      setAiMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        id: `err-${Date.now()}`,
        role: "model",
        text: "Xin lỗi, tôi gặp lỗi khi xử lý. Vui lòng thử lại! 🙏"
      };
      setAiMessages(prev => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const handleBackToList = () => {
    setActiveView("list");
    setSelectedFarm(null);
    setShowOptionsMenu(false);
    setShowQuickActions(false);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedFarm) return;

    const currentDetail = chats.find(c => String(c.id) === String(selectedFarm.id));
    if (currentDetail?.isBlocked) return;

    const content = inputText.trim();
    setInputText("");

    try {
      await chatService.sendMessage(selectedFarm.id, {
        content: content,
        type: "text"
      });
      fetchConversations();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Gửi ảnh thực tế qua FileReader (base64)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFarm) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      try {
        await chatService.sendMessage(selectedFarm.id, {
          content: base64Data,
          type: "image"
        });
        fetchConversations();
      } catch (err) {
        console.error("Failed to upload image:", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset input
  };

  // Gửi File đính kèm thực tế (Metadata hiển thị)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFarm) return;

    let sizeStr = "";
    if (file.size < 1024 * 1024) {
      sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    } else {
      sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      try {
        await chatService.sendMessage(selectedFarm.id, {
          content: base64Data,
          type: "file",
          fileName: file.name,
          fileSize: sizeStr
        });
        fetchConversations();
      } catch (err) {
        console.error("Failed to upload file:", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset input
  };

  // Gửi vị trí giả lập
  const handleSendLocation = async () => {
    if (!selectedFarm) return;
    try {
      await chatService.sendMessage(selectedFarm.id, {
        content: "Vị trí chia sẻ",
        type: "location",
        locationName: "Vị trí của tôi (Đang ở gần chợ nông sản Đà Lạt)",
        mapUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=300&q=70"
      });
      setShowQuickActions(false);
      fetchConversations();
    } catch (err) {
      console.error("Failed to send location:", err);
    }
  };

  // Gửi danh thiếp mẫu
  const handleSendContactCard = async () => {
    if (!selectedFarm) return;
    try {
      await chatService.sendMessage(selectedFarm.id, {
        content: "Chia sẻ danh thiếp",
        type: "contact",
        contactName: "Bùi Khắc Hưng (Nông dân số)",
        contactPhone: "0912 999 888",
        contactAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
      });
      setShowQuickActions(false);
      fetchConversations();
    } catch (err) {
      console.error("Failed to send contact card:", err);
    }
  };

  // Click chọn tin nhắn nhanh mẫu
  const handleSendQuickReply = async (text) => {
    if (!selectedFarm) return;
    try {
      await chatService.sendMessage(selectedFarm.id, {
        content: text,
        type: "text"
      });
      setShowQuickActions(false);
      fetchConversations();
    } catch (err) {
      console.error("Failed to send quick reply:", err);
    }
  };

  const handleCreateNewConversation = async (farm) => {
    const token = localStorage.getItem("farmconnect_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    try {
      const startedConv = await chatService.startConversation(farm.id);
      const sanitized = {
        ...startedConv,
        id: String(startedConv.id)
      };
      await fetchConversations();
      handleSelectFarm(sanitized);
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
    setNewChatQuery("");
  };

  const getPrefsKey = (type) => {
    const user = authService.getCurrentUser();
    const email = user?.email || "anonymous";
    return `agrimarket_chat_${type}_${email}`;
  };

  const getPinnedIds = () => {
    const key = getPrefsKey("pinned");
    return JSON.parse(localStorage.getItem(key)) || [];
  };

  const getBlockedIds = () => {
    const key = getPrefsKey("blocked");
    return JSON.parse(localStorage.getItem(key)) || [];
  };

  const getClearedHistoryTimes = () => {
    const key = getPrefsKey("cleared");
    return JSON.parse(localStorage.getItem(key)) || {};
  };

  const handleTogglePin = (farmId) => {
    const idStr = String(farmId);
    const key = getPrefsKey("pinned");
    let pinned = getPinnedIds();
    if (pinned.includes(idStr)) {
      pinned = pinned.filter(id => id !== idStr);
    } else {
      pinned.push(idStr);
    }
    localStorage.setItem(key, JSON.stringify(pinned));
    
    setChats(prev => prev.map(c => String(c.id) === idStr ? { ...c, isPinned: !c.isPinned } : c));
    setShowOptionsMenu(false);
  };

  const handleToggleBlock = async (farmId) => {
    const idStr = String(farmId);
    try {
      const updated = await chatService.toggleBlock(idStr);
      setChats(prev => prev.map(c => String(c.id) === idStr ? { ...c, isBlocked: updated.isBlocked, blockedBy: updated.blockedBy } : c));
      setShowOptionsMenu(false);
    } catch (err) {
      console.error("Failed to toggle block:", err);
      alert(err.response?.data || "Không thể thực hiện chặn/bỏ chặn.");
    }
  };

  const handleClearHistory = async (farmId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này không?")) {
      const idStr = String(farmId);
      try {
        await chatService.deleteConversation(idStr);
        setChats(prev => prev.filter(c => String(c.id) !== idStr));
        if (selectedFarm && String(selectedFarm.id) === idStr) {
          setSelectedFarm(null);
          setActiveView("list");
        }
        
        // Dọn dẹp localStorage cho cuộc trò chuyện bị xóa
        const cleanLocalStorage = (type) => {
          const key = getPrefsKey(type);
          const list = JSON.parse(localStorage.getItem(key)) || [];
          const filtered = list.filter(id => String(id) !== idStr);
          localStorage.setItem(key, JSON.stringify(filtered));
        };
        cleanLocalStorage("pinned");
        cleanLocalStorage("blocked");
        const clearedKey = getPrefsKey("cleared");
        const cleared = JSON.parse(localStorage.getItem(clearedKey)) || {};
        delete cleared[idStr];
        localStorage.setItem(clearedKey, JSON.stringify(cleared));

        setShowOptionsMenu(false);
      } catch (err) {
        console.error("Failed to delete conversation:", err);
        alert(err.response?.data || "Không thể xóa cuộc trò chuyện.");
      }
    }
  };

  const handleFeatureUnderDevelopment = (featureName) => {
    alert(`Tính năng ${featureName} đang được phát triển, hãy nhắn tin trò chuyện bằng văn bản nhé!`);
  };

  const getSortedChats = (chatsList) => {
    return [...chatsList].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aLast = a.messages[a.messages.length - 1];
      const bLast = b.messages[b.messages.length - 1];
      if (!aLast) return 1;
      if (!bLast) return -1;

      return (bLast.timestamp || 0) - (aLast.timestamp || 0);
    });
  };

  const sortedChats = getSortedChats(chats);

  const filteredChats = sortedChats.filter((chat) => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.messages.some(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "unread") return chat.unreadCount > 0;
    if (activeTab === "pinned") return chat.isPinned;

    return true;
  });

  const currentChatDetail = selectedFarm ? (chats.find(c => String(c.id) === String(selectedFarm.id)) || selectedFarm) : null;

  if (shouldHideChat) {
    return null;
  }

  return (
    <div className={`zalo-chat-container ${isOpen ? "zalo-popup-open" : ""}`}>
      {/* Inputs File Ẩn cho Chọn Ảnh / Tài liệu */}
      <input 
        type="file" 
        accept="image/*" 
        style={{ display: "none" }} 
        ref={imageInputRef} 
        onChange={handleImageUpload} 
      />
      <input 
        type="file" 
        accept="*" 
        style={{ display: "none" }} 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* 1. Floating Trigger Button */}
      <button 
        className="zalo-chat-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Mở cửa sổ chat"
      >
        <div className="zalo-trigger-icon-wrapper">
          <MessageCircle className="zalo-chat-icon" size={22} />
          <span className="zalo-trigger-text">Chat</span>
        </div>
        {totalUnread > 0 && (
          <span className="zalo-trigger-badge">{totalUnread}</span>
        )}
      </button>

      {/* Main Popup Window */}
      {isOpen && (
        <div className="zalo-chat-popup">
          
          {/* VIEW: LIST CHAT */}
          {activeView === "list" && (
            <div className="zalo-chat-list-view zalo-animate-fade-in">
              {/* Header */}
              <div className="zalo-chat-popup-header">
                <div className="zalo-header-title-wrapper">
                  <h3>
                    Tin nhắn 
                    {totalUnread > 0 && (
                      <span className="zalo-unread-number"> ({totalUnread})</span>
                    )}
                  </h3>
                </div>
                <div className="zalo-header-actions">
                  <button className="zalo-icon-btn zalo-header-btn zalo-text-primary-dark" onClick={() => setActiveView("new-chat")} title="Viết tin nhắn mới">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button className="zalo-icon-btn zalo-header-btn zalo-close-btn" onClick={() => setIsOpen(false)} title="Đóng chat">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Shopee Filter & Search Row */}
              <div className="shopee-chat-filter-row">
                <div className="shopee-search-wrapper">
                  <Search className="shopee-search-icon" size={15} />
                  <input 
                    type="text" 
                    placeholder="Tìm theo tên..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="shopee-clear-search" onClick={() => setSearchQuery("")}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                
                <div className="shopee-dropdown-container">
                  <button 
                    type="button"
                    className="shopee-dropdown-trigger"
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  >
                    <span>
                      {activeTab === "all" && "Tất cả"}
                      {activeTab === "unread" && "Chưa đọc"}
                      {activeTab === "pinned" && "Đã Ghim"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {showFilterDropdown && (
                    <div className="shopee-dropdown-menu">
                      <button 
                        type="button"
                        className={`shopee-dropdown-item ${activeTab === "all" ? "selected" : ""}`}
                        onClick={() => { setActiveTab("all"); setShowFilterDropdown(false); }}
                      >
                        Tất cả
                      </button>
                      <button 
                        type="button"
                        className={`shopee-dropdown-item ${activeTab === "unread" ? "selected" : ""}`}
                        onClick={() => { setActiveTab("unread"); setShowFilterDropdown(false); }}
                      >
                        Chưa đọc
                      </button>
                      <button 
                        type="button"
                        className={`shopee-dropdown-item ${activeTab === "pinned" ? "selected" : ""}`}
                        onClick={() => { setActiveTab("pinned"); setShowFilterDropdown(false); }}
                      >
                        Đã Ghim
                      </button>
                    </div>
                  )}
                </div>
              </div>



              {/* Chat list */}
              <div className="zalo-chat-list-content">

                {/* AgriBot Entry – luôn ở đầu danh sách */}
                <div
                  className={`zalo-chat-item-row agribot-entry ${activeView === "agribot" ? "zalo-active-item" : ""}`}
                  onClick={handleSelectAgriBot}
                  style={{ borderBottom: "1px solid #f0fdf4" }}
                >
                  <div className="zalo-avatar-wrapper">
                    <div className="agribot-avatar-circle">
                      🤖
                    </div>
                    <span className="zalo-online-indicator" style={{ background: "#16a34a" }}></span>
                  </div>
                  <div className="zalo-chat-item-info">
                    <div className="zalo-chat-item-header">
                      <span className="zalo-farm-name-wrapper">
                        <span className="zalo-farm-name" style={{ color: "#16a34a", fontWeight: 700 }}>AgriBot</span>
                        <span style={{ fontSize: "0.65rem", background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: "999px", fontWeight: 600, marginLeft: 4 }}>AI</span>
                      </span>
                      <span className="zalo-chat-time" style={{ color: "#16a34a", fontSize: "0.65rem" }}>24/7</span>
                    </div>
                    <div className="zalo-chat-item-preview">
                      <span className="zalo-preview-text" style={{ fontStyle: "italic", color: "#4ade80" }}>
                        Trợ lý AI hỗ trợ nông sản & AgriMarket ✨
                      </span>
                    </div>
                  </div>
                </div>

                {filteredChats.length === 0 && searchQuery ? (
                  <div className="zalo-empty-chat-list">
                    <p>Không tìm thấy cuộc trò chuyện nào</p>
                  </div>
                ) : (
                  filteredChats.map((chat) => {
                    const lastMsg = chat.messages && chat.messages.length > 0 
                      ? chat.messages[chat.messages.length - 1] 
                      : null;
                    const isLastMsgUser = lastMsg && String(lastMsg.senderId) === String(loggedInUser?.id);
                    
                    let formattedLastMsg = "Lịch sử trò chuyện trống";
                    if (lastMsg) {
                      const prefix = isLastMsgUser ? "Bạn: " : "";
                      if (lastMsg.type === "image") {
                        formattedLastMsg = `${prefix}[Hình ảnh]`;
                      } else if (lastMsg.type === "file") {
                        formattedLastMsg = `${prefix}[Tài liệu] ${lastMsg.fileName}`;
                      } else if (lastMsg.type === "location") {
                        formattedLastMsg = `${prefix}[Vị trí]`;
                      } else if (lastMsg.type === "contact") {
                        formattedLastMsg = `${prefix}[Danh thiếp]`;
                      } else {
                        formattedLastMsg = `${prefix}${lastMsg.text}`;
                      }
                    }

                    const isCurrentActive = selectedFarm && selectedFarm.id === chat.id;
                    const hasUnread = chat.unreadCount > 0;

                    return (
                      <div 
                        key={chat.id} 
                        className={`zalo-chat-item-row ${hasUnread ? "zalo-unread-item" : ""} ${isCurrentActive ? "zalo-active-item" : ""}`}
                        onClick={() => handleSelectFarm(chat)}
                      >
                        <div className="zalo-avatar-wrapper">
                          <img src={chat.avatar} alt={chat.name} className="zalo-farm-avatar" />
                          {chat.isOnline && <span className="zalo-online-indicator"></span>}
                        </div>

                        <div className="zalo-chat-item-info">
                          <div className="zalo-chat-item-header">
                            <span className="zalo-farm-name-wrapper">
                              <span className="zalo-farm-name">{chat.name}</span>
                              {chat.verified && <CheckCircle2 className="zalo-verified-badge" size={14} />}
                              {chat.isPinned && <Pin size={11} className="zalo-mini-status-icon zalo-pinned-icon" />}
                            </span>
                            <span className="zalo-chat-time">{lastMsg?.time || ""}</span>
                          </div>
                          <div className="zalo-chat-item-preview">
                            <span className="zalo-preview-text" style={{ fontStyle: lastMsg ? "normal" : "italic" }}>
                              {formattedLastMsg}
                            </span>
                            {hasUnread && (
                              <span className="zalo-unread-badge-green">{chat.unreadCount}</span>
                            )}
                          </div>
                        </div>

                        <div className="zalo-item-action-wrapper" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            className="zalo-item-more-btn"
                            onClick={() => setRowActionMenuId(rowActionMenuId === chat.id ? null : chat.id)}
                            title="Tùy chọn"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {rowActionMenuId === chat.id && (
                            <div className="zalo-item-dropdown-menu">
                              <button type="button" className="zalo-item-dropdown-option" onClick={() => { handleTogglePin(chat.id); setRowActionMenuId(null); }}>
                                <Pin size={12} />
                                <span>{chat.isPinned ? "Bỏ ghim" : "Ghim"}</span>
                              </button>
                              <button type="button" className="zalo-item-dropdown-option zalo-danger-option" onClick={() => { handleClearHistory(chat.id); setRowActionMenuId(null); }}>
                                <Trash2 size={12} />
                                <span>Xóa lịch sử</span>
                              </button>
                              {chat.isBlocked ? (
                                chat.blockedBy === (JSON.parse(localStorage.getItem("farmconnect_user"))?.role === "farmer" ? "farmer" : "customer") && (
                                  <button type="button" className="zalo-item-dropdown-option" onClick={() => { handleToggleBlock(chat.id); setRowActionMenuId(null); }}>
                                    <Ban size={12} />
                                    <span>Bỏ chặn</span>
                                  </button>
                                )
                              ) : (
                                <button type="button" className="zalo-item-dropdown-option zalo-danger-option" onClick={() => { handleToggleBlock(chat.id); setRowActionMenuId(null); }}>
                                  <Ban size={12} />
                                  <span>Chặn</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW: AGRIBOT AI CHAT */}
          {activeView === "agribot" && (
            <div className="zalo-chat-list-view zalo-animate-fade-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header */}
              <div className="zalo-chat-popup-header" style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white" }}>
                <div className="zalo-header-title-wrapper" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button className="zalo-icon-btn zalo-back-btn" onClick={handleBackToList} title="Quay lại" style={{ padding: "4px", color: "white" }}>
                    <ArrowLeft size={20} />
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.3rem" }}>🤖</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>AgriBot</div>
                      <div style={{ fontSize: "0.65rem", opacity: 0.85 }}>Trợ lý AI · Luôn trực tuyến ✅</div>
                    </div>
                  </div>
                </div>
                <div className="zalo-header-actions">
                  <button
                    className="zalo-icon-btn zalo-header-btn"
                    onClick={() => setAiMessages([{
                      id: "agribot-welcome",
                      role: "model",
                      text: "Xin chào! Tôi là AgriBot 🤖 - trợ lý AI của AgriMarket.\n\nTôi có thể giúp bạn:\n• Hỏi đáp về nông sản (bảo quản, dinh dưỡng, cách chọn) 🌿\n• Hướng dẫn đặt hàng và thanh toán 🛒\n• Tư vấn sản phẩm phù hợp 🍅\n• Giải đáp chính sách giao hàng, đổi trả 📦\n\nBạn cần giúp gì nào?"
                    }])}
                    title="Xóa lịch sử"
                    style={{ color: "white", opacity: 0.8 }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button className="zalo-icon-btn zalo-header-btn zalo-close-btn" onClick={() => setIsOpen(false)} title="Đóng chat" style={{ color: "white" }}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="zalo-chat-messages-container"
                style={{ flex: 1, overflowY: "auto", padding: "12px", background: "#f0fdf4", display: "flex", flexDirection: "column", gap: "10px" }}
              >
                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: msg.role === "user" ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: "8px"
                    }}
                  >
                    {msg.role === "model" && (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #16a34a, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>🤖</div>
                    )}
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "9px 13px",
                        borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: msg.role === "user" ? "linear-gradient(135deg, #16a34a, #22c55e)" : "white",
                        color: msg.role === "user" ? "white" : "#1a2e1a",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        fontSize: "0.82rem",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {aiLoading && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #16a34a, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>🤖</div>
                    <div style={{ padding: "9px 16px", borderRadius: "16px 16px 16px 4px", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                      <div className="agribot-typing-dots">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={aiMessagesEndRef} />
              </div>

              {/* Quick replies – chỉ hiện khi chỉ có welcome message */}
              {aiMessages.length <= 1 && (
                <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "6px", background: "#f0fdf4", borderTop: "1px solid #dcfce7" }}>
                  {AGRIBOT_QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendAiMessage(q)}
                      style={{ padding: "5px 10px", borderRadius: "999px", border: "1px solid #86efac", background: "white", color: "#16a34a", fontSize: "0.72rem", cursor: "pointer", fontWeight: 500, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#16a34a"; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendAiMessage(); }}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "white", borderTop: "1px solid #dcfce7" }}
              >
                <input
                  type="text"
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  placeholder="Hỏi AgriBot về nông sản..."
                  disabled={aiLoading}
                  style={{ flex: 1, border: "1.5px solid #86efac", borderRadius: "999px", padding: "8px 14px", fontSize: "0.82rem", outline: "none", background: aiLoading ? "#f9fafb" : "white" }}
                  onFocus={e => e.target.style.borderColor = "#16a34a"}
                  onBlur={e => e.target.style.borderColor = "#86efac"}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiInputText.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: (aiLoading || !aiInputText.trim()) ? "#d1d5db" : "linear-gradient(135deg, #16a34a, #22c55e)",
                    color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: (aiLoading || !aiInputText.trim()) ? "not-allowed" : "pointer",
                    transition: "all 0.2s", flexShrink: 0
                  }}
                >
                  <SendHorizontal size={16} />
                </button>
              </form>
            </div>
          )}

          {/* VIEW: TRÒ CHUYỆN MỚI */}
          {activeView === "new-chat" && (
            <div className="zalo-chat-list-view zalo-animate-fade-in">
              {/* Header */}
              <div className="zalo-chat-popup-header">
                <div className="zalo-header-title-wrapper" style={{display: "flex", alignItems: "center", gap: "6px"}}>
                  <button className="zalo-icon-btn zalo-back-btn" onClick={handleBackToList} title="Quay lại" style={{padding: "4px"}}>
                    <ArrowLeft size={20} />
                  </button>
                  <h3>Trò chuyện mới</h3>
                </div>
                <div className="zalo-header-actions">
                  <button className="zalo-icon-btn zalo-header-btn zalo-close-btn" onClick={() => setIsOpen(false)} title="Đóng chat">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Tìm kiếm */}
              <div className="shopee-chat-filter-row">
                <div className="shopee-search-wrapper">
                  <Search className="shopee-search-icon" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tìm tên nông trại..." 
                    value={newChatQuery}
                    onChange={(e) => setNewChatQuery(e.target.value)}
                  />
                  {newChatQuery && (
                    <button className="shopee-clear-search" onClick={() => setNewChatQuery("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Danh sách nông trại đề xuất */}
              <div className="zalo-chat-list-content">
                <div className="zalo-new-chat-section-title">Nông trại đề xuất</div>
                {suggestedFarms.length === 0 ? (
                  <div className="zalo-empty-chat-list">
                    <p>Không tìm thấy nông trại nào</p>
                  </div>
                ) : (
                  suggestedFarms.map((farm) => {
                    return (
                      <div 
                        key={farm.id} 
                        className="zalo-new-chat-item-row"
                        onClick={() => handleCreateNewConversation(farm)}
                      >
                        <div className="zalo-avatar-wrapper">
                          <img src={farm.avatar} alt={farm.name} className="zalo-farm-avatar" />
                          {farm.isOnline && <span className="zalo-online-indicator"></span>}
                        </div>
                        <div className="zalo-chat-item-info">
                          <div className="zalo-new-chat-farm-header">
                            <span className="zalo-farm-name-wrapper">
                              <span className="zalo-farm-name" style={{fontWeight: "600"}}>{farm.name}</span>
                              {farm.verified && <CheckCircle2 className="zalo-verified-badge" size={14} />}
                            </span>
                            <span className="zalo-new-chat-status">{farm.activeState}</span>
                          </div>
                        </div>
                        <button className="zalo-start-chat-btn">Nhắn tin</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW: DETAIL CHAT */}
          {activeView === "chat" && currentChatDetail && (
            <div className="zalo-chat-detail-view zalo-animate-slide-in">
              {/* Header */}
              <div className="zalo-chat-popup-header zalo-chat-detail-header">
                <button className="zalo-icon-btn zalo-back-btn" onClick={handleBackToList} title="Quay lại">
                  <ArrowLeft size={20} />
                </button>

                <div className="zalo-header-farm-info" onClick={() => setShowInfoModal(true)}>
                  <div className="zalo-avatar-wrapper">
                    <img src={currentChatDetail.avatar} alt={currentChatDetail.name} className="zalo-farm-avatar-small" />
                  </div>
                  <div className="zalo-header-text-details">
                    <div className="zalo-farm-title-wrapper">
                      <h4>{currentChatDetail.name}</h4>
                      {currentChatDetail.verified && <CheckCircle2 className="zalo-verified-badge-white" size={13} />}
                    </div>
                    <span className="zalo-active-status">
                      <span className="zalo-status-dot">●</span> {currentChatDetail.activeState}
                    </span>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="zalo-header-actions" style={{position: "relative"}}>
                  <button 
                    className={`zalo-icon-btn zalo-option-btn ${showOptionsMenu ? "zalo-option-btn-active" : ""}`}
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)} 
                    title="Tùy chọn"
                  >
                    <MoreVertical size={18} />
                  </button>

                  <button className="zalo-icon-btn zalo-close-btn" onClick={() => setIsOpen(false)} title="Đóng chat">
                    <X size={20} />
                  </button>

                  {/* Dropdown Options Menu */}
                  {showOptionsMenu && (
                    <div className="zalo-options-dropdown" ref={optionsMenuRef}>
                      <button className="zalo-dropdown-item" onClick={() => { setShowInfoModal(true); setShowOptionsMenu(false); }}>
                        <Info size={15} />
                        <span>Thông tin nông trại</span>
                      </button>
                      <button className="zalo-dropdown-item" onClick={() => { setShowMediaModal(true); setShowOptionsMenu(false); }}>
                        <ImageIcon size={15} />
                        <span>Ảnh/Video đã gửi</span>
                      </button>
                      <button className="zalo-dropdown-item" onClick={() => handleTogglePin(currentChatDetail.id)}>
                        <Pin size={15} />
                        <span>{currentChatDetail.isPinned ? "Bỏ ghim trò chuyện" : "Ghim trò chuyện"}</span>
                      </button>
                      <button className="zalo-dropdown-item zalo-danger-item" onClick={() => handleClearHistory(currentChatDetail.id)}>
                        <Trash2 size={15} />
                        <span>Xóa lịch sử trò chuyện</span>
                      </button>
                      {currentChatDetail.isBlocked ? (
                        currentChatDetail.blockedBy === (JSON.parse(localStorage.getItem("farmconnect_user"))?.role === "farmer" ? "farmer" : "customer") && (
                          <button className="zalo-dropdown-item" onClick={() => handleToggleBlock(currentChatDetail.id)}>
                            <Ban size={15} />
                            <span>Bỏ chặn {JSON.parse(localStorage.getItem("farmconnect_user"))?.role === "farmer" ? "khách hàng" : "nông trại"}</span>
                          </button>
                        )
                      ) : (
                        <button className="zalo-dropdown-item zalo-danger-item" onClick={() => handleToggleBlock(currentChatDetail.id)}>
                          <Ban size={15} />
                          <span>Chặn {JSON.parse(localStorage.getItem("farmconnect_user"))?.role === "farmer" ? "khách hàng" : "nông trại"} này</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages container */}
              <div className="zalo-chat-messages-container">
                <div className="zalo-chat-date-divider">
                  <span>Hôm nay</span>
                </div>

                {currentChatDetail.messages && currentChatDetail.messages.length === 0 ? (
                  <div className="zalo-empty-messages">
                    <p>Lịch sử trò chuyện trống. Nhập văn bản bên dưới để bắt đầu nhắn tin.</p>
                  </div>
                ) : (
                  currentChatDetail.messages && currentChatDetail.messages.map((msg, index) => {
                    const loggedInUser = authService.getCurrentUser();
                    const isUser = String(msg.senderId) === String(loggedInUser?.id);
                    const isImg = msg.type === "image";
                    const isFile = msg.type === "file";
                    const isLoc = msg.type === "location";
                    const isCont = msg.type === "contact";

                    return (
                      <div 
                        key={msg.id || index} 
                        className={`zalo-message-row ${isUser ? "zalo-message-user" : "zalo-message-farmer"} ${isImg ? "zalo-row-image-type" : ""}`}
                      >
                        {!isUser && (
                          <img 
                            src={currentChatDetail.avatar} 
                            alt={currentChatDetail.name} 
                            className="zalo-msg-avatar-thumb" 
                          />
                        )}
                        
                        <div className="zalo-message-bubble-wrapper">
                          
                          {/* 1. TIN NHẮN DẠNG HÌNH ẢNH */}
                          {isImg && (
                            <div className="zalo-message-bubble-image-box" onClick={() => setZoomImageUrl(msg.mediaUrl)}>
                              <img src={msg.mediaUrl} alt="Hình ảnh đã gửi" className="zalo-chat-sent-image" />
                              <div className="zalo-image-meta-time">{msg.time}</div>
                            </div>
                          )}

                          {/* 2. TIN NHẮN DẠNG ĐÍNH KÈM FILE */}
                          {isFile && (
                            <div className="zalo-message-bubble zalo-message-bubble-file">
                              <div className="zalo-file-card-content">
                                <div className="zalo-file-icon-box">
                                  <FileText size={24} className="zalo-text-primary" />
                                </div>
                                <div className="zalo-file-metadata">
                                  <div className="zalo-file-name" title={msg.fileName}>{msg.fileName}</div>
                                  <div className="zalo-file-size">{msg.fileSize}</div>
                                </div>
                                <button className="zalo-file-download-btn" onClick={() => alert(`Tải xuống file giả lập: ${msg.fileName}`)} title="Tải xuống">
                                  <Download size={16} />
                                </button>
                              </div>
                              <span className="zalo-msg-time-generic">{msg.time}</span>
                            </div>
                          )}

                          {/* 3. TIN NHẮN DẠNG VỊ TRÍ BẢN ĐỒ */}
                          {isLoc && (
                            <div className="zalo-message-bubble zalo-message-bubble-location">
                              <div className="zalo-location-card-title">
                                <MapPin size={16} className="zalo-text-primary" />
                                <span>{msg.locationName}</span>
                              </div>
                              <div className="zalo-location-map-preview">
                                <img src={msg.mapUrl} alt="Bản đồ vị trí" />
                                <div className="zalo-location-map-overlay">
                                  <span className="zalo-location-pin-icon">📍</span>
                                </div>
                              </div>
                              <span className="zalo-msg-time-generic">{msg.time}</span>
                            </div>
                          )}

                          {/* 4. TIN NHẮN DẠNG DANH THIẾP */}
                          {isCont && (
                            <div className="zalo-message-bubble zalo-message-bubble-contact">
                              <div className="zalo-contact-card-header">
                                <UserSquare2 size={16} className="zalo-text-primary" />
                                <span>Gửi danh thiếp liên hệ</span>
                              </div>
                              <div className="zalo-contact-card-body">
                                <img src={msg.contactAvatar} alt={msg.contactName} className="zalo-contact-avatar" />
                                <div className="zalo-contact-text">
                                  <div className="zalo-contact-name">{msg.contactName}</div>
                                  <div className="zalo-contact-phone">{msg.contactPhone}</div>
                                </div>
                              </div>
                              <span className="zalo-msg-time-generic">{msg.time}</span>
                            </div>
                          )}

                          {/* 5. TIN NHẮN VĂN BẢN THƯỜNG */}
                          {!isImg && !isFile && !isLoc && !isCont && (
                            <div className="zalo-message-bubble">
                              <p className="zalo-message-text">{msg.text}</p>
                              {isUser && (
                                <div className="zalo-bubble-meta-user">
                                  <span className="zalo-msg-time-user">{msg.time}</span>
                                  <span className="zalo-msg-status-user">
                                    <CheckCheck size={12} className="zalo-tick-icon-green" />
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {!isUser && !isImg && (
                            <div className="zalo-message-meta-farmer">
                              <span className="zalo-msg-time-farmer">{msg.time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* PANEL TIỆN ÍCH NHANH (QUICK ACTIONS MENU) */}
              {showQuickActions && (
                <div className="zalo-quick-actions-panel zalo-animate-fade-in">
                  <div className="zalo-quick-actions-header">
                    <span>Tiện ích nhanh</span>
                    <button className="zalo-quick-close-btn" onClick={() => setShowQuickActions(false)}>
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="zalo-quick-buttons-grid">
                    <button className="zalo-quick-action-item-btn" onClick={handleSendLocation}>
                      <div className="zalo-quick-icon-circle zalo-bg-loc">
                        <MapPin size={18} />
                      </div>
                      <span>Gửi vị trí</span>
                    </button>
                    <button className="zalo-quick-action-item-btn" onClick={handleSendContactCard}>
                      <div className="zalo-quick-icon-circle zalo-bg-contact">
                        <UserSquare2 size={18} />
                      </div>
                      <span>Gửi danh bạ</span>
                    </button>
                  </div>

                  <div className="zalo-quick-replies-section">
                    <div className="zalo-quick-replies-title">Hỏi thăm nhanh:</div>
                    <div className="zalo-quick-replies-list">
                      {QUICK_REPLIES.map((reply, i) => (
                        <button key={i} className="zalo-quick-reply-pill" onClick={() => handleSendQuickReply(reply)}>
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer controls */}
              <div className="zalo-chat-footer-controls">
                {currentChatDetail.isBlocked ? (
                  <div className="zalo-blocked-input-banner" style={{ padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f2f4f7", borderRadius: "8px" }}>
                    {currentChatDetail.blockedBy === (JSON.parse(localStorage.getItem("farmconnect_user"))?.role === "farmer" ? "farmer" : "customer") ? (
                      <>
                        <span style={{ fontSize: "13px", color: "#667085", fontWeight: "600" }}>Bạn đã chặn {JSON.parse(localStorage.getItem("farmconnect_user"))?.role === "farmer" ? "khách hàng" : "nông trại"} này. Bỏ chặn để gửi tin nhắn.</span>
                        <button className="zalo-unblock-btn" onClick={() => handleToggleBlock(currentChatDetail.id)} style={{ padding: "6px 12px", border: "1px solid #1B5E20", background: "none", color: "#1B5E20", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                          Bỏ chặn
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: "13px", color: "#667085", fontWeight: "600", width: "100%", textAlign: "center" }}>Bạn đã bị chặn</span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="zalo-chat-attachments-row">
                      <button className="zalo-attachment-btn" onClick={() => imageInputRef.current.click()} title="Gửi ảnh">
                        <ImageIcon size={18} />
                      </button>
                      <button className="zalo-attachment-btn" onClick={() => fileInputRef.current.click()} title="Đính kèm file">
                        <Paperclip size={18} />
                      </button>
                      <button 
                        className={`zalo-attachment-btn ${showQuickActions ? "zalo-attachment-btn-active" : ""}`} 
                        onClick={() => setShowQuickActions(!showQuickActions)} 
                        title="Tính năng khác"
                      >
                        <PlusCircle size={18} />
                      </button>
                    </div>

                    <form className="zalo-chat-input-form" onSubmit={handleSendMessage}>
                      <input 
                        type="text" 
                        placeholder="Nhập tin nhắn..." 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        ref={chatInputRef}
                      />
                      <button 
                        type="submit" 
                        className={`zalo-send-msg-btn ${inputText.trim() ? "zalo-active" : ""}`}
                        disabled={!inputText.trim()}
                        title="Gửi tin nhắn"
                      >
                        <SendHorizontal size={18} />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 4. MODAL XEM CHI TIẾT THÔNG TIN NÔNG TRẠI (Zalo Profile Card Style) */}
          {showInfoModal && currentChatDetail && (
            <div className="zalo-info-modal-overlay">
              <div className="zalo-info-modal-card">
                <div className="zalo-info-modal-header-container" style={{ height: "40px", background: "none" }}>
                  <button className="zalo-info-modal-close-absolute" onClick={() => setShowInfoModal(false)} style={{ color: "#333", top: "12px", right: "12px" }}>
                    <X size={18} />
                  </button>
                </div>
                
                <div className="zalo-info-modal-body">
                  <div className="zalo-info-modal-avatar-wrapper">
                    <img 
                      src={currentChatDetail.avatar} 
                      alt={currentChatDetail.name} 
                      className="zalo-info-modal-avatar-profile" 
                    />
                  </div>
                  
                  <div className="zalo-info-modal-name-wrapper">
                    <h3>{currentChatDetail.name}</h3>
                    {currentChatDetail.verified && <CheckCircle2 className="zalo-verified-badge" size={16} />}
                  </div>
                  <span className="zalo-info-modal-status">{currentChatDetail.activeState}</span>
                  
                  <p className="zalo-info-modal-bio">
                    {currentChatDetail.description || "Nông trại chưa cập nhật giới thiệu."}
                  </p>
                  
                  <div className="zalo-info-details-list">
                    <div className="zalo-info-detail-item">
                      <svg className="zalo-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      <div>
                        <div className="zalo-info-label">Điện thoại</div>
                        <div className="zalo-info-value">{currentChatDetail.phone}</div>
                      </div>
                    </div>
                    <div className="zalo-info-detail-item">
                      <svg className="zalo-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      <div>
                        <div className="zalo-info-label">Địa chỉ nông trại</div>
                        <div className="zalo-info-value">{currentChatDetail.farmAddress || "Đang cập nhật"}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="zalo-info-modal-footer-two-buttons">
                  <button 
                    className="zalo-info-btn-secondary" 
                    onClick={() => {
                      if (currentChatDetail && currentChatDetail.partnerId) {
                        navigate(`/farmer-profile/${currentChatDetail.partnerId}`);
                        setShowInfoModal(false);
                        setIsOpen(false);
                      } else {
                        handleFeatureUnderDevelopment("Xem cửa hàng nông nghiệp");
                      }
                    }}
                  >
                    Xem cửa hàng
                  </button>
                  <button className="zalo-info-btn-primary" onClick={() => setShowInfoModal(false)}>
                    Nhắn tin
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. MODAL KHO ẢNH/VIDEO ĐÃ GỬI (Đọc động danh sách mediaImages) */}
          {showMediaModal && currentChatDetail && (
            <div className="zalo-info-modal-overlay">
              <div className="zalo-info-modal-card zalo-media-modal-card">
                <div className="zalo-media-modal-header">
                  <div className="zalo-media-header-left">
                    <h3>Ảnh/Video</h3>
                    <ChevronDown size={18} className="zalo-text-gray" />
                  </div>
                  <button className="zalo-info-modal-close" onClick={() => setShowMediaModal(false)}>
                    <X size={18} />
                  </button>
                </div>
                
                <div className="zalo-media-modal-body">
                  <div className="zalo-media-grid-2x4">
                    {(currentChatDetail.mediaImages || DEFAULT_MEDIA_IMAGES).slice(0, 8).map((imgUrl, i) => (
                      <div 
                        key={i} 
                        className="zalo-media-grid-item"
                        onClick={() => setZoomImageUrl(imgUrl)}
                        title="Xem ảnh lớn"
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Ảnh đã gửi ${i + 1}`} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=150";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="zalo-media-modal-footer">
                  <button 
                    className="zalo-media-view-all-btn"
                    onClick={() => alert(`Hiện đang hiển thị ${(currentChatDetail.mediaImages || DEFAULT_MEDIA_IMAGES).length} ảnh/video có trong cuộc hội thoại này.`)}
                  >
                    Xem tất cả
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. LIGHTBOX ZOOM PREVIEW */}
          {zoomImageUrl && (
            <div className="zalo-lightbox-overlay" onClick={() => setZoomImageUrl(null)}>
              <button className="zalo-lightbox-close" onClick={() => setZoomImageUrl(null)}>
                <X size={24} />
              </button>
              <div className="zalo-lightbox-image-wrapper" onClick={(e) => e.stopPropagation()}>
                <img src={zoomImageUrl} alt="Ảnh zoom lớn" className="zalo-lightbox-image" />
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ChatPopup;
