// Chrome Extension Content Script
// 사용자의 키보드 및 마우스 행동 패턴 캡처 및 분석

console.log('AI 인증 콘텐츠 스크립트 로드됨');

// 전역 변수
let behaviorData = {
  keystrokes: [],
  mouseMovements: [],
  lastActivity: Date.now(),
  sessionStart: Date.now()
};

let isMonitoring = true;
let sendInterval = null;
let currentUserId = null;

// 설정 로드
const CONFIG = {
  BASE_URL: "http://192.168.0.10:8000",
  SEND_INTERVAL: 3000, // 3초마다 데이터 전송
  ANOMALY_THRESHOLD: 0.8,
  MIN_DATA_POINTS: 5
};

// 초기화
init();

function init() {
  console.log('콘텐츠 스크립트 초기화 시작');
  
  // 이벤트 리스너 등록
  setupEventListeners();
  
  // 주기적 데이터 전송 시작
  startPeriodicSending();
  
  // 백그라운드 스크립트와의 메시지 통신 설정
  setupMessageHandling();
  
  console.log('콘텐츠 스크립트 초기화 완료');
}

function setupEventListeners() {
  // 키보드 이벤트
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
  
  // 마우스 이벤트
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('mouseup', handleMouseUp, true);
  
  // 폼 제출 이벤트
  document.addEventListener('submit', handleFormSubmit, true);
  
  // 페이지 언로드 시 데이터 전송
  window.addEventListener('beforeunload', () => {
    if (behaviorData.keystrokes.length > 0 || behaviorData.mouseMovements.length > 0) {
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
            mouseMovements: behaviorData.mouseMovements.length,
            sessionDuration: Date.now() - behaviorData.sessionStart
          }
        });
        break;
        
      case 'toggleMonitoring':
        isMonitoring = !isMonitoring;
        console.log('모니터링 상태:', isMonitoring ? '활성화' : '비활성화');
        sendResponse({ success: true, monitoring: isMonitoring });
        break;
    }
  });
}

// 키보드 이벤트 처리
function handleKeyDown(event) {
  if (!isMonitoring) return;
  
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
  
  console.log('키 다운:', keyData);
}

function handleKeyUp(event) {
  if (!isMonitoring) return;
  
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
  
  console.log('키 업:', keyData);
}

// 마우스 이벤트 처리
function handleMouseMove(event) {
  if (!isMonitoring) return;
  
  const timestamp = Date.now();
  const mouseData = {
    type: 'mousemove',
    x: event.clientX,
    y: event.clientY,
    timestamp: timestamp,
    target: getElementInfo(event.target)
  };
  
  behaviorData.mouseMovements.push(mouseData);
  behaviorData.lastActivity = timestamp;
}

function handleMouseDown(event) {
  if (!isMonitoring) return;
  
  const timestamp = Date.now();
  const mouseData = {
    type: 'mousedown',
    x: event.clientX,
    y: event.clientY,
    button: event.button,
    timestamp: timestamp,
    target: getElementInfo(event.target)
  };
  
  behaviorData.mouseMovements.push(mouseData);
  behaviorData.lastActivity = timestamp;
}

function handleMouseUp(event) {
  if (!isMonitoring) return;
  
  const timestamp = Date.now();
  const mouseData = {
    type: 'mouseup',
    x: event.clientX,
    y: event.clientY,
    button: event.button,
    timestamp: timestamp,
    target: getElementInfo(event.target)
  };
  
  behaviorData.mouseMovements.push(mouseData);
  behaviorData.lastActivity = timestamp;
}

// 폼 제출 처리
function handleFormSubmit(event) {
  if (!isMonitoring) return;
  
  console.log('폼 제출 감지:', event.target);
  
  // 로그인 폼인지 확인
  const form = event.target;
  const isLoginForm = form.querySelector('input[type="password"]') !== null;
  
  if (isLoginForm) {
    console.log('로그인 폼 제출 감지 - 즉시 분석 시작');
    
    // 즉시 행동 데이터 분석 요청
    setTimeout(() => {
      sendBehaviorData(true); // 긴급 전송
    }, 100);
  }
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

// 주기적 데이터 전송 시작
function startPeriodicSending() {
  if (sendInterval) {
    clearInterval(sendInterval);
  }
  
  sendInterval = setInterval(() => {
    if (behaviorData.keystrokes.length >= CONFIG.MIN_DATA_POINTS || 
        behaviorData.mouseMovements.length >= CONFIG.MIN_DATA_POINTS) {
      sendBehaviorData();
    }
  }, CONFIG.SEND_INTERVAL);
  
  console.log('주기적 데이터 전송 시작됨 (3초 간격)');
}

// 행동 데이터 전송
async function sendBehaviorData(isUrgent = false) {
  if (!behaviorData.keystrokes.length && !behaviorData.mouseMovements.length) {
    console.log('전송할 데이터가 없음');
    return;
  }
  
  console.log('행동 데이터 전송 시작:', {
    keystrokes: behaviorData.keystrokes.length,
    mouseMovements: behaviorData.mouseMovements.length,
    urgent: isUrgent
  });
  
  const payload = {
    user_id: currentUserId || 'anonymous',
    timestamp: Date.now(),
    session_duration: Date.now() - behaviorData.sessionStart,
    keystrokes: behaviorData.keystrokes.slice(-50), // 최근 50개만 전송
    mouse_movements: behaviorData.mouseMovements.slice(-100), // 최근 100개만 전송
    urgency: isUrgent
  };
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'fetchData',
      url: `${CONFIG.BASE_URL}/auth/predict`,
      method: 'POST',
      body: payload
    });
    
    if (response.success) {
      console.log('행동 데이터 전송 성공:', response.data);
      
      // 이상 점수 확인
      const anomalyScore = response.data.anomaly_score || 0;
      
      if (anomalyScore > CONFIG.ANOMALY_THRESHOLD) {
        console.log('높은 이상 점수 감지:', anomalyScore);
        handleAnomalyDetected(anomalyScore);
      }
      
      // 데이터 초기화
      behaviorData.keystrokes = [];
      behaviorData.mouseMovements = [];
      
    } else {
      console.error('행동 데이터 전송 실패:', response.error);
    }
    
  } catch (error) {
    console.error('행동 데이터 전송 중 오류:', error);
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
  
  // 사용자 ID 추출 시도
  const urlParams = new URLSearchParams(window.location.search);
  currentUserId = urlParams.get('user_id') || urlParams.get('id');
  
  if (!currentUserId) {
    // 로컬 스토리지에서 사용자 ID 확인
    currentUserId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
  }
  
  console.log('현재 사용자 ID:', currentUserId);
}

// 디버깅을 위한 전역 함수 노출
window.aiAuthDebug = {
  getBehaviorData: () => behaviorData,
  sendData: () => sendBehaviorData(true),
  toggleMonitoring: () => {
    isMonitoring = !isMonitoring;
    console.log('모니터링 상태:', isMonitoring ? '활성화' : '비활성화');
  },
  getConfig: () => CONFIG
};

console.log('AI 인증 콘텐츠 스크립트 준비 완료');
