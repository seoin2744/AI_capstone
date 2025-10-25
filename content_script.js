// Chrome Extension Content Script
// 사용자의 키보드 및 마우스 행동 패턴 캡처 및 분석

console.log('AI 인증 콘텐츠 스크립트 로드됨');

// 전역 변수
let behaviorData = {
  keystrokes: [],
  lastActivity: Date.now(),
  sessionStart: Date.now()
};

let isMonitoring = true;
let sendInterval = null;
let currentUserId = null;
let currentUserEmail = null; // 현재 사용자 이메일
let typingPatternBuffer = []; // 타이핑 패턴 버퍼
let isCollectingTypingPattern = false; // 타이핑 패턴 수집 상태
let userAccountData = new Map(); // 계정별 데이터 저장
let lastAnalysisTime = 0; // 마지막 분석 시간 (중복 전송 방지)
let isAnalysisInProgress = false; // 분석 진행 중 플래그

// 설정 로드
const CONFIG = {
  BASE_URL: "http://210.119.108.227:8080", // config.js와 동일한 URL로 변경
  SEND_INTERVAL: 30000, // 30초마다 데이터 전송 (사용하지 않음)
  ANOMALY_THRESHOLD: 0.8,
  MIN_DATA_POINTS: 5, // 최소 데이터 포인트 (로그인 시 전송용)
  MIN_PASSWORD_LENGTH: 8, // 비밀번호 최소 길이 (자동 분석 트리거)
  ENABLE_PERIODIC_SENDING: false // 주기적 전송 완전 비활성화
};

// 초기화
init();

function init() {
  console.log('콘텐츠 스크립트 초기화 시작');
  
  // 이벤트 리스너 등록
  setupEventListeners();
  
  // 주기적 데이터 전송은 사용하지 않음 - 로그인 폼 제출 시에만 전송
  console.log('주기적 데이터 전송 비활성화 - 로그인 폼 제출 시에만 전송');
  
  // 백그라운드 스크립트와의 메시지 통신 설정
  setupMessageHandling();
  
  console.log('콘텐츠 스크립트 초기화 완료');
}

function setupEventListeners() {
  // 키보드 이벤트
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
  
  // 폼 제출 이벤트
  document.addEventListener('submit', handleFormSubmit, true);
  
  // 페이지 언로드 시 데이터 전송
  window.addEventListener('beforeunload', () => {
    if (behaviorData.keystrokes.length > 0) {
      sendBehaviorData();
    }
  });
}

function setupMessageHandling() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('콘텐츠 스크립트에서 메시지 수신:', request);
    
    switch (request.action) {
      case 'statusUpdate':
        handleStatusUpdate(request.data);
        break;
        
      case 'loginPageDetected':
        handleLoginPageDetected();
        break;
        
      case 'getCurrentData':
        sendResponse({
          success: true,
          data: {
            keystrokes: behaviorData.keystrokes.length,
            sessionDuration: Date.now() - behaviorData.sessionStart
          }
        });
        break;
        
      case 'toggleMonitoring':
        isMonitoring = !isMonitoring;
        console.log('모니터링 상태:', isMonitoring ? '활성화' : '비활성화');
        sendResponse({ success: true, monitoring: isMonitoring });
        break;
        
      case 'startTypingPatternCollection':
        startTypingPatternCollection();
        sendResponse({ success: true, collecting: isCollectingTypingPattern });
        break;
        
      case 'stopTypingPatternCollection':
        stopTypingPatternCollection();
        sendResponse({ success: true, collecting: isCollectingTypingPattern });
        break;
        
      case 'getTypingPattern':
        const pattern = getTypingPattern();
        sendResponse({ success: true, pattern: pattern });
        break;
        
      case 'sendTypingPatternToWeb':
        sendTypingPatternToWeb();
        sendResponse({ success: true });
        break;
    }
  });
}

// 키보드 이벤트 처리
function handleKeyDown(event) {
  if (!isMonitoring) return;
  
  // 비밀번호 필드일 때만 로그 출력
  const isPasswordField = event.target.type === 'password' || 
                          event.target.id === 'password' || 
                          event.target.id === 'passwordConfirm';
  
  const timestamp = Date.now();
  const keyData = {
    type: 'keydown',
    key: event.key,
    code: event.code,
    timestamp: timestamp,
    target: getElementInfo(event.target)
  };
  
  behaviorData.keystrokes.push(keyData);
  behaviorData.lastActivity = timestamp;
  
  // 타이핑 패턴 수집 중이면 버퍼에 추가
  if (isCollectingTypingPattern) {
    typingPatternBuffer.push(keyData);
  }
  
  // 비밀번호 필드에서 엔터키를 누른 경우 즉시 분석
  if (isPasswordField && event.key === 'Enter') {
    console.log('🔐 비밀번호 입력 완료 (엔터키) - 즉시 행동데이터 분석 시작');
    checkAndSendBehaviorData();
  }
  
  // 비밀번호 필드일 때만 로그 출력
  if (isPasswordField) {
    console.log('키 다운:', keyData);
  }
}

