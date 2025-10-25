// 로그인 폼 컴포넌트
// 타이핑 패턴 분석을 통한 로그인 처리

import React, { useState, useRef, useEffect } from 'react';
import { attemptLogin, getAnomalyStatus } from '../api/auth.js';

console.log('로그인 폼 컴포넌트 로드됨');

const LoginForm = ({ onSuccess, onError }) => {
  // 상태 관리
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [typingPattern, setTypingPattern] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [anomalyScore, setAnomalyScore] = useState(0);
  const [anomalyStatus, setAnomalyStatus] = useState(null);
  
  // 타이핑 패턴 수집 상태
  const [isCollectingPattern, setIsCollectingPattern] = useState(false);
  
  // refs
  const passwordRef = useRef(null);
  const emailRef = useRef(null);
  
  // 타이핑 패턴 수집 시작
  const startPatternCollection = () => {
    console.log('로그인 타이핑 패턴 수집 시작');
    setIsCollectingPattern(true);
    setTypingPattern([]);
    setAnomalyScore(0);
    setAnomalyStatus(null);
  };
  
  // 타이핑 패턴 수집 중단
  const stopPatternCollection = () => {
    console.log('로그인 타이핑 패턴 수집 중단');
    setIsCollectingPattern(false);
  };
  
  // 키보드 이벤트 처리
  const handleKeyEvent = (event) => {
    if (!isCollectingPattern) return;
    
    const timestamp = Date.now();
    const keyData = {
      type: event.type,
      key: event.key,
      code: event.code,
      timestamp: timestamp,
      target: event.target.name
    };
    
    setTypingPattern(prev => [...prev, keyData]);
    console.log('로그인 타이핑 패턴 수집:', keyData);
  };
  
  // 입력 필드 변경 처리
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 오류 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('로그인 폼 제출:', formData);
    
    // 기본 유효성 검사
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }
    
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }
    
    if (!isCollectingPattern || typingPattern.length === 0) {
      newErrors.password = '타이핑 패턴을 수집해주세요.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const loginData = {
        ...formData,
        typingPattern: typingPattern
      };
      
      console.log('로그인 데이터 전송:', loginData);
      
      const result = await attemptLogin(loginData);
      
      if (result.success) {
        console.log('로그인 성공:', result);
        
        // 이상 점수 업데이트
        setAnomalyScore(result.anomalyScore || 0);
        setAnomalyStatus(getAnomalyStatus(result.anomalyScore || 0));
        
        onSuccess && onSuccess(result);
        
        // 폼 초기화
        setFormData({ email: '', password: '' });
        setTypingPattern([]);
        stopPatternCollection();
      } else {
        console.error('로그인 실패:', result.error);
        setErrors({ general: result.error });
        onError && onError(result.error);
      }
      
    } catch (error) {
      console.error('로그인 중 오류:', error);
      setErrors({ general: '로그인 중 오류가 발생했습니다.' });
      onError && onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 이상 점수에 따른 UI 상태 업데이트
  useEffect(() => {
    if (anomalyScore > 0) {
      const status = getAnomalyStatus(anomalyScore);
      setAnomalyStatus(status);
      console.log('이상 상태 업데이트:', status);
    }
  }, [anomalyScore]);
  
  return (
    <div className="login-form">
      <h2>로그인</h2>
      
      {errors.general && (
        <div className="error-banner error">
          {errors.general}
        </div>
      )}
      
      {anomalyStatus && (
        <div className={`anomaly-banner ${anomalyStatus.level}`}>
          <div className="anomaly-content">
            <span className="anomaly-icon">
              {anomalyStatus.level === 'high' ? '🚨' : 
               anomalyStatus.level === 'medium' ? '⚠️' : '✅'}
            </span>
            <div className="anomaly-text">
              <strong>{anomalyStatus.message}</strong>
              <div className="anomaly-score">
                이상 점수: {(anomalyScore * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            ref={emailRef}
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            onKeyDown={handleKeyEvent}
            onKeyUp={handleKeyEvent}
            className={errors.email ? 'error' : ''}
            placeholder="이메일을 입력하세요"
            disabled={isLoading}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            ref={passwordRef}
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            onKeyDown={handleKeyEvent}
            onKeyUp={handleKeyEvent}
            className={errors.password ? 'error' : ''}
            placeholder="비밀번호를 입력하세요"
            disabled={isLoading}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>
        
        {isCollectingPattern && (
          <div className="pattern-collection-info">
            <div className="collection-indicator">
              <div className="pulse-dot"></div>
              <span>타이핑 패턴 수집 중... ({typingPattern.length}개)</span>
            </div>
            <p>정확한 분석을 위해 자연스럽게 타이핑해주세요.</p>
          </div>
        )}
        
        <div className="form-actions">
          {!isCollectingPattern ? (
            <button
              type="button"
              onClick={startPatternCollection}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              타이핑 패턴 수집 시작
            </button>
          ) : (
            <button
              type="button"
              onClick={stopPatternCollection}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              패턴 수집 중단
            </button>
          )}
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !isCollectingPattern || typingPattern.length === 0}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </form>
      
      <div className="login-help">
        <h4>로그인 도움말</h4>
        <ul>
          <li>타이핑 패턴 수집을 시작한 후 자연스럽게 입력해주세요.</li>
          <li>최소 10개 이상의 키 입력이 필요합니다.</li>
          <li>이상 패턴이 감지되면 추가 인증이 필요할 수 있습니다.</li>
        </ul>
      </div>
      
      <div className="debug-info">
        <h4>디버그 정보</h4>
        <p>패턴 수집 상태: {isCollectingPattern ? '활성' : '비활성'}</p>
        <p>수집된 패턴: {typingPattern.length}개</p>
        <p>이상 점수: {(anomalyScore * 100).toFixed(1)}%</p>
        <p>상태: {anomalyStatus ? anomalyStatus.status : '확인 중'}</p>
      </div>
    </div>
  );
};

export default LoginForm;
