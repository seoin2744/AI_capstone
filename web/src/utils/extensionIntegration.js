// 확장 프로그램과의 통합 유틸리티
// 확장 프로그램에서 웹으로 데이터를 전달받는 기능

console.log('확장 프로그램 통합 유틸리티 로드됨');

// 확장 프로그램 메시지 수신을 위한 이벤트 리스너
export function setupExtensionIntegration() {
  console.log('확장 프로그램 통합 설정 시작');
  
  // 커스텀 이벤트 리스너 (확장 프로그램에서 전달)
  window.addEventListener('extensionTypingPattern', handleTypingPatternFromExtension);
  
  // postMessage 리스너 (확장 프로그램에서 전달)
  window.addEventListener('message', handlePostMessageFromExtension);
  
  console.log('확장 프로그램 통합 설정 완료');
}

// 확장 프로그램에서 타이핑 패턴 수신
function handleTypingPatternFromExtension(event) {
  console.log('확장 프로그램에서 타이핑 패턴 수신:', event.detail);
  
  const { pattern, timestamp, userId } = event.detail;
  
  // 전역 이벤트로 다른 컴포넌트에 알림
  window.dispatchEvent(new CustomEvent('typingPatternReceived', {
    detail: {
      pattern: pattern,
      timestamp: timestamp,
      userId: userId,
      source: 'extension'
    }
  }));
}

// postMessage로 확장 프로그램에서 메시지 수신
function handlePostMessageFromExtension(event) {
  if (event.data && event.data.type === 'EXTENSION_MESSAGE' && 
      event.data.source === 'ai-auth-extension') {
    console.log('확장 프로그램에서 메시지 수신:', event.data.data);
    
    // 전역 이벤트로 다른 컴포넌트에 알림
    window.dispatchEvent(new CustomEvent('extensionMessageReceived', {
      detail: {
        data: event.data.data,
        source: 'extension'
      }
    }));
  }
}

// 확장 프로그램에 메시지 전송
export function sendMessageToExtension(message) {
  console.log('확장 프로그램에 메시지 전송:', message);
  
  // postMessage로 확장 프로그램에 전달
  window.postMessage({
    type: 'WEB_MESSAGE',
    source: 'web-app',
    data: message
  }, '*');
}

// 확장 프로그램 상태 확인
export function checkExtensionStatus() {
  return new Promise((resolve) => {
    // 확장 프로그램이 로드되어 있는지 확인
    if (window.aiAuthDebug) {
      console.log('확장 프로그램 감지됨');
      resolve({
        available: true,
        debug: window.aiAuthDebug
      });
    } else {
      console.log('확장 프로그램이 감지되지 않음');
      resolve({
        available: false,
        debug: null
      });
    }
  });
}

// 확장 프로그램에서 타이핑 패턴 수집 시작 요청
export function requestTypingPatternCollection() {
  if (window.aiAuthDebug) {
    console.log('확장 프로그램에 타이핑 패턴 수집 시작 요청');
    window.aiAuthDebug.startTypingPatternCollection();
    return true;
  }
  return false;
}

// 확장 프로그램에서 타이핑 패턴 수집 중단 요청
export function stopTypingPatternCollection() {
  if (window.aiAuthDebug) {
    console.log('확장 프로그램에 타이핑 패턴 수집 중단 요청');
    window.aiAuthDebug.stopTypingPatternCollection();
    return true;
  }
  return false;
}

// 확장 프로그램에서 타이핑 패턴 가져오기
export function getTypingPatternFromExtension() {
  if (window.aiAuthDebug) {
    console.log('확장 프로그램에서 타이핑 패턴 가져오기');
    return window.aiAuthDebug.getTypingPattern();
  }
  return null;
}

// 확장 프로그램에서 웹으로 타이핑 패턴 전송 요청
export function requestTypingPatternTransfer() {
  if (window.aiAuthDebug) {
    console.log('확장 프로그램에 타이핑 패턴 전송 요청');
    window.aiAuthDebug.sendTypingPatternToWeb();
    return true;
  }
  return false;
}

// 확장 프로그램 디버깅 정보 가져오기
export function getExtensionDebugInfo() {
  if (window.aiAuthDebug) {
    return {
      behaviorData: window.aiAuthDebug.getBehaviorData(),
      config: window.aiAuthDebug.getConfig(),
      typingPattern: window.aiAuthDebug.getTypingPattern()
    };
  }
  return null;
}

// 확장 프로그램과의 통합 상태 모니터링
export function monitorExtensionIntegration() {
  const status = {
    extensionAvailable: !!window.aiAuthDebug,
    lastCheck: Date.now(),
    events: {
      typingPatternReceived: 0,
      extensionMessageReceived: 0
    }
  };
  
  // 이벤트 카운터
  window.addEventListener('typingPatternReceived', () => {
    status.events.typingPatternReceived++;
  });
  
  window.addEventListener('extensionMessageReceived', () => {
    status.events.extensionMessageReceived++;
  });
  
  return status;
}

// 디버깅을 위한 전역 함수 노출
if (import.meta.env.VITE_DEBUG_MODE === 'true') {
  window.extensionIntegrationDebug = {
    setupExtensionIntegration,
    sendMessageToExtension,
    checkExtensionStatus,
    requestTypingPatternCollection,
    stopTypingPatternCollection,
    getTypingPatternFromExtension,
    requestTypingPatternTransfer,
    getExtensionDebugInfo,
    monitorExtensionIntegration
  };
}

console.log('확장 프로그램 통합 유틸리티 준비 완료');
