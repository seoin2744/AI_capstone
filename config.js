// Chrome Extension Configuration
// API 기본 URL 및 기타 설정 관리

console.log('AI 인증 설정 파일 로드됨');

// 기본 설정
export const CONFIG = {
  // API 기본 URL - .env에서 오버라이드 가능
  BASE_URL: "http://192.168.0.10:8000",
  
  // 데이터 전송 간격 (밀리초)
  SEND_INTERVAL: 3000,
  
  // 이상 점수 임계값
  ANOMALY_THRESHOLD: 0.8,
  
  // 최소 데이터 포인트 수
  MIN_DATA_POINTS: 5,
  
  // 로그인 페이지에서의 임계값 (더 민감하게)
  LOGIN_PAGE_THRESHOLD: 0.7,
  
  // 최대 전송할 키스트로크 수
  MAX_KEYSTROKES: 50,
  
  // 최대 전송할 마우스 움직임 수
  MAX_MOUSE_MOVEMENTS: 100,
  
  // 세션 타임아웃 (밀리초)
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30분
  
  // 디버그 모드
  DEBUG_MODE: true
};

// 환경별 설정 오버라이드
if (typeof process !== 'undefined' && process.env) {
  // Node.js 환경 (개발 시)
  if (process.env.EXTENSION_BASE_URL) {
    CONFIG.BASE_URL = process.env.EXTENSION_BASE_URL;
  }
} else {
  // 브라우저 환경에서 localStorage 확인
  try {
    const storedConfig = localStorage.getItem('ai_auth_config');
    if (storedConfig) {
      const parsedConfig = JSON.parse(storedConfig);
      Object.assign(CONFIG, parsedConfig);
      console.log('로컬 설정 로드됨:', parsedConfig);
    }
  } catch (error) {
    console.error('설정 로드 오류:', error);
  }
}

// 설정 업데이트 함수
export function updateConfig(newConfig) {
  Object.assign(CONFIG, newConfig);
  
  // localStorage에 저장
  try {
    localStorage.setItem('ai_auth_config', JSON.stringify(CONFIG));
    console.log('설정 업데이트됨:', newConfig);
  } catch (error) {
    console.error('설정 저장 오류:', error);
  }
}

// 설정 초기화 함수
export function resetConfig() {
  const defaultConfig = {
    BASE_URL: "http://192.168.0.10:8000",
    SEND_INTERVAL: 3000,
    ANOMALY_THRESHOLD: 0.8,
    MIN_DATA_POINTS: 5,
    LOGIN_PAGE_THRESHOLD: 0.7,
    MAX_KEYSTROKES: 50,
    MAX_MOUSE_MOVEMENTS: 100,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    DEBUG_MODE: true
  };
  
  Object.assign(CONFIG, defaultConfig);
  
  try {
    localStorage.removeItem('ai_auth_config');
    console.log('설정 초기화됨');
  } catch (error) {
    console.error('설정 초기화 오류:', error);
  }
}

// 설정 검증 함수
export function validateConfig() {
  const errors = [];
  
  if (!CONFIG.BASE_URL || !CONFIG.BASE_URL.startsWith('http')) {
    errors.push('BASE_URL이 올바르지 않습니다.');
  }
  
  if (CONFIG.SEND_INTERVAL < 1000) {
    errors.push('SEND_INTERVAL은 최소 1000ms여야 합니다.');
  }
  
  if (CONFIG.ANOMALY_THRESHOLD < 0 || CONFIG.ANOMALY_THRESHOLD > 1) {
    errors.push('ANOMALY_THRESHOLD는 0과 1 사이여야 합니다.');
  }
  
  if (CONFIG.MIN_DATA_POINTS < 1) {
    errors.push('MIN_DATA_POINTS는 최소 1이어야 합니다.');
  }
  
  if (errors.length > 0) {
    console.error('설정 검증 실패:', errors);
    return false;
  }
  
  console.log('설정 검증 성공');
  return true;
}

// 현재 설정 출력 (디버깅용)
export function printConfig() {
  console.log('현재 AI 인증 설정:');
  console.table(CONFIG);
}

// 설정을 다른 스크립트에서 사용할 수 있도록 전역으로 노출
if (typeof window !== 'undefined') {
  window.AI_AUTH_CONFIG = CONFIG;
  window.AI_AUTH_CONFIG_UTILS = {
    updateConfig,
    resetConfig,
    validateConfig,
    printConfig
  };
}

console.log('AI 인증 설정 준비 완료:', CONFIG.BASE_URL);
