// 로그 관련 API 서비스
// 사용자 활동 로그 조회, 분석 결과 확인 등의 기능을 제공

console.log('로그 API 서비스 로드됨');

import { apiGet, apiPost } from './apiClient.js';

// 사용자 로그 조회
export async function getLogs(userId, options = {}) {
  console.log('사용자 로그 조회:', userId, options);
  
  try {
    // 쿼리 파라미터 준비
    const params = {
      limit: options.limit || 50,
      offset: options.offset || 0,
      start_date: options.startDate,
      end_date: options.endDate,
      log_type: options.logType,
      anomaly_threshold: options.anomalyThreshold
    };
    
    // undefined 값 제거
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await apiGet(`/logs/${userId}`, params);
    
    if (response.success) {
      console.log('로그 조회 성공:', response.data);
      
      return {
        success: true,
        logs: response.data.logs || [],
        total: response.data.total || 0,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          hasMore: (params.offset + params.limit) < (response.data.total || 0)
        }
      };
    } else {
      throw new Error(response.error || '로그 조회에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('로그 조회 오류:', error);
    return {
      success: false,
      error: error.message,
      logs: [],
      total: 0
    };
  }
}

// 최근 로그 조회 (간단한 버전)
export async function getRecentLogs(userId, limit = 10) {
  console.log('최근 로그 조회:', userId, limit);
  
  try {
    const response = await getLogs(userId, { limit });
    
    if (response.success) {
      console.log('최근 로그 조회 성공:', response.logs.length, '개');
      
      return {
        success: true,
        logs: response.logs,
        count: response.logs.length
      };
    } else {
      throw new Error(response.error);
    }
    
  } catch (error) {
    console.error('최근 로그 조회 오류:', error);
    return {
      success: false,
      error: error.message,
      logs: [],
      count: 0
    };
  }
}

// 이상 패턴 로그만 조회
export async function getAnomalyLogs(userId, threshold = 0.5) {
  console.log('이상 패턴 로그 조회:', userId, threshold);
  
  try {
    const response = await getLogs(userId, {
      anomalyThreshold: threshold,
      logType: 'anomaly'
    });
    
    if (response.success) {
      console.log('이상 패턴 로그 조회 성공:', response.logs.length, '개');
      
      return {
        success: true,
        logs: response.logs,
        count: response.logs.length,
        threshold: threshold
      };
    } else {
      throw new Error(response.error);
    }
    
  } catch (error) {
    console.error('이상 패턴 로그 조회 오류:', error);
    return {
      success: false,
      error: error.message,
      logs: [],
      count: 0
    };
  }
}

// 로그 통계 조회
export async function getLogStatistics(userId, period = '7d') {
  console.log('로그 통계 조회:', userId, period);
  
  try {
    const response = await apiGet(`/logs/${userId}/statistics`, {
      period: period
    });
    
    if (response.success) {
      console.log('로그 통계 조회 성공:', response.data);
      
      return {
        success: true,
        statistics: response.data,
        period: period
      };
    } else {
      throw new Error(response.error || '로그 통계 조회에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('로그 통계 조회 오류:', error);
    return {
      success: false,
      error: error.message,
      statistics: null
    };
  }
}

// 로그 내보내기
export async function exportLogs(userId, format = 'json', options = {}) {
  console.log('로그 내보내기:', userId, format);
  
  try {
    const exportData = {
      user_id: userId,
      format: format,
      start_date: options.startDate,
      end_date: options.endDate,
      log_type: options.logType,
      include_metadata: options.includeMetadata || false
    };
    
    const response = await apiPost(`/logs/${userId}/export`, exportData);
    
    if (response.success) {
      console.log('로그 내보내기 성공:', response.data);
      
      return {
        success: true,
        downloadUrl: response.data.download_url,
        filename: response.data.filename,
        expiresAt: response.data.expires_at
      };
    } else {
      throw new Error(response.error || '로그 내보내기에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('로그 내보내기 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 로그 데이터 포맷팅
export function formatLogData(log) {
  if (!log) return null;
  
  return {
    id: log.id,
    timestamp: new Date(log.timestamp).toLocaleString('ko-KR'),
    type: log.type || 'unknown',
    anomalyScore: log.anomaly_score || 0,
    confidence: log.confidence || 0,
    status: getLogStatus(log.anomaly_score),
    details: log.details || {},
    metadata: log.metadata || {}
  };
}

// 로그 상태 판단
export function getLogStatus(anomalyScore) {
  if (anomalyScore >= 0.8) {
    return {
      text: '차단됨',
      color: '#f44336',
      level: 'high'
    };
  } else if (anomalyScore >= 0.5) {
    return {
      text: '의심됨',
      color: '#ff9800',
      level: 'medium'
    };
  } else {
    return {
      text: '정상',
      color: '#4caf50',
      level: 'low'
    };
  }
}

// 로그 필터링
export function filterLogs(logs, filters = {}) {
  if (!Array.isArray(logs)) return [];
  
  return logs.filter(log => {
    // 날짜 필터
    if (filters.startDate) {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(filters.startDate);
      if (logDate < startDate) return false;
    }
    
    if (filters.endDate) {
      const logDate = new Date(log.timestamp);
      const endDate = new Date(filters.endDate);
      if (logDate > endDate) return false;
    }
    
    // 이상 점수 필터
    if (filters.minAnomalyScore !== undefined) {
      if ((log.anomaly_score || 0) < filters.minAnomalyScore) return false;
    }
    
    if (filters.maxAnomalyScore !== undefined) {
      if ((log.anomaly_score || 0) > filters.maxAnomalyScore) return false;
    }
    
    // 로그 타입 필터
    if (filters.logType && log.type !== filters.logType) {
      return false;
    }
    
    // 상태 필터
    if (filters.status) {
      const logStatus = getLogStatus(log.anomaly_score);
      if (logStatus.level !== filters.status) return false;
    }
    
    return true;
  });
}

// 로그 검색
export function searchLogs(logs, searchTerm) {
  if (!Array.isArray(logs) || !searchTerm) return logs;
  
  const term = searchTerm.toLowerCase();
  
  return logs.filter(log => {
    // 타임스탬프 검색
    if (log.timestamp && log.timestamp.toLowerCase().includes(term)) {
      return true;
    }
    
    // 로그 타입 검색
    if (log.type && log.type.toLowerCase().includes(term)) {
      return true;
    }
    
    // 메타데이터 검색
    if (log.metadata) {
      const metadataStr = JSON.stringify(log.metadata).toLowerCase();
      if (metadataStr.includes(term)) {
        return true;
      }
    }
    
    // 세부사항 검색
    if (log.details) {
      const detailsStr = JSON.stringify(log.details).toLowerCase();
      if (detailsStr.includes(term)) {
        return true;
      }
    }
    
    return false;
  });
}

// 로그 정렬
export function sortLogs(logs, sortBy = 'timestamp', sortOrder = 'desc') {
  if (!Array.isArray(logs)) return [];
  
  return [...logs].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'timestamp':
        aValue = new Date(a.timestamp);
        bValue = new Date(b.timestamp);
        break;
      case 'anomaly_score':
        aValue = a.anomaly_score || 0;
        bValue = b.anomaly_score || 0;
        break;
      case 'confidence':
        aValue = a.confidence || 0;
        bValue = b.confidence || 0;
        break;
      default:
        aValue = a[sortBy];
        bValue = b[sortBy];
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
}

// 디버깅을 위한 전역 함수 노출
if (import.meta.env.VITE_DEBUG_MODE === 'true') {
  window.logsApiDebug = {
    getLogs,
    getRecentLogs,
    getAnomalyLogs,
    getLogStatistics,
    exportLogs,
    formatLogData,
    getLogStatus,
    filterLogs,
    searchLogs,
    sortLogs
  };
}

console.log('로그 API 서비스 준비 완료');