function handleKeyUp(event) {
  if (!isMonitoring) return;
  
  // 비밀번호 필드일 때만 로그 출력
  const isPasswordField = event.target.type === 'password' || 
                          event.target.id === 'password' || 
                          event.target.id === 'passwordConfirm';
  
  const timestamp = Date.now();
  const keyData = {
    type: 'keyup',
    key: event.key,
    code: event.code,
    timestamp: timestamp,
    target: getElementInfo(event.target)
  };
  
  behaviorData.keystrokes.push(keyData);
  behaviorData.lastActivity = timestamp;
  
  // 타이핑 패턴 수집 중이면 버퍼에 추가
  if (isCollectingTypingPattern) {
    typingPatternBuffer.push(keyData);
  }
  
  // 비밀번호 필드일 때만 로그 출력
  if (isPasswordField) {
    console.log('키 업:', keyData);
    
    // 비밀번호 길이가 충분하면 즉시 분석 시작 (엔터 전에!)
    setTimeout(() => {
      const passwordLength = event.target.value.length;
      if (passwordLength >= CONFIG.MIN_PASSWORD_LENGTH) {
        console.log(`🔐 비밀번호 ${passwordLength}자 입력 완료 - 즉시 행동데이터 분석 시작`);
        checkAndSendBehaviorData();
      }
    }, 100); // 입력 완료 후 약간의 지연
  }
}



// 폼 제출 처리 - 로그인 시에만 행동데이터 전송
function handleFormSubmit(event) {
  if (!isMonitoring) return;
  
  console.log('폼 제출 감지:', event.target);
  
  // 현재 페이지가 회원가입 페이지인지 확인
  const isRegistrationPage = isRegistrationPageDetected();
  
  // 로그인 폼인지 확인 (비밀번호 필드가 있는지)
  const form = event.target;
  const isLoginForm = form.querySelector('input[type="password"]') !== null;
  
  if (isLoginForm && !isRegistrationPage) {
    console.log('🔐 로그인 폼 제출 감지');
    
    // 이미 분석이 진행 중이면 중복 분석 방지
    if (isAnalysisInProgress) {
      console.log('⏳ 이미 분석이 진행 중 - 중복 분석 방지');
      return;
    }
    
    // 충분한 데이터가 있는지 확인
    if (behaviorData.keystrokes.length >= CONFIG.MIN_DATA_POINTS) {
      console.log(`📊 수집된 키스트로크: ${behaviorData.keystrokes.length}개`);
      
      // 즉시 행동 데이터 분석 요청
      setTimeout(() => {
        sendBehaviorData(true); // 긴급 전송
      }, 100);
    } else {
      console.log(`⚠️ 키스트로크 데이터 부족: ${behaviorData.keystrokes.length}/${CONFIG.MIN_DATA_POINTS}개`);
    }
  } else if (isRegistrationPage) {
    console.log('📝 회원가입 페이지 감지 - 행동데이터 전송 건너뜀');
  } else {
    console.log('📄 일반 폼 제출 - 행동데이터 전송 건너뜀');
  }
}

// 행동데이터 전송 조건 확인 및 전송 (비밀번호 입력 완료 시 즉시 호출)
function checkAndSendBehaviorData() {
  // 중복 전송 방지 (3초 내 중복 전송 방지)
  const now = Date.now();
  if (now - lastAnalysisTime < 3000) {
    console.log('⏰ 중복 전송 방지 - 최근 분석 후 3초 이내');
    return;
  }
  
  // 이미 분석이 진행 중이면 중복 분석 방지
  if (isAnalysisInProgress) {
    console.log('⏳ 이미 분석이 진행 중 - 중복 분석 방지');
    return;
  }
  
  // 회원가입 페이지인지 확인
  if (isRegistrationPageDetected()) {
    console.log('📝 회원가입 페이지 감지 - 행동데이터 전송 건너뜀');
    return;
  }
  
  // 충분한 데이터가 있는지 확인
  if (behaviorData.keystrokes.length < CONFIG.MIN_DATA_POINTS) {
    console.log(`⚠️ 키스트로크 데이터 부족: ${behaviorData.keystrokes.length}/${CONFIG.MIN_DATA_POINTS}개`);
    return;
  }
  
  console.log(`🚀 즉시 행동데이터 분석 시작 - 키스트로크: ${behaviorData.keystrokes.length}개`);
  
  // 마지막 분석 시간 업데이트
  lastAnalysisTime = now;
  isAnalysisInProgress = true;
  
  // 행동데이터 전송
  setTimeout(() => {
    sendBehaviorData(true);
  }, 200); // 약간의 지연 후 전송
}

