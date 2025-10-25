// 사용자 관련 API 서비스
// 회원가입, 사용자 정보 조회 등의 기능을 제공

console.log('사용자 API 서비스 로드됨');

import { apiPost, apiGet, apiPut, apiDelete } from './apiClient.js';

// 사용자 등록 (회원가입)
export async function registerUser(userData) {
  console.log('사용자 등록 요청:', userData);
  
  try {
    // 필수 필드 검증
    if (!userData.email || !userData.password) {
      throw new Error('이메일과 비밀번호는 필수입니다.');
    }
    
    // 비밀번호 재입력 검증
    if (userData.password !== userData.passwordConfirm) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }
    
    // 비밀번호 강도 검증
    if (userData.password.length < 8) {
      throw new Error('비밀번호는 최소 8자 이상이어야 합니다.');
    }
    
    // 타이핑 패턴 데이터 검증
    if (!userData.typingPattern || !Array.isArray(userData.typingPattern)) {
      throw new Error('타이핑 패턴 데이터가 필요합니다.');
    }
    
    // 서버에 전송할 데이터 준비
    const registrationData = {
      email: userData.email,
      password: userData.password,
      name: userData.name || '',
      typing_pattern: userData.typingPattern,
      metadata: {
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        registration_source: 'web_app'
      }
    };
    
    console.log('등록 데이터 준비 완료:', registrationData);
    
    const response = await apiPost('/users/register', registrationData);
    
    if (response.success) {
      console.log('사용자 등록 성공:', response.data);
      
      // 로컬 스토리지에 사용자 정보 저장
      localStorage.setItem('user_id', response.data.user_id);
      localStorage.setItem('user_email', userData.email);
      
      return {
        success: true,
        user: response.data,
        message: '회원가입이 완료되었습니다.'
      };
    } else {
      throw new Error(response.error || '회원가입에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('사용자 등록 오류:', error);
    return {
      success: false,
      error: error.message,
      message: '회원가입 중 오류가 발생했습니다.'
    };
  }
}

// 사용자 정보 조회
export async function getUserInfo(userId) {
  console.log('사용자 정보 조회:', userId);
  
  try {
    const response = await apiGet(`/users/${userId}`);
    
    if (response.success) {
      console.log('사용자 정보 조회 성공:', response.data);
      return {
        success: true,
        user: response.data
      };
    } else {
      throw new Error(response.error || '사용자 정보 조회에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 사용자 정보 업데이트
export async function updateUserInfo(userId, updateData) {
  console.log('사용자 정보 업데이트:', userId, updateData);
  
  try {
    const response = await apiPut(`/users/${userId}`, updateData);
    
    if (response.success) {
      console.log('사용자 정보 업데이트 성공:', response.data);
      return {
        success: true,
        user: response.data,
        message: '사용자 정보가 업데이트되었습니다.'
      };
    } else {
      throw new Error(response.error || '사용자 정보 업데이트에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('사용자 정보 업데이트 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 사용자 타이핑 패턴 업데이트
export async function updateTypingPattern(userId, typingPattern) {
  console.log('타이핑 패턴 업데이트:', userId);
  
  try {
    if (!typingPattern || !Array.isArray(typingPattern)) {
      throw new Error('유효한 타이핑 패턴 데이터가 필요합니다.');
    }
    
    const response = await apiPost(`/users/${userId}/typing-pattern`, {
      typing_pattern: typingPattern,
      timestamp: new Date().toISOString()
    });
    
    if (response.success) {
      console.log('타이핑 패턴 업데이트 성공:', response.data);
      return {
        success: true,
        message: '타이핑 패턴이 업데이트되었습니다.'
      };
    } else {
      throw new Error(response.error || '타이핑 패턴 업데이트에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('타이핑 패턴 업데이트 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 사용자 계정 삭제
export async function deleteUser(userId) {
  console.log('사용자 계정 삭제:', userId);
  
  try {
    const response = await apiDelete(`/users/${userId}`);
    
    if (response.success) {
      console.log('사용자 계정 삭제 성공');
      
      // 로컬 스토리지 정리
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      
      return {
        success: true,
        message: '계정이 삭제되었습니다.'
      };
    } else {
      throw new Error(response.error || '계정 삭제에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('사용자 계정 삭제 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 현재 로그인된 사용자 정보 가져오기
export function getCurrentUser() {
  const userId = localStorage.getItem('user_id');
  const userEmail = localStorage.getItem('user_email');
  
  if (userId && userEmail) {
    return {
      id: userId,
      email: userEmail
    };
  }
  
  return null;
}

// 로그아웃 처리
export function logout() {
  console.log('사용자 로그아웃');
  
  // 로컬 스토리지 정리
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_email');
  localStorage.removeItem('auth_token');
  
  // 세션 스토리지 정리
  sessionStorage.clear();
  
  console.log('로그아웃 완료');
}

// 사용자 인증 상태 확인
export function isAuthenticated() {
  const userId = localStorage.getItem('user_id');
  const authToken = localStorage.getItem('auth_token');
  
  return !!(userId && authToken);
}

// 타이핑 패턴 유사도 계산 (클라이언트 사이드)
export function calculateTypingSimilarity(pattern1, pattern2) {
  console.log('타이핑 패턴 유사도 계산');
  
  if (!pattern1 || !pattern2 || pattern1.length === 0 || pattern2.length === 0) {
    return 0;
  }
  
  try {
    // 간단한 코사인 유사도 계산
    const vector1 = extractTypingVector(pattern1);
    const vector2 = extractTypingVector(pattern2);
    
    const similarity = cosineSimilarity(vector1, vector2);
    console.log('타이핑 유사도:', similarity);
    
    return similarity;
    
  } catch (error) {
    console.error('타이핑 유사도 계산 오류:', error);
    return 0;
  }
}

// 타이핑 패턴에서 벡터 추출
function extractTypingVector(pattern) {
  const vector = [];
  
  // 키 다운/업 시간 간격 분석
  const intervals = [];
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i].type === 'keydown' && pattern[i-1].type === 'keyup') {
      intervals.push(pattern[i].timestamp - pattern[i-1].timestamp);
    }
  }
  
  // 평균 간격
  const avgInterval = intervals.length > 0 
    ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length 
    : 0;
  
  vector.push(avgInterval);
  
  // 키 누름 시간 분석
  const pressTimes = [];
  for (let i = 0; i < pattern.length - 1; i++) {
    if (pattern[i].type === 'keydown' && pattern[i+1].type === 'keyup' && 
        pattern[i].key === pattern[i+1].key) {
      pressTimes.push(pattern[i+1].timestamp - pattern[i].timestamp);
    }
  }
  
  const avgPressTime = pressTimes.length > 0 
    ? pressTimes.reduce((sum, time) => sum + time, 0) / pressTimes.length 
    : 0;
  
  vector.push(avgPressTime);
  
  return vector;
}

// 코사인 유사도 계산
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// 디버깅을 위한 전역 함수 노출
if (import.meta.env.VITE_DEBUG_MODE === 'true') {
  window.userApiDebug = {
    registerUser,
    getUserInfo,
    updateUserInfo,
    updateTypingPattern,
    deleteUser,
    getCurrentUser,
    logout,
    isAuthenticated,
    calculateTypingSimilarity
  };
}

console.log('사용자 API 서비스 준비 완료');
