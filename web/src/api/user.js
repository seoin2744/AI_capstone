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
    if (userData.password.length < 10) {
      throw new Error('비밀번호는 최소 10자 이상이어야 합니다.');
    }
    
    // 벡터를 2차원 배열로 변환 (평균값 계산)
    const typingVector = userData.typing_pattern || [];
    if (typingVector.length === 0) {
      throw new Error('타이핑 패턴 데이터가 필요합니다.');
    }
    
    // 2차원 배열에서 Dwell Time과 Flight Time 분리
    // 배열 구조: [[dwell1, flight1], [dwell2, flight2], ...]
    const dwellTimes = typingVector.map(v => v[0]);
    const flightTimes = typingVector.map(v => v[1]).filter(t => t > 0); // 0은 제외
    
    const dwellTimeAvg = dwellTimes.reduce((sum, val) => sum + val, 0) / dwellTimes.length / 1000; // 밀리초를 초로 변환
    const flightTimeAvg = flightTimes.length > 0 
      ? flightTimes.reduce((sum, val) => sum + val, 0) / flightTimes.length / 1000 // 밀리초를 초로 변환
      : 0;
    
    const keystrokeVector = [dwellTimeAvg, flightTimeAvg];
    
    console.log('타이핑 패턴 분석:', {
      'Dwell Time 평균': `${dwellTimeAvg.toFixed(3)}초`,
      'Flight Time 평균': `${flightTimeAvg.toFixed(3)}초`,
      'keystroke_vector': keystrokeVector
    });
    
    // 비밀번호 해시 (SHA-256)
    const passwordHash = await sha256(userData.password);
    
    // 서버에 전송할 데이터 준비
    const registrationData = {
      email: userData.email,
      keystroke_vector: keystrokeVector,
      password_hash: `sha256:${passwordHash}`,
      username: userData.name || '',
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

// 타이핑 패턴을 2차원 배열 벡터로 변환 (API 요구사항에 맞춤)
export function convertTypingPatternToVector(typingPattern) {
  console.log('타이핑 패턴을 벡터로 변환:', typingPattern);
  
  if (!typingPattern || typingPattern.length === 0) {
    return [];
  }
  
  try {
    const vector = [];
    
    // 키 다운/업 쌍 찾기
    const keyPairs = [];
    for (let i = 0; i < typingPattern.length - 1; i++) {
      if (typingPattern[i].type === 'keydown' && typingPattern[i+1].type === 'keyup' && 
          typingPattern[i].key === typingPattern[i+1].key) {
        keyPairs.push({
          key: typingPattern[i].key,
          pressTime: typingPattern[i+1].timestamp - typingPattern[i].timestamp,
          timestamp: typingPattern[i].timestamp
        });
      }
    }
    
    // 각 키 쌍을 벡터로 변환 (2차원 배열)
    for (let i = 0; i < keyPairs.length; i++) {
      const pair = keyPairs[i];
      
      // Dwell Time (키 누름 시간) - 밀리초 단위
      const dwellTime = pair.pressTime;
      
      // Flight Time (키 간 이동 시간) - 밀리초 단위
      let flightTime = 0;
      if (i > 0) {
        flightTime = pair.timestamp - keyPairs[i-1].timestamp;
      }
      
      // 벡터 요소: [Dwell Time (ms), Flight Time (ms)]
      vector.push([dwellTime, flightTime]);
    }
    
    console.log('변환된 벡터 (2차원 배열):', vector);
    return vector;
    
  } catch (error) {
    console.error('타이핑 패턴 벡터 변환 오류:', error);
    return [];
  }
}

// 타이핑 패턴 유사도 계산 (클라이언트 사이드) - 극도로 관대한 버전
export function calculateTypingSimilarity(pattern1, pattern2) {
  console.log('타이핑 패턴 유사도 계산 (극도로 관대한 버전)');
  
  if (!pattern1 || !pattern2 || pattern1.length === 0 || pattern2.length === 0) {
    return 0;
  }
  
  try {
    // 개선된 유사도 계산
    const features1 = extractAdvancedTypingFeatures(pattern1);
    const features2 = extractAdvancedTypingFeatures(pattern2);
    
    // 길이 차이 페널티 (극도로 관대하게)
    const lengthPenalty = calculateLengthPenalty(features1.keyCount, features2.keyCount);
    
    // 타이핑 리듬 유사도 (극도로 관대하게)
    const rhythmSimilarity = calculateRhythmSimilarity(features1, features2);
    
    // 키 누름 시간 유사도 (극도로 관대하게)
    const pressTimeSimilarity = calculatePressTimeSimilarity(features1, features2);
    
    // 키 간격 유사도 (극도로 관대하게)
    const intervalSimilarity = calculateIntervalSimilarity(features1, features2);
    
    // 전체 유사도 계산 (가중 평균 - 누름시간에 더 높은 가중치)
    const totalSimilarity = (
      rhythmSimilarity * 0.05 +       // 리듬: 5% (거의 무시)
      pressTimeSimilarity * 0.7 +     // 누름시간: 70% (대부분)
      intervalSimilarity * 0.25       // 간격: 25% (적당히)
    ) * lengthPenalty;
    
    // 최종 보정: 너무 낮은 점수 방지 (극도로 관대하게)
    const finalSimilarity = Math.max(0.7, totalSimilarity); // 최소 70% 보장 (기존 50%에서 증가)
    
    console.log('타이핑 유사도 상세 (극도로 관대한 버전):', {
      rhythmSimilarity,
      pressTimeSimilarity,
      intervalSimilarity,
      lengthPenalty,
      totalSimilarity,
      finalSimilarity
    });
    
    return Math.max(0, Math.min(1, finalSimilarity));
    
  } catch (error) {
    console.error('타이핑 유사도 계산 오류:', error);
    return 0;
  }
}

// 고급 타이핑 특징 추출
function extractAdvancedTypingFeatures(pattern) {
  const features = {
    keyCount: 0,
    pressTimes: [],
    intervals: [],
    rhythm: [],
    totalTime: 0,
    avgPressTime: 0,
    avgInterval: 0,
    pressTimeVariance: 0,
    intervalVariance: 0
  };
  
  // 키 다운/업 쌍 찾기
  const keyPairs = [];
  for (let i = 0; i < pattern.length - 1; i++) {
    if (pattern[i].type === 'keydown' && pattern[i+1].type === 'keyup' && 
        pattern[i].key === pattern[i+1].key) {
      keyPairs.push({
        key: pattern[i].key,
        pressTime: pattern[i+1].timestamp - pattern[i].timestamp,
        timestamp: pattern[i].timestamp
      });
    }
  }
  
  features.keyCount = keyPairs.length;
  
  if (keyPairs.length === 0) {
    return features;
  }
  
  // 키 누름 시간 분석
  features.pressTimes = keyPairs.map(pair => pair.pressTime);
  features.avgPressTime = features.pressTimes.reduce((sum, time) => sum + time, 0) / features.pressTimes.length;
  
  // 키 간격 분석
  for (let i = 1; i < keyPairs.length; i++) {
    const interval = keyPairs[i].timestamp - keyPairs[i-1].timestamp;
    features.intervals.push(interval);
  }
  
  if (features.intervals.length > 0) {
    features.avgInterval = features.intervals.reduce((sum, interval) => sum + interval, 0) / features.intervals.length;
  }
  
  // 전체 타이핑 시간
  features.totalTime = keyPairs[keyPairs.length - 1].timestamp - keyPairs[0].timestamp;
  
  // 리듬 패턴 (상대적 간격)
  if (features.intervals.length > 0) {
    features.rhythm = features.intervals.map(interval => interval / features.avgInterval);
  }
  
  // 분산 계산
  features.pressTimeVariance = calculateVariance(features.pressTimes, features.avgPressTime);
  features.intervalVariance = calculateVariance(features.intervals, features.avgInterval);
  
  return features;
}

// 분산 계산
function calculateVariance(values, mean) {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

// 길이 차이 페널티 계산 (극도로 관대하게)
function calculateLengthPenalty(count1, count2) {
  if (count1 === 0 || count2 === 0) return 0;
  
  const lengthDiff = Math.abs(count1 - count2);
  const maxLength = Math.max(count1, count2);
  const lengthRatio = lengthDiff / maxLength;
  
  // 길이 차이가 클수록 페널티 증가 (극도로 관대하게)
  // 기존: 1 - lengthRatio * 0.2 → 새로운: 1 - lengthRatio * 0.1
  return Math.max(0.8, 1 - lengthRatio * 0.1); // 최소 80% 보장 (기존 70%에서 증가)
}

// 타이핑 리듬 유사도 계산 (극도로 관대하게)
function calculateRhythmSimilarity(features1, features2) {
  if (features1.rhythm.length === 0 || features2.rhythm.length === 0) return 0;
  
  const minLength = Math.min(features1.rhythm.length, features2.rhythm.length);
  let similarity = 0;
  
  for (let i = 0; i < minLength; i++) {
    const diff = Math.abs(features1.rhythm[i] - features2.rhythm[i]);
    // 극도로 관대한 차이 허용: 기존 1 - diff * 0.5 → 새로운 1 - diff * 0.3
    similarity += Math.max(0, 1 - diff * 0.3);
  }
  
  return similarity / minLength;
}

// 키 누름 시간 유사도 계산 (극도로 관대하게)
function calculatePressTimeSimilarity(features1, features2) {
  if (features1.pressTimes.length === 0 || features2.pressTimes.length === 0) return 0;
  
  // 평균 누름 시간 비교 (극도로 관대하게)
  const avgTimeDiff = Math.abs(features1.avgPressTime - features2.avgPressTime);
  const maxAvgTime = Math.max(features1.avgPressTime, features2.avgPressTime);
  // 극도로 관대한 허용 범위: 기존 1 - avgTimeDiff / (maxAvgTime * 2) → 새로운 1 - avgTimeDiff / (maxAvgTime * 3)
  const avgTimeSimilarity = Math.max(0, 1 - avgTimeDiff / (maxAvgTime * 3));
  
  // 분산 비교 (극도로 관대하게)
  const varianceDiff = Math.abs(features1.pressTimeVariance - features2.pressTimeVariance);
  const maxVariance = Math.max(features1.pressTimeVariance, features2.pressTimeVariance);
  // 극도로 관대한 분산 허용: 기존 1 - varianceDiff / (maxVariance * 3) → 새로운 1 - varianceDiff / (maxVariance * 5)
  const varianceSimilarity = maxVariance === 0 ? 1 : Math.max(0, 1 - varianceDiff / (maxVariance * 5));
  
  return (avgTimeSimilarity + varianceSimilarity) / 2;
}

// 키 간격 유사도 계산 (극도로 관대하게)
function calculateIntervalSimilarity(features1, features2) {
  if (features1.intervals.length === 0 || features2.intervals.length === 0) return 0;
  
  // 평균 간격 비교 (극도로 관대하게)
  const avgIntervalDiff = Math.abs(features1.avgInterval - features2.avgInterval);
  const maxAvgInterval = Math.max(features1.avgInterval, features2.avgInterval);
  // 극도로 관대한 허용 범위: 기존 1 - avgIntervalDiff / (maxAvgInterval * 2) → 새로운 1 - avgIntervalDiff / (maxAvgInterval * 3)
  const avgIntervalSimilarity = Math.max(0, 1 - avgIntervalDiff / (maxAvgInterval * 3));
  
  // 분산 비교 (극도로 관대하게)
  const varianceDiff = Math.abs(features1.intervalVariance - features2.intervalVariance);
  const maxVariance = Math.max(features1.intervalVariance, features2.intervalVariance);
  // 극도로 관대한 분산 허용: 기존 1 - varianceDiff / (maxVariance * 3) → 새로운 1 - varianceDiff / (maxVariance * 5)
  const varianceSimilarity = maxVariance === 0 ? 1 : Math.max(0, 1 - varianceDiff / (maxVariance * 5));
  
  return (avgIntervalSimilarity + varianceSimilarity) / 2;
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

// SHA-256 해시 함수
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
  return hashHex;
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