// 회원가입 페이지 감지
function isRegistrationPageDetected() {
  // URL 패턴으로 회원가입 페이지 확인
  const url = window.location.href.toLowerCase();
  const registrationKeywords = [
    'register', 'signup', 'join', 'create', 'registration',
    'sign-up', 'sign_up', '회원가입', '가입'
  ];
  
  // URL에 회원가입 관련 키워드가 있는지 확인
  const hasRegistrationKeyword = registrationKeywords.some(keyword => 
    url.includes(keyword)
  );
  
  // 페이지 제목으로 확인
  const pageTitle = document.title.toLowerCase();
  const hasRegistrationTitle = registrationKeywords.some(keyword => 
    pageTitle.includes(keyword)
  );
  
  // 폼 요소로 확인 (비밀번호 확인 필드가 있는지)
  const passwordConfirmField = document.querySelector('input[name*="confirm"], input[id*="confirm"], input[placeholder*="확인"]');
  
  // 회원가입 관련 텍스트가 있는지 확인
  const registrationTexts = document.querySelectorAll('h1, h2, h3, .title, .header');
  const hasRegistrationText = Array.from(registrationTexts).some(element => {
    const text = element.textContent.toLowerCase();
    return registrationKeywords.some(keyword => text.includes(keyword));
  });
  
  const isRegistration = hasRegistrationKeyword || hasRegistrationTitle || 
                        passwordConfirmField || hasRegistrationText;
  
  if (isRegistration) {
    console.log('회원가입 페이지로 감지됨');
  }
  
  return isRegistration;
}

// 요소 정보 추출
function getElementInfo(element) {
  if (!element) return null;
  
  return {
    tagName: element.tagName,
    type: element.type,
    id: element.id,
    className: element.className,
    name: element.name,
    placeholder: element.placeholder
  };
}

// 주기적 데이터 전송 시작 (로그인 페이지에서만 활성화)
function startPeriodicSending() {
  if (sendInterval) {
    clearInterval(sendInterval);
  }
  
  // 주기적 전송이 비활성화되어 있으면 시작하지 않음
  if (!CONFIG.ENABLE_PERIODIC_SENDING) {
    console.log('주기적 데이터 전송이 비활성화됨');
    return;
  }
  
  sendInterval = setInterval(() => {
    if (behaviorData.keystrokes.length >= CONFIG.MIN_DATA_POINTS) {
      sendBehaviorData();
    }
  }, CONFIG.SEND_INTERVAL);
  
  console.log('주기적 데이터 전송 시작됨 (30초 간격)');
}

// 행동 데이터 전송 - 로그인 시에만 호출됨
async function sendBehaviorData(isUrgent = false) {
  if (!behaviorData.keystrokes.length) {
    console.log('전송할 데이터가 없음');
    return;
  }
  
  console.log('🚀 행동 데이터 전송 시작:', {
    keystrokes: behaviorData.keystrokes.length,
    urgent: isUrgent
  });
  
  const payload = {
    user_id: currentUserId || 'anonymous',
    user_email: currentUserEmail || null,
    timestamp: Date.now(),
    session_duration: Date.now() - behaviorData.sessionStart,
    keystrokes: behaviorData.keystrokes.slice(-50), // 최근 50개만 전송
    urgency: isUrgent,
    url: window.location.href,
    domain: window.location.hostname
  };
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'fetchData',
      url: `${CONFIG.BASE_URL}/auth/predict`,
      method: 'POST',
      body: payload
    });
    
    if (response.success) {
      console.log('✅ 행동 데이터 전송 성공:', response.data);
      
      // 이상 점수 확인
      const anomalyScore = response.data.anomaly_score || 0;
      
      if (anomalyScore > CONFIG.ANOMALY_THRESHOLD) {
        console.log('⚠️ 높은 이상 점수 감지:', anomalyScore);
        handleAnomalyDetected(anomalyScore);
      } else {
        console.log('✅ 정상적인 로그인 패턴으로 판단됨');
      }
      
      // 데이터 초기화
      behaviorData.keystrokes = [];
      
    } else {
      console.error('❌ 행동 데이터 전송 실패:', response.error);
    }
    
  } catch (error) {
    console.error('❌ 행동 데이터 전송 중 오류:', error);
    
    // 오류가 발생해도 데이터는 초기화 (메모리 누수 방지)
    behaviorData.keystrokes = [];
  } finally {
    // 분석 완료 후 플래그 리셋
    isAnalysisInProgress = false;
  }
}

