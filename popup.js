// Chrome Extension Popup Script
// 팝업 UI와 백그라운드 스크립트 간의 통신 처리

console.log('AI 인증 팝업 스크립트 로드됨');

// DOM 요소 참조
const loadingElement = document.getElementById('loading');
const statusContent = document.getElementById('status-content');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const anomalyScore = document.getElementById('anomaly-score');
const monitoringStatus = document.getElementById('monitoring-status');
const sessionTime = document.getElementById('session-time');
const refreshBtn = document.getElementById('refresh-btn');
const toggleBtn = document.getElementById('toggle-btn');
const errorMessage = document.getElementById('error-message');

// 상태 데이터
let currentStatus = {
  status: 'unknown',
  anomalyScore: 0,
  isEnabled: true,
  sessionDuration: 0
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('팝업 DOM 로드 완료');
  
  setupEventListeners();
  loadUserStatus();
  startPeriodicUpdate();
});

function setupEventListeners() {
  // 새로고침 버튼
  refreshBtn.addEventListener('click', () => {
    console.log('새로고침 버튼 클릭');
    loadUserStatus();
  });
  
  // 모니터링 토글 버튼
  toggleBtn.addEventListener('click', () => {
    console.log('모니터링 토글 버튼 클릭');
    toggleMonitoring();
  });
}

// 사용자 상태 로드
async function loadUserStatus() {
  console.log('사용자 상태 로드 시작');
  
  showLoading(true);
  hideError();
  
  try {
    // 백그라운드에서 사용자 상태 조회
    const response = await chrome.runtime.sendMessage({
      action: 'getUserStatus'
    });
    
    if (response.success) {
      console.log('사용자 상태 로드 성공:', response.data);
      currentStatus = response.data;
      updateUI();
    } else {
      console.error('사용자 상태 로드 실패:', response.error);
      showError('상태 로드 실패: ' + response.error);
    }
    
  } catch (error) {
    console.error('사용자 상태 로드 중 오류:', error);
    showError('상태 로드 중 오류가 발생했습니다.');
  } finally {
    showLoading(false);
  }
}

// 최근 로그 조회
async function loadRecentLogs() {
  try {
    console.log('최근 로그 조회 시작');
    
    const response = await chrome.runtime.sendMessage({
      action: 'fetchData',
      url: `${getBaseUrl()}/logs/anonymous`, // 실제로는 사용자 ID 사용
      method: 'GET'
    });
    
    if (response.success && response.data.length > 0) {
      const latestLog = response.data[0];
      console.log('최근 로그:', latestLog);
      
      // 최근 로그에서 이상 점수 업데이트
      if (latestLog.anomaly_score !== undefined) {
        currentStatus.anomalyScore = latestLog.anomaly_score;
        updateAnomalyScore();
      }
    }
    
  } catch (error) {
    console.error('최근 로그 조회 오류:', error);
  }
}

// 모니터링 토글
async function toggleMonitoring() {
  try {
    console.log('모니터링 토글 요청');
    
    const response = await chrome.tabs.query({ active: true, currentWindow: true });
    if (response.length > 0) {
      const tabId = response[0].id;
      
      const toggleResponse = await chrome.tabs.sendMessage(tabId, {
        action: 'toggleMonitoring'
      });
      
      if (toggleResponse.success) {
        currentStatus.isEnabled = toggleResponse.monitoring;
        updateMonitoringStatus();
        console.log('모니터링 상태 변경됨:', currentStatus.isEnabled);
      }
    }
    
  } catch (error) {
    console.error('모니터링 토글 오류:', error);
    showError('모니터링 토글 중 오류가 발생했습니다.');
  }
}

// UI 업데이트
function updateUI() {
  console.log('UI 업데이트:', currentStatus);
  
  updateStatusIndicator();
  updateAnomalyScore();
  updateMonitoringStatus();
  updateSessionTime();
  
  showLoading(false);
}

function updateStatusIndicator() {
  const statusMap = {
    'normal': { text: '정상', class: 'status-normal' },
    'suspicious': { text: '의심됨', class: 'status-suspicious' },
    'anomaly_detected': { text: '차단됨', class: 'status-blocked' },
    'unknown': { text: '확인 중', class: 'status-unknown' }
  };
  
  const statusInfo = statusMap[currentStatus.status] || statusMap['unknown'];
  
  statusText.textContent = statusInfo.text;
  statusDot.className = `status-dot ${statusInfo.class}`;
  
  console.log('상태 표시기 업데이트:', statusInfo);
}

function updateAnomalyScore() {
  const percentage = (currentStatus.anomalyScore * 100).toFixed(1);
  anomalyScore.textContent = `이상 점수: ${percentage}%`;
  
  // 이상 점수에 따른 색상 변경
  if (currentStatus.anomalyScore > 0.8) {
    anomalyScore.style.color = '#ffcdd2';
  } else if (currentStatus.anomalyScore > 0.5) {
    anomalyScore.style.color = '#ffe0b2';
  } else {
    anomalyScore.style.color = 'rgba(255, 255, 255, 0.8)';
  }
  
  console.log('이상 점수 업데이트:', percentage);
}

function updateMonitoringStatus() {
  monitoringStatus.textContent = currentStatus.isEnabled ? '활성' : '비활성';
  monitoringStatus.style.color = currentStatus.isEnabled ? '#c8e6c9' : '#ffcdd2';
  
  console.log('모니터링 상태 업데이트:', currentStatus.isEnabled);
}

function updateSessionTime() {
  const minutes = Math.floor(currentStatus.sessionDuration / 60000);
  sessionTime.textContent = `${minutes}분`;
  
  console.log('세션 시간 업데이트:', minutes);
}

// 로딩 상태 표시
function showLoading(show) {
  loadingElement.style.display = show ? 'block' : 'none';
  statusContent.style.display = show ? 'none' : 'block';
}

// 오류 메시지 표시
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  
  console.error('오류 메시지 표시:', message);
}

function hideError() {
  errorMessage.style.display = 'none';
}

// 주기적 업데이트 시작
function startPeriodicUpdate() {
  // 5초마다 상태 업데이트
  setInterval(() => {
    loadUserStatus();
  }, 5000);
  
  // 10초마다 최근 로그 조회
  setInterval(() => {
    loadRecentLogs();
  }, 10000);
  
  console.log('주기적 업데이트 시작됨');
}

// 기본 URL 가져오기
function getBaseUrl() {
  // config.js에서 BASE_URL을 가져오거나 기본값 사용
  return "http://192.168.0.10:8000";
}

// 디버깅을 위한 전역 함수 노출
window.popupDebug = {
  getCurrentStatus: () => currentStatus,
  loadStatus: () => loadUserStatus(),
  toggleMonitoring: () => toggleMonitoring(),
  getBaseUrl: () => getBaseUrl()
};

console.log('AI 인증 팝업 스크립트 준비 완료');
