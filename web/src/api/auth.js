// 인증 관련 API 서비스
// 로그인, 예측, 이메일 인증 등의 기능을 제공

console.log('인증 API 서비스 로드됨');

import { apiPost, apiGet } from './apiClient.js';
import { convertTypingPatternToVector } from './user.js';

// 행동 패턴 예측 요청
export async function predictBehavior(payload) {
  console.log('행동 패턴 예측 요청:', payload);
  
  try {
    // 필수 필드 검증
    if (!payload.user_id) {
      throw new Error('사용자 ID가 필요합니다.');
    }
    
    if (!payload.keystroke_vector) {
      throw new Error('키스트로크 벡터 데이터가 필요합니다.');
    }
    
    // 서버에 전송할 데이터 준비
    const predictionData = {
      user_id: payload.user_id,
      keystroke_vector: payload.keystroke_vector
    };
    
    console.log('예측 데이터 준비 완료:', predictionData);
    
    const response = await apiPost('/auth/predict', predictionData);
    
    if (response.success) {
      console.log('행동 패턴 예측 성공:', response.data);
      
      return {
        success: true,
        isAnomalous: response.data.is_anomalous || false,
        data: response.data
      };
    } else {
      throw new Error(response.error || '행동 패턴 예측에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('행동 패턴 예측 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 이메일 인증 요청
export async function verifyEmail(verificationData) {
  console.log('이메일 인증 요청:', verificationData);
  
  try {
    // 필수 필드 검증
    if (!verificationData.user_id || !verificationData.email) {
      throw new Error('사용자 ID와 이메일이 필요합니다.');
    }
    
    const response = await apiPost('/auth/verify', verificationData);
    
    if (response.success) {
      console.log('이메일 인증 성공:', response.data);
      
      return {
        success: true,
        verified: response.data.verified || false,
        message: response.data.message || '이메일 인증이 완료되었습니다.'
      };
    } else {
      throw new Error(response.error || '이메일 인증에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('이메일 인증 오류:', error);
    return {
      success: false,
      error: error.message,
      verified: false
    };
  }
}

// 로그인 시도 (비밀번호 입력 시 행동 패턴 분석)
export async function attemptLogin(loginData) {
  console.log('로그인 시도:', loginData);
  
  try {
    // 필수 필드 검증
    if (!loginData.email || !loginData.password) {
      throw new Error('이메일과 비밀번호가 필요합니다.');
    }
    
    // 패턴 분석을 건너뛰지 않는 경우에만 타이핑 패턴 검사
    if (!loginData.skipPatternAnalysis) {
      if (!loginData.typingPattern || !Array.isArray(loginData.typingPattern)) {
        throw new Error('타이핑 패턴 데이터가 필요합니다.');
      }
      
      // 타이핑 패턴을 벡터로 변환
      const typingVector = convertTypingPatternToVector(loginData.typingPattern);
      
      if (typingVector.length === 0) {
        throw new Error('유효한 타이핑 패턴이 필요합니다.');
      }
    }
    
    // 타이핑 패턴을 벡터로 변환 (패턴 분석 건너뛰기인 경우 빈 배열)
    const typingVector = loginData.skipPatternAnalysis ? [] : convertTypingPatternToVector(loginData.typingPattern);
    
    // 로그인 데이터 준비
    const loginPayload = {
      email: loginData.email,
      password: loginData.password,
      typing_pattern: typingVector,
      timestamp: Date.now(),
      skip_pattern_analysis: loginData.skipPatternAnalysis || false, // 패턴 분석 건너뛰기 플래그
      metadata: {
        user_agent: navigator.userAgent,
        login_source: 'web_app',
        ip_address: 'unknown' // 실제로는 서버에서 추출
      }
    };
    
    console.log('로그인 데이터 준비 완료:', loginPayload);
    
    const response = await apiPost('/auth/login', loginPayload);
    
    if (response.success) {
      console.log('로그인 성공:', response.data);
      
      // 인증 토큰 저장
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_id', response.data.user_id);
        localStorage.setItem('user_email', loginData.email);
      }
      
      return {
        success: true,
        user: response.data.user,
        token: response.data.token,
        anomalyScore: response.data.anomaly_score || 0,
        requiresEmailVerification: response.data.requires_email_verification || false,
        message: '로그인에 성공했습니다.'
      };
    } else {
      throw new Error(response.error || '로그인에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('로그인 오류:', error);
    return {
      success: false,
      error: error.message,
      requiresEmailVerification: false
    };
  }
}

// 인증 상태 확인
export async function checkAuthStatus(userId) {
  console.log('인증 상태 확인:', userId);
  
  try {
    const response = await apiGet(`/auth/status/${userId}`);
    
    if (response.success) {
      console.log('인증 상태 확인 성공:', response.data);
      
      return {
        success: true,
        status: response.data.status,
        lastActivity: response.data.last_activity,
        anomalyScore: response.data.anomaly_score || 0,
        requiresVerification: response.data.requires_verification || false
      };
    } else {
      throw new Error(response.error || '인증 상태 확인에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    return {
      success: false,
      error: error.message,
      status: 'unknown'
    };
  }
}

// 현재 인증 토큰 확인
export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// 인증 토큰 유효성 검사
export function isAuthenticated() {
  const token = getAuthToken();
  const userId = localStorage.getItem('user_id');
  
  return !!(token && userId);
}

// 인증 토큰 제거
export function clearAuthToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_email');
  
  console.log('인증 토큰 제거됨');
}

// 이상 점수에 따른 상태 판단
export function getAnomalyStatus(anomalyScore) {
  if (anomalyScore >= 0.8) {
    return {
      status: 'blocked',
      level: 'high',
      message: '높은 이상 패턴 감지 - 즉시 이메일 인증 필요',
      color: '#f44336'
    };
  } else if (anomalyScore >= 0.5) {
    return {
      status: 'suspicious',
      level: 'medium',
      message: '의심스러운 패턴 감지 - 추가 인증 권장',
      color: '#ff9800'
    };
  } else {
    return {
      status: 'normal',
      level: 'low',
      message: '정상적인 패턴',
      color: '#4caf50'
    };
  }
}

// 행동 패턴 데이터 검증
export function validateBehaviorData(data) {
  const errors = [];
  
  if (!data.user_id) {
    errors.push('사용자 ID가 필요합니다.');
  }
  
  if (!data.keystrokes && !data.mouse_movements) {
    errors.push('키스트로크 또는 마우스 움직임 데이터가 필요합니다.');
  }
  
  if (data.keystrokes && !Array.isArray(data.keystrokes)) {
    errors.push('키스트로크 데이터는 배열이어야 합니다.');
  }
  
  if (data.mouse_movements && !Array.isArray(data.mouse_movements)) {
    errors.push('마우스 움직임 데이터는 배열이어야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// 디버깅을 위한 전역 함수 노출
if (import.meta.env.VITE_DEBUG_MODE === 'true') {
  window.authApiDebug = {
    predictBehavior,
    verifyEmail,
    attemptLogin,
    checkAuthStatus,
    getAuthToken,
    isAuthenticated,
    clearAuthToken,
    getAnomalyStatus,
    validateBehaviorData
  };
}

console.log('인증 API 서비스 준비 완료');