// 이상 패턴 감지 처리
function handleAnomalyDetected(anomalyScore) {
  console.log('이상 패턴 감지됨! 점수:', anomalyScore);
  
  // 로그인 폼 비활성화
  disableLoginForms();
  
  // 경고 오버레이 표시
  showAnomalyWarning(anomalyScore);
  
  // 백그라운드에 상태 업데이트
  chrome.runtime.sendMessage({
    action: 'updateUserStatus',
    data: {
      status: 'anomaly_detected',
      anomalyScore: anomalyScore
    }
  });
}

// 로그인 폼 비활성화
function disableLoginForms() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
  
  passwordInputs.forEach(input => {
    input.disabled = true;
    input.style.opacity = '0.5';
    input.style.cursor = 'not-allowed';
  });
  
  submitButtons.forEach(button => {
    button.disabled = true;
    button.style.opacity = '0.5';
    button.style.cursor = 'not-allowed';
  });
  
  console.log('로그인 폼 비활성화됨');
}

// 이상 경고 오버레이 표시
function showAnomalyWarning(anomalyScore) {
  // 기존 경고 제거
  const existingWarning = document.getElementById('ai-auth-warning');
  if (existingWarning) {
    existingWarning.remove();
  }
  
  // 새 경고 생성
  const warning = document.createElement('div');
  warning.id = 'ai-auth-warning';
  warning.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(135deg, #ff4444, #cc0000);
    color: white;
    padding: 15px;
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 16px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    animation: slideDown 0.5s ease-out;
  `;
  
  warning.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
      <span style="font-size: 20px;">⚠️</span>
      <span>비정상 로그인 패턴 감지됨 (${(anomalyScore * 100).toFixed(1)}%) – 이메일 인증 필요</span>
      <button id="dismiss-warning" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">닫기</button>
    </div>
  `;
  
  // CSS 애니메이션 추가
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(warning);
  
  // 닫기 버튼 이벤트
  document.getElementById('dismiss-warning').addEventListener('click', () => {
    warning.remove();
  });
  
  console.log('이상 경고 오버레이 표시됨');
}

// 상태 업데이트 처리
function handleStatusUpdate(data) {
  console.log('상태 업데이트 수신:', data);
  
  if (data.status === 'normal') {
    // 정상 상태로 복구
    enableLoginForms();
    hideAnomalyWarning();
  }
}

// 로그인 폼 활성화
function enableLoginForms() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
  
  passwordInputs.forEach(input => {
    input.disabled = false;
    input.style.opacity = '1';
    input.style.cursor = 'text';
  });
  
  submitButtons.forEach(button => {
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  });
  
  console.log('로그인 폼 활성화됨');
}

// 이상 경고 숨기기
function hideAnomalyWarning() {
  const warning = document.getElementById('ai-auth-warning');
  if (warning) {
    warning.remove();
    console.log('이상 경고 숨김');
  }
}

// 로그인 페이지 감지 처리
function handleLoginPageDetected() {
  console.log('로그인 페이지 감지됨 - 강화된 모니터링 시작');
  
  // 로그인 페이지에서는 더 민감하게 모니터링
  CONFIG.ANOMALY_THRESHOLD = 0.7; // 임계값 낮춤
  
  // 주기적 전송은 사용하지 않음 - 로그인 폼 제출 시에만 전송
  console.log('로그인 페이지 감지 - 폼 제출 시에만 행동데이터 전송');
  
  // 사용자 계정 정보 추출
  extractUserAccountInfo();
  
  console.log('현재 사용자 정보:', { userId: currentUserId, email: currentUserEmail });
}

