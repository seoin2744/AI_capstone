// React 애플리케이션 진입점
// React DOM 렌더링 및 기본 설정

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

console.log('React 애플리케이션 시작');

// 환경 변수 확인
console.log('환경 설정:');
console.log('- API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('- Debug Mode:', import.meta.env.VITE_DEBUG_MODE);
console.log('- App Name:', import.meta.env.VITE_APP_NAME);

// React 18의 새로운 createRoot API 사용
const root = ReactDOM.createRoot(document.getElementById('root'));

// 애플리케이션 렌더링
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 개발 모드에서 추가 디버깅 정보
if (import.meta.env.VITE_DEBUG_MODE === 'true') {
  console.log('디버그 모드 활성화');
  
  // 전역 디버깅 함수 노출
  window.appDebug = {
    getEnv: () => ({
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE,
      APP_NAME: import.meta.env.VITE_APP_NAME
    }),
    getRootElement: () => document.getElementById('root'),
    getReactRoot: () => root
  };
  
  // 성능 모니터링
  if (import.meta.env.DEV) {
    console.log('개발 모드에서 성능 모니터링 활성화');
    
    // 페이지 로드 시간 측정
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      console.log(`페이지 로드 시간: ${loadTime.toFixed(2)}ms`);
    });
  }
}

console.log('React 애플리케이션 초기화 완료');
