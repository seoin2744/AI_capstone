// 회원가입 폼 컴포넌트
// 타이핑 패턴 분석을 통한 회원가입 처리

import React, { useState, useRef, useEffect } from 'react';
import { registerUser, calculateTypingSimilarity } from '../api/user.js';

console.log('회원가입 폼 컴포넌트 로드됨');

const RegisterForm = ({ onSuccess, onError }) => {
  // 상태 관리
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: ''
  });
  
  const [typingPatterns, setTypingPatterns] = useState({
    password: [],
    passwordConfirm: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [similarityScore, setSimilarityScore] = useState(0);
  
  // 타이핑 패턴 수집 상태
  const [isCollectingPattern, setIsCollectingPattern] = useState(true); // 자동으로 시작
  const [patternCollectionStep, setPatternCollectionStep] = useState(0); // 0: 비밀번호, 1: 재입력
  const [showSimilarityPopup, setShowSimilarityPopup] = useState(false);
  
  // refs
  const passwordRef = useRef(null);
  const passwordConfirmRef = useRef(null);
  
  
  // 키보드 이벤트 처리
  const handleKeyEvent = (event, field) => {
    if (!isCollectingPattern) return;
    
    const timestamp = Date.now();
    const keyData = {
      type: event.type,
      key: event.key,
      code: event.code,
      timestamp: timestamp
    };
    
    setTypingPatterns(prev => ({
      ...prev,
      [field]: [...prev[field], keyData]
    }));
    
    console.log(`${field} 타이핑 패턴 수집:`, keyData);
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
  
  // 비밀번호 재입력 완료 시 유사도 계산
  useEffect(() => {
    if (typingPatterns.password.length > 0 && typingPatterns.passwordConfirm.length > 0) {
      const similarity = calculateTypingSimilarity(
        typingPatterns.password,
        typingPatterns.passwordConfirm
      );
      
      setSimilarityScore(similarity);
      console.log('타이핑 패턴 유사도:', similarity);
      
      // 유사도가 낮으면 팝업 표시
      if (similarity < 0.8) {
        setShowSimilarityPopup(true);
        setErrors(prev => ({
          ...prev,
          passwordConfirm: '타이핑 패턴이 일치하지 않습니다. 다시 입력해주세요.'
        }));
      } else {
        setShowSimilarityPopup(false);
        // 오류 메시지 제거
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.passwordConfirm;
          return newErrors;
        });
      }
    }
  }, [typingPatterns]);
  
  // 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('회원가입 폼 제출:', formData);
    
    // 기본 유효성 검사
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }
    
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    
    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호를 다시 입력해주세요.';
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }
    
    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요.';
    }
    
    // 타이핑 패턴 유사도 검사
    if (similarityScore < 0.8) {
      setShowSimilarityPopup(true);
      newErrors.passwordConfirm = '타이핑 패턴이 일치하지 않습니다. 다시 입력해주세요.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // 평균 타이핑 패턴 계산
      const averagePattern = calculateAveragePattern([
        ...typingPatterns.password,
        ...typingPatterns.passwordConfirm
      ]);
      
      const registrationData = {
        ...formData,
        typingPattern: averagePattern
      };
      
      console.log('회원가입 데이터 전송:', registrationData);
      
      const result = await registerUser(registrationData);
      
      if (result.success) {
        console.log('회원가입 성공:', result);
        onSuccess && onSuccess(result);
        
        // 폼 초기화
        setFormData({ email: '', password: '', passwordConfirm: '', name: '' });
        setTypingPatterns({ password: [], passwordConfirm: [] });
        setSimilarityScore(0);
        setShowSimilarityPopup(false);
      } else {
        console.error('회원가입 실패:', result.error);
        setErrors({ general: result.error });
        onError && onError(result.error);
      }
      
    } catch (error) {
      console.error('회원가입 중 오류:', error);
      setErrors({ general: '회원가입 중 오류가 발생했습니다.' });
      onError && onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 평균 타이핑 패턴 계산
  const calculateAveragePattern = (patterns) => {
    if (patterns.length === 0) return [];
    
    // 키 다운/업 쌍 찾기
    const pairs = [];
    for (let i = 0; i < patterns.length - 1; i++) {
      if (patterns[i].type === 'keydown' && patterns[i+1].type === 'keyup' && 
          patterns[i].key === patterns[i+1].key) {
        pairs.push({
          key: patterns[i].key,
          pressTime: patterns[i+1].timestamp - patterns[i].timestamp,
          timestamp: patterns[i].timestamp
        });
      }
    }
    
    return pairs;
  };
  
  // 패턴 수집 단계별 안내 메시지
  const getPatternCollectionMessage = () => {
    if (!isCollectingPattern) return '';
    
    switch (patternCollectionStep) {
      case 0:
        return '비밀번호를 입력해주세요. 타이핑 패턴을 분석합니다.';
      case 1:
        return '비밀번호를 다시 입력해주세요. 패턴 일치도를 확인합니다.';
      default:
        return '';
    }
  };
  
  return (
    <div className="register-form">
      <h2>회원가입</h2>
      
      {errors.general && (
        <div className="error-banner error">
          {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">이름</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={errors.name ? 'error' : ''}
            placeholder="이름을 입력하세요"
            disabled={isLoading}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
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
            onKeyDown={(e) => handleKeyEvent(e, 'password')}
            onKeyUp={(e) => handleKeyEvent(e, 'password')}
            className={errors.password ? 'error' : ''}
            placeholder="비밀번호를 입력하세요 (최소 8자)"
            disabled={isLoading}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <input
            ref={passwordConfirmRef}
            type="password"
            id="passwordConfirm"
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handleInputChange}
            onKeyDown={(e) => handleKeyEvent(e, 'passwordConfirm')}
            onKeyUp={(e) => handleKeyEvent(e, 'passwordConfirm')}
            className={errors.passwordConfirm ? 'error' : ''}
            placeholder="비밀번호를 다시 입력하세요"
            disabled={isLoading}
          />
          {errors.passwordConfirm && <span className="error-text">{errors.passwordConfirm}</span>}
          
          {similarityScore > 0 && (
            <div className={`similarity-indicator ${similarityScore >= 0.8 ? 'good' : 'bad'}`}>
              타이핑 패턴 유사도: {(similarityScore * 100).toFixed(1)}%
              {similarityScore >= 0.8 ? ' ✓' : ' ✗'}
            </div>
          )}
        </div>
        
        {isCollectingPattern && (
          <div className="pattern-collection-info">
            <div className="progress-indicator">
              <div className={`step ${patternCollectionStep >= 0 ? 'active' : ''}`}>1</div>
              <div className={`step ${patternCollectionStep >= 1 ? 'active' : ''}`}>2</div>
            </div>
            <p>{getPatternCollectionMessage()}</p>
          </div>
        )}
        
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || similarityScore < 0.8}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </div>
      </form>
      
      {/* 유사도 낮음 팝업 */}
      {showSimilarityPopup && (
        <div className="similarity-popup-overlay">
          <div className="similarity-popup">
            <div className="popup-header">
              <h3>타이핑 패턴 불일치</h3>
              <button 
                className="close-btn"
                onClick={() => setShowSimilarityPopup(false)}
              >
                ×
              </button>
            </div>
            <div className="popup-content">
              <div className="similarity-warning">
                <p>현재 타이핑 패턴 유사도: <strong>{(similarityScore * 100).toFixed(1)}%</strong></p>
                <p>보안을 위해 타이핑 패턴 유사도가 80% 이상일 때만 회원가입이 가능합니다.</p>
                <p>다시 입력해주세요.</p>
              </div>
              <div className="popup-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowSimilarityPopup(false);
                    setFormData(prev => ({ ...prev, passwordConfirm: '' }));
                    setTypingPatterns(prev => ({ ...prev, passwordConfirm: [] }));
                    setSimilarityScore(0);
                    passwordConfirmRef.current?.focus();
                  }}
                >
                  다시 입력하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="debug-info">
        <h4>디버그 정보</h4>
        <p>패턴 수집 상태: {isCollectingPattern ? '활성' : '비활성'}</p>
        <p>비밀번호 패턴: {typingPatterns.password.length}개</p>
        <p>재입력 패턴: {typingPatterns.passwordConfirm.length}개</p>
        <p>유사도 점수: {(similarityScore * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
};

export default RegisterForm;
