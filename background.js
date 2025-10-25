// Chrome Extension Background Script
// 팝업과 콘텐츠 스크립트 간의 메시지 중계 및 CORS 우회 처리

console.log('AI 인증 백그라운드 스크립트 로드됨');

// 확장 프로그램 설치/업데이트 이벤트 처리
chrome.runtime.onInstalled.addListener((details) => {
  console.log('확장 프로그램 설치됨:', details.reason);
  
  if (details.reason === 'install') {
    // 초기 설정
    chrome.storage.local.set({
      isEnabled: true,
      lastAnomalyScore: 0,
      userStatus: 'unknown'
    });
  }
});

// 팝업과 콘텐츠 스크립트 간 메시지 중계
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('백그라운드에서 메시지 수신:', request);
  
  switch (request.action) {
    case 'fetchData':
      handleFetchRequest(request, sendResponse);
      return true; // 비동기 응답을 위해 true 반환
      
    case 'getUserStatus':
      getUserStatus(sendResponse);
      return true;
      
    case 'updateUserStatus':
      updateUserStatus(request.data, sendResponse);
      return true;
      
    default:
      console.log('알 수 없는 액션:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// CORS 우회를 위한 fetch 요청 처리
async function handleFetchRequest(request, sendResponse) {
  try {
    console.log('백그라운드에서 fetch 요청 처리:', request.url);
    
    const response = await fetch(request.url, {
      method: request.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...request.headers
      },
      body: request.body ? JSON.stringify(request.body) : undefined
    });
    
    const data = await response.json();
    
    console.log('백그라운드 fetch 응답:', data);
    
    sendResponse({
      success: true,
      data: data,
      status: response.status
    });
  } catch (error) {
    console.error('백그라운드 fetch 오류:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 사용자 상태 조회
async function getUserStatus(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['userStatus', 'lastAnomalyScore', 'isEnabled']);
    console.log('사용자 상태 조회:', result);
    
    sendResponse({
      success: true,
      data: {
        status: result.userStatus || 'unknown',
        anomalyScore: result.lastAnomalyScore || 0,
        isEnabled: result.isEnabled !== false
      }
    });
  } catch (error) {
    console.error('사용자 상태 조회 오류:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 사용자 상태 업데이트
async function updateUserStatus(data, sendResponse) {
  try {
    await chrome.storage.local.set({
      userStatus: data.status,
      lastAnomalyScore: data.anomalyScore,
      lastUpdate: Date.now()
    });
    
    console.log('사용자 상태 업데이트됨:', data);
    
    // 모든 탭에 상태 변경 알림
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'statusUpdate',
          data: data
        }).catch(() => {
          // 콘텐츠 스크립트가 없는 탭은 무시
        });
      });
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('사용자 상태 업데이트 오류:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 탭 업데이트 시 콘텐츠 스크립트 주입 확인
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('탭 업데이트됨:', tab.url);
    
    // 로그인 페이지 감지 시 특별 처리
    if (tab.url.includes('login') || tab.url.includes('signin')) {
      chrome.tabs.sendMessage(tabId, {
        action: 'loginPageDetected'
      }).catch(() => {
        console.log('로그인 페이지에서 메시지 전송 실패');
      });
    }
  }
});