// 사용자 계정 정보 추출
function extractUserAccountInfo() {
  // URL 파라미터에서 사용자 정보 추출
  const urlParams = new URLSearchParams(window.location.search);
  currentUserId = urlParams.get('user_id') || urlParams.get('id');
  currentUserEmail = urlParams.get('email') || urlParams.get('user_email');
  
  // 로컬 스토리지에서 사용자 정보 확인
  if (!currentUserId) {
    currentUserId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
  }
  
  if (!currentUserEmail) {
    currentUserEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
  }
  
  // 폼에서 이메일 추출 시도
  if (!currentUserEmail) {
    const emailInput = document.querySelector('input[type="email"], input[name="email"], input[name="username"]');
    if (emailInput && emailInput.value) {
      currentUserEmail = emailInput.value;
    }
  }
  
  // 계정별 데이터 초기화
  if (currentUserId || currentUserEmail) {
    const accountKey = currentUserId || currentUserEmail;
    if (!userAccountData.has(accountKey)) {
      userAccountData.set(accountKey, {
        userId: currentUserId,
        email: currentUserEmail,
        loginAttempts: [],
        typingPatterns: [],
        lastActivity: Date.now()
      });
    }
  }
}

// 타이핑 패턴 수집 시작
function startTypingPatternCollection() {
  console.log('타이핑 패턴 수집 시작');
  isCollectingTypingPattern = true;
  typingPatternBuffer = [];
}

// 타이핑 패턴 수집 중단
function stopTypingPatternCollection() {
  console.log('타이핑 패턴 수집 중단');
  isCollectingTypingPattern = false;
}

// 수집된 타이핑 패턴 반환
function getTypingPattern() {
  return {
    pattern: typingPatternBuffer,
    length: typingPatternBuffer.length,
    collecting: isCollectingTypingPattern
  };
}

// 타이핑 패턴을 웹으로 전달
function sendTypingPatternToWeb() {
  if (typingPatternBuffer.length === 0) {
    console.log('전송할 타이핑 패턴이 없음');
    return;
  }
  
  console.log('타이핑 패턴을 웹으로 전달:', typingPatternBuffer.length, '개 이벤트');
  
  // 웹 페이지에 커스텀 이벤트로 데이터 전달
  const event = new CustomEvent('extensionTypingPattern', {
    detail: {
      pattern: typingPatternBuffer,
      timestamp: Date.now(),
      userId: currentUserId
    }
  });
  
  window.dispatchEvent(event);
  
  // 패턴 버퍼 초기화
  typingPatternBuffer = [];
}

// 웹에서 확장 프로그램으로 메시지 전달 (postMessage 사용)
function sendMessageToWeb(data) {
  window.postMessage({
    type: 'EXTENSION_MESSAGE',
    source: 'ai-auth-extension',
    data: data
  }, '*');
}

// 디버깅을 위한 전역 함수 노출
window.aiAuthDebug = {
  getBehaviorData: () => behaviorData,
  sendData: () => sendBehaviorData(true),
  toggleMonitoring: () => {
    isMonitoring = !isMonitoring;
    console.log('모니터링 상태:', isMonitoring ? '활성화' : '비활성화');
  },
  getConfig: () => CONFIG,
  startTypingPatternCollection: startTypingPatternCollection,
  stopTypingPatternCollection: stopTypingPatternCollection,
  getTypingPattern: getTypingPattern,
  sendTypingPatternToWeb: sendTypingPatternToWeb,
  sendMessageToWeb: sendMessageToWeb,
  isRegistrationPage: isRegistrationPageDetected,
  clearBehaviorData: () => {
    behaviorData.keystrokes = [];
    console.log('행동 데이터 초기화됨');
  },
  testServerConnection: async () => {
    console.log('서버 연결 테스트 시작...');
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchData',
        url: `${CONFIG.BASE_URL}/health`,
        method: 'GET'
      });
      
      if (response.success) {
        console.log('✅ 서버 연결 성공:', response.data);
        return true;
      } else {
        console.log('❌ 서버 연결 실패:', response.error);
        return false;
      }
    } catch (error) {
      console.log('❌ 서버 연결 오류:', error.message);
      return false;
    }
  },
  simulateLogin: () => {
    console.log('🔐 로그인 시뮬레이션 - 행동데이터 전송 테스트');
    checkAndSendBehaviorData();
  },
  checkPasswordLength: () => {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    passwordFields.forEach((field, index) => {
      console.log(`비밀번호 필드 ${index + 1}: ${field.value.length}자`);
    });
  },
  forceAnalysis: () => {
    console.log('🚀 강제 분석 시작');
    checkAndSendBehaviorData();
  }
};

console.log('AI 인증 콘텐츠 스크립트 준비 완료');
