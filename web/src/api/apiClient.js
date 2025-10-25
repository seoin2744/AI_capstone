// API 클라이언트 - 백엔드와의 통신을 담당하는 기본 클라이언트
// 환경 변수에서 API 기본 URL을 가져와서 모든 API 요청을 처리

console.log('API 클라이언트 로드됨');

// 환경 변수에서 API 기본 URL 가져오기
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.10:8000';

console.log('API 기본 URL:', API_BASE);

// 기본 헤더 설정
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// API 응답 타입 정의
export class ApiResponse {
  constructor(success, data, error, status) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.status = status;
    this.timestamp = new Date().toISOString();
  }
}

// API 오류 클래스
export class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

// 기본 fetch 함수
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  
  console.log('API 요청:', {
    url,
    method: options.method || 'GET',
    body: options.body
  });
  
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      ...options
    });
    
    console.log('API 응답 상태:', response.status);
    
    // 응답이 성공적이지 않은 경우
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 오류 응답:', errorText);
      
      throw new ApiError(
        `API 요청 실패: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }
    
    // JSON 응답 파싱
    const data = await response.json();
    console.log('API 응답 데이터:', data);
    
    return new ApiResponse(true, data, null, response.status);
    
  } catch (error) {
    console.error('API 요청 중 오류:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // 네트워크 오류 등
    throw new ApiError(
      `네트워크 오류: ${error.message}`,
      0,
      error.message
    );
  }
}

// GET 요청 헬퍼
export async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  
  // 쿼리 파라미터 추가
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  return apiFetch(url.pathname + url.search);
}

// POST 요청 헬퍼
export async function apiPost(path, data = {}) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// PUT 요청 헬퍼
export async function apiPut(path, data = {}) {
  return apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// DELETE 요청 헬퍼
export async function apiDelete(path) {
  return apiFetch(path, {
    method: 'DELETE'
  });
}

// 파일 업로드 헬퍼
export async function apiUpload(path, file, additionalData = {}) {
  const formData = new FormData();
  formData.append('file', file);
  
  // 추가 데이터 추가
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });
  
  return apiFetch(path, {
    method: 'POST',
    headers: {
      // Content-Type을 설정하지 않음 (FormData가 자동으로 설정)
    },
    body: formData
  });
}

// API 상태 확인
export async function checkApiHealth() {
  try {
    const response = await apiGet('/health');
    console.log('API 상태 확인 성공:', response.data);
    return response;
  } catch (error) {
    console.error('API 상태 확인 실패:', error);
    throw error;
  }
}

// 재시도 로직이 포함된 API 요청
export async function apiFetchWithRetry(path, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API 요청 시도 ${attempt}/${maxRetries}:`, path);
      return await apiFetch(path, options);
    } catch (error) {
      lastError = error;
      console.warn(`API 요청 실패 (시도 ${attempt}/${maxRetries}):`, error.message);
      
      // 마지막 시도가 아니면 잠시 대기
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 지수 백오프
        console.log(`${delay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('모든 재시도 실패:', lastError);
  throw lastError;
}

// 디버깅을 위한 전역 함수 노출
if (import.meta.env.VITE_DEBUG_MODE === 'true') {
  window.apiDebug = {
    getBaseUrl: () => API_BASE,
    checkHealth: () => checkApiHealth(),
    testRequest: (path, options) => apiFetch(path, options)
  };
}

console.log('API 클라이언트 준비 완료');
