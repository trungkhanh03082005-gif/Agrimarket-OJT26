import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Search, 
  ChevronDown, 
  X, 
  MoreVertical, 
  Info, 
  Image as ImageIcon, 
  Pin, 
  BellOff, 
  Trash2, 
  Ban, 
  Phone,
  Paperclip,
  Send,
  MapPin,
  User
} from "lucide-react";
import "./FarmerChat.css";
import chatService from "../../../services/chatService";

export const FarmerChat = () => {
  const { farmerProfile, currentUser } = useOutletContext();
  const [allChats, setAllChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [inputText, setInputText] = useState("");
  const [rowActionMenuId, setRowActionMenuId] = useState(null);
  
  // States Lọc tin nhắn (Shopee)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread' | 'pinned'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // States cho Option Menu & Modals giống Khách hàng
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Refs cho scroll, file upload & options dropdown click outside
  const chatEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const lastChatIdRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const optionsMenuRef = useRef(null);

  // ID Nông trại hiện tại (mặc định 4 cho Bùi Khắc Hưng)
  const farmId = farmerProfile?.id || 4;

  const getPrefsKey = (type) => {
    const email = currentUser?.email || "anonymous";
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

  // 1. Tải danh sách chat từ Backend và sync định kỳ
  const fetchConversations = async () => {
    const token = localStorage.getItem("farmconnect_token");
    if (!token) return;
    try {
      const data = await chatService.getConversations("farmer");
      
      const pinnedIds = getPinnedIds();
      const clearedTimes = getClearedHistoryTimes();

      const sanitized = data.map(c => {
        const idStr = String(c.id);
        const clearedTime = clearedTimes[idStr] || 0;
        const filteredMessages = (c.messages || []).filter(m => (m.timestamp || 0) > clearedTime);
        return {
          ...c,
          id: idStr,
          isPinned: pinnedIds.includes(idStr),
          isBlocked: c.isBlocked,
          messages: filteredMessages
        };
      });
      setAllChats(sanitized);

      // Keep active chat's messages in sync
      setActiveChat(prev => {
        if (!prev) return null;
        const updated = sanitized.find(c => String(c.id) === String(prev.id));
        return updated || prev;
      });
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const timer = setInterval(fetchConversations, 3000);
    return () => clearInterval(timer);
  }, []);

  // Click outside để đóng options dropdown menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showOptionsMenu]);

  // Đóng Row Action Menu khi click bên ngoài
  useEffect(() => {
    const handleCloseRowMenu = (event) => {
      const menu = document.querySelector(".fc-item-dropdown-menu");
      const btn = document.querySelector(".fc-item-more-btn");
      if (menu && !menu.contains(event.target) && btn && !btn.contains(event.target)) {
        setRowActionMenuId(null);
      }
    };
    if (rowActionMenuId) {
      document.addEventListener("mousedown", handleCloseRowMenu);
    }
    return () => document.removeEventListener("mousedown", handleCloseRowMenu);
  }, [rowActionMenuId]);

  // Cuộn xuống tin nhắn thông minh (tránh tự động cuộn khi người dùng đang lướt lên xem tin nhắn cũ)
  useEffect(() => {
    if (!activeChat) return;

    const body = chatBodyRef.current;
    const messages = activeChat.messages || [];
    const lastMsg = messages[messages.length - 1];
    const lastMsgId = lastMsg ? lastMsg.id : null;

    const chatChanged = lastChatIdRef.current !== activeChat.id;
    const newMsgReceived = lastMessageIdRef.current !== lastMsgId && !chatChanged;

    if (chatChanged) {
      // Khi đổi cuộc trò chuyện: Cuộn xuống dưới cùng ngay lập tức
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    } else if (newMsgReceived) {
      // Khi có tin nhắn mới thực sự: Chỉ cuộn xuống nếu người dùng đang ở sát dưới đáy (khoảng cách < 250px)
      if (body && chatEndRef.current) {
        const isNearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 250;
        if (isNearBottom) {
          chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    }

    // Cập nhật lại cache ID để so sánh cho lần render kế tiếp
    lastChatIdRef.current = activeChat.id;
    lastMessageIdRef.current = lastMsgId;
  }, [activeChat?.id, activeChat?.messages]);

  // 2. Các hàm Options Menu đồng bộ
  const handleTogglePin = (chatId) => {
    const idStr = String(chatId);
    const key = getPrefsKey("pinned");
    let pinned = getPinnedIds();
    if (pinned.includes(idStr)) {
      pinned = pinned.filter(id => id !== idStr);
    } else {
      pinned.push(idStr);
    }
    localStorage.setItem(key, JSON.stringify(pinned));

    setAllChats(prev => prev.map(c => String(c.id) === idStr ? { ...c, isPinned: !c.isPinned } : c));
    setShowOptionsMenu(false);
  };

  const handleToggleBlock = async (chatId) => {
    const idStr = String(chatId);
    try {
      const updated = await chatService.toggleBlock(idStr);
      setAllChats(prev => prev.map(c => String(c.id) === idStr ? { ...c, isBlocked: updated.isBlocked, blockedBy: updated.blockedBy } : c));
      
      // Also update active chat if it is the toggled one
      setActiveChat(prev => {
        if (prev && String(prev.id) === idStr) {
          return { ...prev, isBlocked: updated.isBlocked, blockedBy: updated.blockedBy };
        }
        return prev;
      });
      setShowOptionsMenu(false);
    } catch (err) {
      console.error("Failed to toggle block:", err);
      alert(err.response?.data || "Không thể thực hiện chặn/bỏ chặn.");
    }
  };

  const handleClearHistory = async (chatId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này không?")) {
      const idStr = String(chatId);
      try {
        await chatService.deleteConversation(idStr);
        setAllChats(prev => prev.filter(c => String(c.id) !== idStr));
        if (activeChat && String(activeChat.id) === idStr) {
          setActiveChat(null);
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

  const handleSelectChat = async (chat) => {
    setActiveChat(chat);
    try {
      await chatService.getMessages(chat.id);
      fetchConversations();
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  // Gửi tin nhắn chữ
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const content = inputText.trim();
    setInputText("");

    try {
      await chatService.sendMessage(activeChat.id, {
        content: content,
        type: "text"
      });
      fetchConversations();
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Gửi ảnh thực tế
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        await chatService.sendMessage(activeChat.id, {
          content: base64Data,
          type: "image"
        });
        fetchConversations();
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (err) {
        console.error("Failed to send image:", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Gửi tệp đính kèm thực tế
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        await chatService.sendMessage(activeChat.id, {
          content: base64Data,
          type: "file",
          fileName: file.name,
          fileSize: `${fileSizeMB} MB`
        });
        fetchConversations();
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (err) {
        console.error("Failed to send file:", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const getLatestMessage = (chat) => {
    const msgs = chat.messages || [];
    if (msgs.length === 0) return "Chưa có tin nhắn";
    const last = msgs[msgs.length - 1];
    if (!last) return "Chưa có tin nhắn";
    if (last.type === "image") return "[Hình ảnh]";
    if (last.type === "file") return `[Tệp đính kèm] ${last.text}`;
    if (last.type === "location") return "[📍 Vị trí bản đồ]";
    if (last.type === "contact") return "[📇 Danh thiếp]";
    return last.text;
  };

  const getLatestMessageTime = (chat) => {
    const msgs = chat.messages || [];
    if (msgs.length === 0) return "";
    const last = msgs[msgs.length - 1];
    return last ? last.time : "";
  };

  // Filter hội thoại dựa trên Search và Dropdown Shopee
  const filteredChats = allChats.filter(chat => {
    const chatName = chat.name || "";
    const matchesSearch = chatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.messages || []).some(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (activeTab === "unread") return chat.unreadCount > 0;
    if (activeTab === "pinned") return chat.isPinned;
    
    return true;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    const aMessages = a.messages || [];
    const bMessages = b.messages || [];
    const aLast = aMessages[aMessages.length - 1];
    const bLast = bMessages[bMessages.length - 1];
    if (!aLast) return 1;
    if (!bLast) return -1;

    return (bLast.timestamp || 0) - (aLast.timestamp || 0);
  });

  return (
    <div className="farmer-chat-container">
      <div className="farmer-chat-workspace">
        
        {/* CỘT TRÁI: DANH SÁCH KHÁCH HÀNG */}
        <aside className="fc-sidebar-left">
          {/* Shopee Filter & Search Row */}
          <div className="shopee-chat-filter-row text-center-shopee">
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
                  <X size={12} />
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
          
          <div className="fc-chat-list">
            {filteredChats.length > 0 ? (
              filteredChats.map(chat => {
                const isCurrentActive = activeChat && String(activeChat.id) === String(chat.id);
                const isPinned = chat.isPinned;
                return (
                  <div 
                    key={chat.id} 
                    className={`fc-chat-item ${isCurrentActive ? "active" : ""}`}
                    onClick={() => handleSelectChat(chat)}
                  >
                    <div className="fc-item-avatar-wrapper">
                      <img src={chat.avatar} alt={chat.name} />
                      <span className="online-indicator"></span>
                    </div>
                    <div className="fc-item-info">
                      <div className="fc-item-header">
                        <h4 className="fc-item-name">
                          {chat.name}
                          {isPinned && <span style={{ marginLeft: "4px", fontSize: "10px" }}>📌</span>}
                        </h4>
                        <span className="fc-item-time">{getLatestMessageTime(chat)}</span>
                      </div>
                      <p className="fc-item-last-msg">{getLatestMessage(chat)}</p>
                    </div>

                    <div className="fc-item-action-wrapper" onClick={(e) => e.stopPropagation()}>
                      <button 
                        type="button"
                        className="fc-item-more-btn"
                        onClick={() => setRowActionMenuId(rowActionMenuId === chat.id ? null : chat.id)}
                        title="Tùy chọn"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {rowActionMenuId === chat.id && (
                        <div className="fc-item-dropdown-menu">
                          <button type="button" className="fc-item-dropdown-option" onClick={() => { handleTogglePin(chat.id); setRowActionMenuId(null); }}>
                            <Pin size={12} />
                            <span>{chat.isPinned ? "Bỏ ghim" : "Ghim"}</span>
                          </button>
                          <button type="button" className="fc-item-dropdown-option fc-danger-option" onClick={() => { handleClearHistory(chat.id); setRowActionMenuId(null); }}>
                            <Trash2 size={12} />
                            <span>Xóa lịch sử</span>
                          </button>
                          {chat.isBlocked ? (
                            chat.blockedBy === "farmer" && (
                              <button type="button" className="fc-item-dropdown-option" onClick={() => { handleToggleBlock(chat.id); setRowActionMenuId(null); }}>
                                <Ban size={12} />
                                <span>Bỏ chặn</span>
                              </button>
                            )
                          ) : (
                            <button type="button" className="fc-item-dropdown-option fc-danger-option" onClick={() => { handleToggleBlock(chat.id); setRowActionMenuId(null); }}>
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
            ) : (
              <p className="fc-empty-list-text">Không tìm thấy khách hàng nào</p>
            )}
          </div>
        </aside>

        {/* CỘT PHẢI: KHUNG CHAT CHI TIẾT GIỐNG KHÁCH HÀNG */}
        <main className="fc-chat-detail">
          {activeChat ? (
            <>
              {/* Header màu xanh lá cây đậm giống khách hàng */}
              <header className="fc-detail-header zalo-chat-popup-header-green">
                <div className="fc-header-avatar-box">
                  <div className="zalo-avatar-wrapper">
                    <img src={activeChat.avatar} alt={activeChat.name} />
                  </div>
                  <div className="fc-header-status-text">
                    <div className="fc-header-title-wrapper-green">
                      <h3 className="fc-header-name">{activeChat.name}</h3>
                    </div>
                    <span className="fc-header-sub fc-active-status-green">
                      <span className="fc-status-dot-green">●</span> Đang hoạt động
                    </span>
                  </div>
                </div>
                
                {/* Header Actions kèm 3 chấm */}
                <div className="fc-header-actions" style={{ position: "relative" }}>
                  <a href={`tel:${activeChat.phone}`} className="fc-phone-action-btn" title="Gọi hotline khách hàng">
                    <Phone size={16} />
                  </a>
                  
                  <button 
                    type="button"
                    className={`fc-option-btn ${showOptionsMenu ? "fc-option-btn-active" : ""}`}
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    title="Tùy chọn"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {/* Dropdown Options Menu */}
                  {showOptionsMenu && (
                    <div className="zalo-options-dropdown" ref={optionsMenuRef} style={{ top: "35px", right: "0" }}>
                      <button className="zalo-dropdown-item" onClick={() => { setShowInfoModal(true); setShowOptionsMenu(false); }}>
                        <Info size={15} />
                        <span>Thông tin khách hàng</span>
                      </button>
                      <button className="zalo-dropdown-item" onClick={() => { setShowMediaModal(true); setShowOptionsMenu(false); }}>
                        <ImageIcon size={15} />
                        <span>Ảnh/Video đã gửi</span>
                      </button>
                      <button className="zalo-dropdown-item" onClick={() => handleTogglePin(activeChat.id)}>
                        <Pin size={15} />
                        <span>{activeChat.isPinned ? "Bỏ ghim trò chuyện" : "Ghim trò chuyện"}</span>
                      </button>
                      <button className="zalo-dropdown-item zalo-danger-item" onClick={() => handleClearHistory(activeChat.id)}>
                        <Trash2 size={15} />
                        <span>Xóa lịch sử trò chuyện</span>
                      </button>
                      {activeChat.isBlocked ? (
                        activeChat.blockedBy === "farmer" && (
                          <button className="zalo-dropdown-item" onClick={() => handleToggleBlock(activeChat.id)}>
                            <Ban size={15} />
                            <span>Bỏ chặn khách hàng</span>
                          </button>
                        )
                      ) : (
                        <button className="zalo-dropdown-item zalo-danger-item" onClick={() => handleToggleBlock(activeChat.id)}>
                          <Ban size={15} />
                          <span>Chặn khách hàng</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </header>

              {/* Thân Khung Chat - Bong bóng tin nhắn */}
              <div className="fc-detail-body" ref={chatBodyRef}>
                {(activeChat.messages || []).map((msg) => {
                  const isMe = String(msg.senderId) === String(currentUser?.id);
                  
                  return (
                    <div key={msg.id} className={`fc-msg-row ${isMe ? "right" : "left"}`}>
                      {!isMe && (
                        <div className="fc-msg-avatar">
                          <img src={activeChat.avatar} alt="User Avatar" />
                        </div>
                      )}
                      
                      <div className="fc-msg-bubble-box">
                        <div className="fc-msg-bubble">
                          {msg.type === "text" && <p className="fc-msg-text">{msg.text}</p>}
                          
                          {msg.type === "image" && (
                            <img 
                              src={msg.text} 
                              alt="Gửi từ chat" 
                              className="fc-msg-image-content"
                              onClick={() => setLightboxImage(msg.text)}
                            />
                          )}
                          
                          {msg.type === "file" && (
                            <div className="fc-msg-file-card">
                              <span className="fc-file-icon">📄</span>
                              <div className="fc-file-meta">
                                <span className="fc-file-name" title={msg.text}>{msg.text}</span>
                                <span className="fc-file-size">{msg.fileSize || "0.5 MB"}</span>
                              </div>
                              <button 
                                className="fc-btn-download-file" 
                                onClick={() => {
                                  alert(`Đang chuẩn bị tải xuống tệp tin: ${msg.text}`);
                                }}
                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              >
                                <ChevronDown size={18} />
                              </button>
                            </div>
                          )}

                          {msg.type === "location" && (
                            <div className="fc-msg-location-card">
                              <div className="location-card-map-header" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span className="map-badge-pin" style={{ display: "inline-flex", alignItems: "center" }}><MapPin size={16} /></span>
                                <span className="map-location-title">Vị trí chia sẻ</span>
                              </div>
                              <div className="location-card-body-map">
                                <p className="location-card-address">{msg.text || "Ngũ Hành Sơn, Đà Nẵng, Việt Nam"}</p>
                                <div className="simulated-map-block-farmer">
                                  <div className="simulated-pin-farmer"></div>
                                </div>
                              </div>
                            </div>
                          )}

                          {msg.type === "contact" && (
                            <div className="fc-msg-contact-card">
                              <div className="contact-card-header">
                                <span className="contact-card-avatar-fallback" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e2e8f0", borderRadius: "50%", width: "32px", height: "32px" }}><User size={18} /></span>
                                <div className="contact-card-title-box">
                                  <span className="contact-card-name">{msg.text || "Khách hàng mua nông sản"}</span>
                                  <span className="contact-card-sub">Khách hàng của hệ thống</span>
                                </div>
                              </div>
                              <div className="contact-card-footer-action">
                                <a href={`tel:${msg.phone || '0900000000'}`} className="btn-contact-action-call" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Phone size={14} /> Gọi ngay</a>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="fc-msg-time">{msg.time}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chân Khung Chat - Công cụ & ô nhập */}
              <footer className="fc-detail-footer">
                {activeChat.isBlocked ? (
                  <div className="zalo-blocked-input-banner" style={{ padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f2f4f7", borderRadius: "8px", width: "100%", boxSizing: "border-box" }}>
                    {activeChat.blockedBy === (JSON.parse(localStorage.getItem("farmconnect_user"))?.role === "farmer" ? "farmer" : "customer") ? (
                      <>
                        <span style={{ fontSize: "13px", color: "#667085", fontWeight: "600" }}>Bạn đã chặn khách hàng này. Bỏ chặn để tiếp tục nhắn tin.</span>
                        <button className="zalo-unblock-btn" onClick={() => handleToggleBlock(activeChat.id)} style={{ padding: "6px 12px", border: "1px solid #1B5E20", background: "none", color: "#1B5E20", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                          Bỏ chặn
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: "13px", color: "#667085", fontWeight: "600", width: "100%", textAlign: "center" }}>Bạn đã bị chặn</span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="fc-footer-toolbar">
                      <button 
                        type="button" 
                        className="fc-toolbar-icon-btn" 
                        title="Gửi hình ảnh"
                        onClick={() => imageInputRef.current.click()}
                      >
                        <ImageIcon size={20} />
                      </button>
                      <button 
                        type="button" 
                        className="fc-toolbar-icon-btn" 
                        title="Đính kèm tệp tin"
                        onClick={() => fileInputRef.current.click()}
                      >
                        <Paperclip size={20} />
                      </button>
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={imageInputRef} 
                        style={{ display: "none" }} 
                        onChange={handleImageChange} 
                      />
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: "none" }} 
                        onChange={handleFileChange} 
                      />
                    </div>

                    <form className="fc-chat-input-form" onSubmit={handleSendMessage}>
                      <input 
                        type="text" 
                        placeholder="Nhập nội dung phản hồi khách hàng..." 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />
                      <button type="submit" disabled={!inputText.trim()} className="fc-send-btn" aria-label="Gửi phản hồi">
                        <Send size={18} />
                      </button>
                    </form>
                  </>
                )}
              </footer>
            </>
          ) : (
            <div className="fc-empty-viewport">
              <span className="fc-empty-icon">💬</span>
              <h3>Hộp thư tư vấn khách hàng</h3>
              <p>Chọn một khách hàng ở cột bên trái để bắt đầu hỗ trợ tư vấn và chốt đơn.</p>
            </div>
          )}
        </main>
      </div>

      {/* Lightbox Zoom Ảnh */}
      {lightboxImage && (
        <div className="fc-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <div className="fc-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="fc-lightbox-close" onClick={() => setLightboxImage(null)}>&times;</button>
            <img src={lightboxImage} alt="Zoom Ảnh" />
          </div>
        </div>
      )}

      {/* Modal 1: Thông tin khách hàng */}
      {showInfoModal && activeChat && (
        <div className="zalo-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="zalo-info-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="zalo-info-modal-header-container">
              <h3>Thông tin khách hàng</h3>
              <button className="zalo-modal-close-btn" onClick={() => setShowInfoModal(false)}>&times;</button>
            </div>
            
            <div className="zalo-info-modal-body">
              <div className="zalo-info-avatar-section">
                <img src={activeChat.avatar} alt={activeChat.name} />
                <h4>{activeChat.name}</h4>
                <span className="badge-member">{activeChat.memberLevel || "Thành viên Đồng hành"}</span>
              </div>
              
              <div className="zalo-info-details-list">
                <div className="zalo-info-row">
                  <span className="info-label">Số điện thoại:</span>
                  <span className="info-value text-primary">{activeChat.phone || "Chưa cập nhật"}</span>
                </div>
                <div className="zalo-info-row">
                  <span className="info-label">Địa chỉ giao hàng:</span>
                  <span className="info-value">{activeChat.farmAddress || "Chưa cập nhật"}</span>
                </div>
                <div className="zalo-info-row">
                  <span className="info-label">Ngày tham gia:</span>
                  <span className="info-value">{activeChat.joinedDate || "Chưa rõ"}</span>
                </div>
                <div className="zalo-info-row">
                  <span className="info-label">Lịch sử mua sắm:</span>
                  <span className="info-value text-success">
                    {activeChat.completedOrdersCount !== undefined ? `${activeChat.completedOrdersCount} đơn hàng thành công` : "0 đơn hàng thành công"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Kho Ảnh/Video đã gửi */}
      {showMediaModal && activeChat && (
        <div className="zalo-modal-overlay" onClick={() => setShowMediaModal(false)}>
          <div className="zalo-media-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="zalo-media-modal-header">
              <div className="zalo-media-header-left">
                <h3>Kho Ảnh/Video đã gửi</h3>
                <span>({activeChat.mediaImages?.length || 0} ảnh)</span>
              </div>
              <button className="zalo-modal-close-btn" onClick={() => setShowMediaModal(false)}>&times;</button>
            </div>
            
            <div className="zalo-media-modal-body">
              {activeChat.mediaImages && activeChat.mediaImages.length > 0 ? (
                <div className="zalo-media-grid">
                  {activeChat.mediaImages.map((imgSrc, index) => (
                    <div 
                      key={index} 
                      className="zalo-media-grid-item"
                      onClick={() => { setLightboxImage(imgSrc); setShowMediaModal(false); }}
                    >
                      <img src={imgSrc} alt={`Media gửi ${index}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="zalo-media-empty">
                  <span className="empty-icon">🖼️</span>
                  <p>Chưa có hình ảnh nào được gửi giữa hai bên.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmerChat;
