// 로그 뷰 컴포넌트
// 사용자 활동 로그 조회 및 이상 패턴 시각화

import React, { useState, useEffect, useRef } from 'react';
import { getLogs, getRecentLogs, getAnomalyLogs, formatLogData, filterLogs, searchLogs, sortLogs } from '../api/logs.js';

console.log('로그 뷰 컴포넌트 로드됨');

const LogsView = ({ userId }) => {
  // 상태 관리
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 필터 및 검색 상태
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minAnomalyScore: '',
    maxAnomalyScore: '',
    logType: '',
    status: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // 페이지네이션
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    hasMore: false
  });
  
  // 자동 새로고침
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef(null);
  
  // 로그 로드
  const loadLogs = async (reset = false) => {
    if (!userId) {
      console.warn('사용자 ID가 없습니다.');
      return;
    }
    
    console.log('로그 로드 시작:', userId);
    setIsLoading(true);
    setError(null);
    
    try {
      const options = {
        limit: pagination.limit,
        offset: reset ? 0 : pagination.offset,
        ...filters
      };
      
      const result = await getLogs(userId, options);
      
      if (result.success) {
        console.log('로그 로드 성공:', result.logs.length, '개');
        
        const formattedLogs = result.logs.map(formatLogData);
        
        if (reset) {
          setLogs(formattedLogs);
        } else {
          setLogs(prev => [...prev, ...formattedLogs]);
        }
        
        setPagination(prev => ({
          ...prev,
          offset: reset ? formattedLogs.length : prev.offset + formattedLogs.length,
          hasMore: result.pagination.hasMore
        }));
        
      } else {
        throw new Error(result.error);
      }
      
    } catch (err) {
      console.error('로그 로드 오류:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 최근 로그만 로드
  const loadRecentLogs = async () => {
    if (!userId) return;
    
    console.log('최근 로그 로드:', userId);
    
    try {
      const result = await getRecentLogs(userId, 10);
      
      if (result.success) {
        console.log('최근 로그 로드 성공:', result.logs.length, '개');
        const formattedLogs = result.logs.map(formatLogData);
        setLogs(formattedLogs);
      }
      
    } catch (err) {
      console.error('최근 로그 로드 오류:', err);
    }
  };
  
  // 이상 패턴 로그만 로드
  const loadAnomalyLogs = async () => {
    if (!userId) return;
    
    console.log('이상 패턴 로그 로드:', userId);
    
    try {
      const result = await getAnomalyLogs(userId, 0.5);
      
      if (result.success) {
        console.log('이상 패턴 로그 로드 성공:', result.logs.length, '개');
        const formattedLogs = result.logs.map(formatLogData);
        setLogs(formattedLogs);
      }
      
    } catch (err) {
      console.error('이상 패턴 로그 로드 오류:', err);
    }
  };
  
  // 필터 적용
  const applyFilters = () => {
    console.log('필터 적용:', filters);
    
    let filtered = [...logs];
    
    // 검색어 필터
    if (searchTerm) {
      filtered = searchLogs(filtered, searchTerm);
    }
    
    // 기타 필터
    filtered = filterLogs(filtered, filters);
    
    // 정렬
    filtered = sortLogs(filtered, sortBy, sortOrder);
    
    setFilteredLogs(filtered);
    console.log('필터링된 로그:', filtered.length, '개');
  };
  
  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      minAnomalyScore: '',
      maxAnomalyScore: '',
      logType: '',
      status: ''
    });
    setSearchTerm('');
    setSortBy('timestamp');
    setSortOrder('desc');
  };
  
  // 자동 새로고침 설정
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('자동 새로고침 실행');
        loadRecentLogs();
      }, 10000); // 10초마다
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, userId]);
  
  // 초기 로드
  useEffect(() => {
    if (userId) {
      loadLogs(true);
    }
  }, [userId]);
  
  // 필터 변경 시 적용
  useEffect(() => {
    applyFilters();
  }, [logs, filters, searchTerm, sortBy, sortOrder]);
  
  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  
  // 로그 상태별 색상
  const getStatusColor = (anomalyScore) => {
    if (anomalyScore >= 0.8) return '#f44336';
    if (anomalyScore >= 0.5) return '#ff9800';
    return '#4caf50';
  };
  
  // 로그 상태별 아이콘
  const getStatusIcon = (anomalyScore) => {
    if (anomalyScore >= 0.8) return '🚨';
    if (anomalyScore >= 0.5) return '⚠️';
    return '✅';
  };
  
  return (
    <div className="logs-view">
      <div className="logs-header">
        <h2>활동 로그</h2>
        
        <div className="logs-controls">
          <div className="refresh-controls">
            <button
              onClick={() => loadLogs(true)}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              {isLoading ? '로딩 중...' : '새로고침'}
            </button>
            
            <button
              onClick={() => loadRecentLogs()}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              최근 로그
            </button>
            
            <button
              onClick={() => loadAnomalyLogs()}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              이상 패턴만
            </button>
          </div>
          
          <div className="auto-refresh-control">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              자동 새로고침 (10초)
            </label>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="error-banner error">
          {error}
        </div>
      )}
      
      <div className="logs-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>검색</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="로그 검색..."
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <label>시작 날짜</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          
          <div className="filter-group">
            <label>종료 날짜</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="filter-row">
          <div className="filter-group">
            <label>최소 이상 점수</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={filters.minAnomalyScore}
              onChange={(e) => setFilters(prev => ({ ...prev, minAnomalyScore: e.target.value }))}
              placeholder="0.0"
            />
          </div>
          
          <div className="filter-group">
            <label>최대 이상 점수</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={filters.maxAnomalyScore}
              onChange={(e) => setFilters(prev => ({ ...prev, maxAnomalyScore: e.target.value }))}
              placeholder="1.0"
            />
          </div>
          
          <div className="filter-group">
            <label>로그 타입</label>
            <select
              value={filters.logType}
              onChange={(e) => setFilters(prev => ({ ...prev, logType: e.target.value }))}
            >
              <option value="">전체</option>
              <option value="login">로그인</option>
              <option value="anomaly">이상 패턴</option>
              <option value="verification">인증</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>정렬</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <option value="timestamp-desc">시간 (최신순)</option>
              <option value="timestamp-asc">시간 (오래된순)</option>
              <option value="anomaly_score-desc">이상 점수 (높은순)</option>
              <option value="anomaly_score-asc">이상 점수 (낮은순)</option>
            </select>
          </div>
        </div>
        
        <div className="filter-actions">
          <button
            onClick={resetFilters}
            className="btn btn-secondary"
          >
            필터 초기화
          </button>
        </div>
      </div>
      
      <div className="logs-content">
        <div className="logs-summary">
          <div className="summary-item">
            <span className="summary-label">전체 로그</span>
            <span className="summary-value">{logs.length}개</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">필터링된 로그</span>
            <span className="summary-value">{filteredLogs.length}개</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">이상 패턴</span>
            <span className="summary-value">
              {logs.filter(log => log.anomalyScore >= 0.5).length}개
            </span>
          </div>
        </div>
        
        <div className="logs-table">
          <table>
            <thead>
              <tr>
                <th>시간</th>
                <th>타입</th>
                <th>상태</th>
                <th>이상 점수</th>
                <th>신뢰도</th>
                <th>세부사항</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={log.id || index} className="log-row">
                  <td className="log-timestamp">{log.timestamp}</td>
                  <td className="log-type">{log.type}</td>
                  <td className="log-status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(log.anomalyScore) }}
                    >
                      {getStatusIcon(log.anomalyScore)} {log.status.text}
                    </span>
                  </td>
                  <td className="log-anomaly-score">
                    {(log.anomalyScore * 100).toFixed(1)}%
                  </td>
                  <td className="log-confidence">
                    {(log.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="log-details">
                    <button
                      className="btn btn-small"
                      onClick={() => console.log('로그 세부사항:', log)}
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredLogs.length === 0 && !isLoading && (
            <div className="no-logs">
              <p>표시할 로그가 없습니다.</p>
            </div>
          )}
          
          {isLoading && (
            <div className="loading-indicator">
              <p>로그를 불러오는 중...</p>
            </div>
          )}
        </div>
        
        {pagination.hasMore && (
          <div className="load-more">
            <button
              onClick={() => loadLogs(false)}
              className="btn btn-primary"
              disabled={isLoading}
            >
              더 보기
            </button>
          </div>
        )}
      </div>
      
      <div className="debug-info">
        <h4>디버그 정보</h4>
        <p>사용자 ID: {userId}</p>
        <p>전체 로그: {logs.length}개</p>
        <p>필터링된 로그: {filteredLogs.length}개</p>
        <p>자동 새로고침: {autoRefresh ? '활성' : '비활성'}</p>
        <p>정렬: {sortBy} ({sortOrder})</p>
      </div>
    </div>
  );
};

export default LogsView;
