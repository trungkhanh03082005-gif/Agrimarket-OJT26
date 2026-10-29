import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Truck, CreditCard, User, Wrench, ShieldAlert, MessageCircle, FileText, Clock, Phone, Plus, FileClock } from 'lucide-react';
import Header from '../../../components/common/Header/Header';
import supportRequestService from '../../../services/supportRequestService';
import authService from '../../../services/authService';
import './LiveChat.css';

const LiveChat = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interactive action states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUser = authService.getCurrentUser();

  const emojis = ['😀', '😂', '😍', '👍', '👏', '🎉', '❤️', '🙏', '🔥', '✨'];

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load all support requests on mount
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const data = await supportRequestService.getMyRequests();
        setRequests(data);
        
        if (data.length > 0) {
          if (requestId) {
            const req = data.find(r => r.id === parseInt(requestId));
            if (req) {
              setSelectedRequest(req);
            } else {
              setSelectedRequest(data[0]);
              navigate(`/support/chat/${data[0].id}`, { replace: true });
            }
          } else {
            setSelectedRequest(data[0]);
            navigate(`/support/chat/${data[0].id}`, { replace: true });
          }
        }
      } catch (error) {
        console.error('Failed to load support requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [requestId, navigate]);

  // Handle message history and polling
  useEffect(() => {
    if (!selectedRequest) return;

    const fetchMessages = async () => {
      try {
        const data = await supportRequestService.getMessages(selectedRequest.id);
        setMessages(data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
    const intervalId = setInterval(fetchMessages, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedRequest]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFileName) return;
    if (!selectedRequest || sending) return;

    let messageContent = inputText.trim();
    if (attachedFileName) {
      messageContent = `[Đính kèm: ${attachedFileName}] ${messageContent}`.trim();
    }
    
    setInputText('');
    setAttachedFileName('');
    setShowEmojiPicker(false);
    setSending(true);

    try {
      // Optimistic update
      const tempMessage = {
        id: Date.now(),
        supportRequestId: selectedRequest.id,
        senderId: currentUser?.id || 9999,
        senderName: currentUser?.fullName || 'Khách hàng',
        senderRole: 'customer',
        content: messageContent,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMessage]);

      await supportRequestService.sendMessage(selectedRequest.id, messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại!');
      const data = await supportRequestService.getMessages(selectedRequest.id);
      setMessages(data);
    } finally {
      setSending(false);
    }
  };

  // Trigger file attachment
  const handleTriggerFile = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFileName(file.name);
      showToastNotification(`📎 Đã đính kèm tệp: ${file.name}`);
    }
  };

  const showToastNotification = (msg) => {
    // Basic browser alerts or simple overlay can be used, but since we have an alert or toast, we can print it
    console.log(msg);
  };

  // Append emoji
  const handleEmojiClick = (emoji) => {
    setInputText(prev => prev + emoji);
  };

  // Helper format time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Filter requests
  const filteredRequests = requests.filter(req => 
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to resolve icon for ticket categories
  const getCategoryIcon = (category) => {
    if (!category) return <FileText size={18} />;
    if (category.includes('Giao hàng')) return <Truck size={18} />;
    if (category.includes('Thanh toán')) return <CreditCard size={18} />;
    if (category.includes('Tài khoản')) return <User size={18} />;
    if (category.includes('Kỹ thuật')) return <Wrench size={18} />;
    if (category.includes('Vi phạm')) return <ShieldAlert size={18} />;
    return <MessageCircle size={18} />;
  };

  return (
    <div className="chat-page">
      <Header activeTab="support" />

      <div className="chat-container">
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />

        {/* 3-Column Workspace Layout */}
        <div className="chat-workspace">
          
          {/* Column 1: Sidebar List */}
          <div className="chat-sidebar">
            <div className="sidebar-title-row">
              <h2>Tin nhắn</h2>
              <button className="add-chat-btn" onClick={() => navigate('/support/create')} title="Tạo hỗ trợ mới">
                +
              </button>
            </div>
            
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Tìm kiếm hội thoại..."
                className="sidebar-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="sidebar-search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            
            <div className="chat-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                  Đang tải danh sách...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                  Không tìm thấy cuộc trò chuyện nào
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`chat-item ${selectedRequest?.id === req.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedRequest(req);
                      navigate(`/support/chat/${req.id}`);
                    }}
                  >
                    <div className="avatar-container">
                      <div className="chat-item-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getCategoryIcon(req.category)}
                      </div>
                      <span className="status-dot-indicator active"></span>
                    </div>
                    <div className="chat-item-info">
                      <div className="chat-item-header">
                        <span className="chat-item-name">{req.senderName || 'Khách hàng'}</span>
                        <span className="chat-item-time">{formatTime(req.createdAt)}</span>
                      </div>
                      <span className="chat-item-preview">{req.title}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Chat Area */}
          <div className="chat-area">
            {selectedRequest ? (
              <>
                <div className="chat-area-header">
                  <div className="chat-header-user-info">
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0f6244', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '15px', flexShrink: 0 }}>
                      AD
                    </div>
                    <div>
                      <h3>Ban quản trị AgriMarket</h3>
                      <div className="chat-area-header-subtitle-row">
                        <span className="chat-area-header-role">Hỗ trợ Hệ thống</span>
                        <span className="chat-area-header-status-badge">
                          <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                          Đang hoạt động
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="chat-header-actions">
                    <button className="chat-header-icon-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </button>
                    <button className="chat-header-icon-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="chat-messages-container">
                  {/* Date Separator */}
                  <div className="chat-date-separator">
                    <span>Hôm nay, {formatTime(selectedRequest.createdAt)}</span>
                  </div>

                  {/* System greeting message */}
                  <div className="message-bubble incoming">
                    <div className="message-avatar-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f6244', color: '#fff', fontWeight: 'bold', fontSize: '11px' }}>
                      AD
                    </div>
                    <div className="message-content-wrapper">
                      <div className="message-content">
                        Chào bạn! Cảm ơn bạn đã liên hệ Hỗ trợ AgriMarket. Chúng tôi có thể giúp gì cho yêu cầu **"{selectedRequest.title}"** của bạn?
                      </div>
                      <span className="message-time">{formatTime(selectedRequest.createdAt)}</span>
                    </div>
                  </div>

                  {/* Conversation History */}
                  {messages.map((msg) => {
                    const isOutgoing = msg.senderRole === 'customer';
                    return (
                      <div key={msg.id} className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                        {!isOutgoing && (
                          <div className="message-avatar-circle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f6244', color: '#fff', fontWeight: 'bold', fontSize: '11px' }}>
                            AD
                          </div>
                        )}
                        <div className="message-content-wrapper">
                          <div className="message-content">{msg.content}</div>
                          <span className="message-time">{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-bar-container">
                  {/* File attachment preview badge */}
                  {attachedFileName && (
                    <div style={{ padding: '4px 10px', backgroundColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', width: 'fit-content', gap: '8px' }}>
                      <span>📎 {attachedFileName}</span>
                      <button type="button" onClick={() => setAttachedFileName('')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#ef4444' }}>✕</button>
                    </div>
                  )}

                  {/* Emoji Picker Popover */}
                  {showEmojiPicker && (
                    <div style={{ display: 'flex', gap: '8px', padding: '8px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', width: 'fit-content' }}>
                      {emojis.map(emoji => (
                        <button key={emoji} type="button" onClick={() => handleEmojiClick(emoji)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <form className="chat-input-bar" onSubmit={handleSendMessage}>
                    <div className="input-media-actions">
                      <button type="button" className="input-action-btn" title="Thêm tập tin" onClick={handleTriggerFile}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="16"></line>
                          <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                      </button>
                      <button type="button" className="input-action-btn" title="Đính kèm hình ảnh" onClick={handleTriggerFile}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </button>
                      <button type="button" className="input-action-btn" title="Emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                          <line x1="9" y1="9" x2="9.01" y2="9"></line>
                          <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Nhập tin nhắn của bạn..."
                      className="chat-input"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    
                    <button
                      type="submit"
                      className="chat-send-btn"
                      disabled={(!inputText.trim() && !attachedFileName) || sending}
                    >
                      <span>Gửi</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="chat-empty-state">
                <div className="chat-empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageCircle size={48} /></div>
                <h3>Chưa chọn hội thoại</h3>
                <p>Hãy chọn một cuộc hội thoại từ danh sách bên trái hoặc tạo mới để trao đổi.</p>
                <Link to="/support/create" className="chat-send-btn" style={{ marginTop: '16px', textDecoration: 'none' }}>
                  Tạo yêu cầu hỗ trợ mới
                </Link>
              </div>
            )}
          </div>

          {/* Column 3: Details Panel */}
          {selectedRequest && (
            <div className="chat-details-panel">
              {/* Card 1: Ticket details */}
              <div className="details-card">
                <h3>Chi tiết hỗ trợ</h3>
                <div className="ticket-details-list">
                  <div className="ticket-details-item">
                    <span className="ticket-details-label">Mã hỗ trợ</span>
                    <span className="ticket-details-value code">#REQ-{selectedRequest.id}</span>
                  </div>
                  
                  {selectedRequest.orderCode && (
                    <div className="ticket-details-item">
                      <span className="ticket-details-label">Đơn hàng</span>
                      <Link to="/profile/orders" className="ticket-details-value link">
                        #{selectedRequest.orderCode}
                      </Link>
                    </div>
                  )}

                  <div className="ticket-details-item">
                    <span className="ticket-details-label">Trạng thái</span>
                    <span className={`ticket-status-badge ${selectedRequest.status}`}>
                      <span style={{ width: '5px', height: '5px', backgroundColor: 'currentColor', borderRadius: '50%', display: 'inline-block' }}></span>
                      {selectedRequest.status === 'pending' ? 'Chờ duyệt' :
                       selectedRequest.status === 'processing' ? 'Đang xử lý' :
                       selectedRequest.status === 'resolved' ? 'Đã giải quyết' : 'Từ chối'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Quick Actions */}
              <div className="details-card">
                <h3>Thao tác nhanh</h3>
                <div className="actions-list">
                  <Link to="/support/create" className="action-item-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Tạo Yêu cầu Hỗ trợ
                  </Link>
                  <Link to="/support/my-requests" className="action-item-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FileClock size={14} /> Xem yêu cầu của tôi
                  </Link>
                  <Link to="/support" className="action-item-link terminate" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} /> Kết thúc hội thoại
                  </Link>
                </div>
              </div>

              {/* Card 4: Working hours info */}
              <div className="details-card working-hours-card">
                <div className="working-hours-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} /></div>
                <h5>Giờ làm việc hỗ trợ</h5>
                <p>Thứ 2 - Thứ 6: 08:00 - 18:00</p>
                <p>Thứ 7: 08:00 - 12:00</p>
                
                <div className="hotline-btn-wrapper">
                  <a href="tel:1800123456" className="hotline-link-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    1800-123-456
                  </a>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LiveChat;
