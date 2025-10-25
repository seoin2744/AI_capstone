// 메인 App 컴포넌트
// 라우팅 및 전체 애플리케이션 상태 관리

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import RegisterForm from './components/RegisterForm.jsx';
import LoginForm from './components/LoginForm.jsx';
import LogsView from './components/LogsView.jsx';
import { getCurrentUser, logout, isAuthenticated } from './api/user.js';
import { getAuthToken } from './api/auth.js';
import './styles/main.css';

console.log('메인 App 컴포넌트 로드됨');

const App = () => {
  // 상태 관리
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('login');
  const [notifications, setNotifications] = useState([]);

  // 사용자 인증 상태 확인
  useEffect(() => {
    console.log('사용자 인증 상태 확인');
    
    const checkAuthStatus = async () => {
      try {
        const user = getCurrentUser();
        const token = getAuthToken();
        
        if (user && token) {
          console.log('인증된 사용자:', user);
          setCurrentUser(user);
        } else {
          console.log('인증되지 않은 사용자');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('인증 상태 확인 오류:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // 알림 추가
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // 5초 후 자동 제거
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
    
    console.log('알림 추가:', notification);
  };

  // 알림 제거
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 회원가입 성공 처리
  const handleRegisterSuccess = (result) => {
    console.log('회원가입 성공 처리:', result);
    addNotification('회원가입이 완료되었습니다!', 'success');
    
    // 로그인 탭으로 전환
    setActiveTab('login');
  };

  // 회원가입 오류 처리
  const handleRegisterError = (error) => {
    console.error('회원가입 오류 처리:', error);
    addNotification(`회원가입 오류: ${error}`, 'error');
  };

  // 로그인 성공 처리
  const handleLoginSuccess = (result) => {
    console.log('로그인 성공 처리:', result);
    
    // 사용자 정보 업데이트
    setCurrentUser({
      id: result.user?.id || result.user_id,
      email: result.user?.email || result.email
    });
    
    // 이상 점수에 따른 알림
    if (result.anomalyScore > 0.8) {
      addNotification('높은 이상 패턴이 감지되었습니다. 추가 인증이 필요할 수 있습니다.', 'warning');
    } else if (result.anomalyScore > 0.5) {
      addNotification('의심스러운 패턴이 감지되었습니다.', 'warning');
    } else {
      addNotification('로그인에 성공했습니다!', 'success');
    }
    
    // 이메일 인증이 필요한 경우
    if (result.requiresEmailVerification) {
      addNotification('이메일 인증이 필요합니다. 이메일을 확인해주세요.', 'info');
    }
  };

  // 로그인 오류 처리
  const handleLoginError = (error) => {
    console.error('로그인 오류 처리:', error);
    addNotification(`로그인 오류: ${error}`, 'error');
  };

  // 로그아웃 처리
  const handleLogout = () => {
    console.log('로그아웃 처리');
    
    logout();
    setCurrentUser(null);
    setActiveTab('login');
    
    addNotification('로그아웃되었습니다.', 'info');
  };

  // 탭 변경 처리
  const handleTabChange = (tab) => {
    console.log('탭 변경:', tab);
    setActiveTab(tab);
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {/* 헤더 */}
        <header className="header">
          <div className="container">
            <h1>🛡️ AI 연속 인증 시스템</h1>
            <p>행동 패턴 분석을 통한 지능형 보안 솔루션</p>
          </div>
        </header>

        {/* 네비게이션 */}
        <nav className="nav">
          <div className="container">
            <ul className="nav-list">
              {!currentUser ? (
                <>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'login' ? 'active' : ''}`}
                      onClick={() => handleTabChange('login')}
                    >
                      로그인
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'register' ? 'active' : ''}`}
                      onClick={() => handleTabChange('register')}
                    >
                      회원가입
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link to="/dashboard" className="nav-link">
                      대시보드
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/logs" className="nav-link">
                      활동 로그
                    </Link>
                  </li>
                  <li className="nav-item">
                    <button
                      onClick={handleLogout}
                      className="nav-link btn-logout"
                    >
                      로그아웃
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </nav>

        {/* 알림 */}
        {notifications.length > 0 && (
          <div className="notifications">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification ${notification.type}`}
              >
                <span className="notification-message">
                  {notification.message}
                </span>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="notification-close"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 메인 콘텐츠 */}
        <main className="main">
          <div className="container">
            <Routes>
              {/* 인증되지 않은 사용자 */}
              {!currentUser ? (
                <>
                  <Route
                    path="/"
                    element={
                      <div className="auth-container">
                        {activeTab === 'login' ? (
                          <div className="card">
                            <div className="card-header">
                              <h2 className="card-title">로그인</h2>
                              <p className="card-subtitle">
                                타이핑 패턴을 분석하여 안전한 로그인을 제공합니다.
                              </p>
                            </div>
                            <LoginForm
                              onSuccess={handleLoginSuccess}
                              onError={handleLoginError}
                            />
                          </div>
                        ) : (
                          <div className="card">
                            <div className="card-header">
                              <h2 className="card-title">회원가입</h2>
                              <p className="card-subtitle">
                                타이핑 패턴을 등록하여 향후 인증에 사용됩니다.
                              </p>
                            </div>
                            <RegisterForm
                              onSuccess={handleRegisterSuccess}
                              onError={handleRegisterError}
                            />
                          </div>
                        )}
                      </div>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ) : (
                <>
                  {/* 인증된 사용자 */}
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <div className="dashboard">
                        <div className="card">
                          <div className="card-header">
                            <h2 className="card-title">대시보드</h2>
                            <p className="card-subtitle">
                              안녕하세요, {currentUser.email}님!
                            </p>
                          </div>
                          <div className="dashboard-content">
                            <div className="dashboard-stats">
                              <div className="stat-card">
                                <h3>현재 상태</h3>
                                <p className="status-normal">정상</p>
                              </div>
                              <div className="stat-card">
                                <h3>마지막 로그인</h3>
                                <p>{new Date().toLocaleString('ko-KR')}</p>
                              </div>
                              <div className="stat-card">
                                <h3>활성 세션</h3>
                                <p>1개</p>
                              </div>
                            </div>
                            
                            <div className="dashboard-actions">
                              <Link to="/logs" className="btn btn-primary">
                                활동 로그 보기
                              </Link>
                              <button
                                onClick={handleLogout}
                                className="btn btn-secondary"
                              >
                                로그아웃
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/logs"
                    element={
                      <div className="logs-container">
                        <LogsView userId={currentUser.id} />
                      </div>
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
          </div>
        </main>

        {/* 푸터 */}
        <footer className="footer">
          <div className="container">
            <p>&copy; 2024 AI 연속 인증 시스템. 모든 권리 보유.</p>
            <p className="footer-info">
              행동 패턴 분석을 통한 지능형 보안 솔루션
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
