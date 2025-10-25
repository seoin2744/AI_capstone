// 비밀번호 훈련 컴포넌트
// 회원가입 후 여러 번 비밀번호를 입력받아 타이핑 패턴을 학습시킵니다

import React, { useState, useRef, useEffect } from 'react';
import { apiPost } from '../api/apiClient.js';
import { setupExtensionIntegration, checkExtensionStatus, requestTypingPatternCollection, stopTypingPatternCollection } from '../utils/extensionIntegration.js';
import { convertTypingPatternToVector } from '../api/user.js';

console.log('비밀번호 훈련 컴포넌트 로드됨');

const PasswordTrainingForm = ({ userId, userEmail, password, onComplete }) => {
  // 상태 관리
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [passwordInput, setPasswordInput] = useState('');
  const [typingPatterns, setTypingPatterns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [allVectors, setAllVectors] = useState([]); // 모든 벡터 저장 (디버깅용)
  
  // 타이핑 패턴 수집 상태
  const [isCollectingPattern, setIsCollectingPattern] = useState(true);
  
  // 확장 프로그램 통합 상태
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [useExtensionData, setUseExtensionData] = useState(false);
  
  // refs
  const passwordRef = useRef(null);
  
  // 확장 프로그램 초기화
  useEffect(() => {
    const initExtension = async () => {
      console.log('확장 프로그램 초기화 시작');
      
      // 확장 프로그램 통합 설정
      setupExtensionIntegration();
      
      // 확장 프로그램 상태 확인
      const status = await checkExtensionStatus();
      setExtensionAvailable(status.available);
      
      if (status.available) {
        console.log('확장 프로그램 사용 가능 - 타이핑 패턴 수집 시작');
        requestTypingPatternCollection();
        setUseExtensionData(true);
      } else {
        console.log('확장 프로그램 사용 불가 - 웹 내장 수집 사용');
        setUseExtensionData(false);
      }
    };
    
    initExtension();
    
    // 확장 프로그램에서 타이핑 패턴 수신 이벤트 리스너
    const handleTypingPatternReceived = (event) => {
      console.log('확장 프로그램에서 타이핑 패턴 수신:', event.detail);
      
      const { pattern, source } = event.detail;
      
      if (source === 'extension' && pattern.length > 0) {
        // 확장 프로그램에서 받은 패턴을 웹 패턴에 추가
        setTypingPatterns(prev => [...prev, ...pattern]);
      }
    };
    
    window.addEventListener('typingPatternReceived', handleTypingPatternReceived);
    
    return () => {
      window.removeEventListener('typingPatternReceived', handleTypingPatternReceived);
      if (extensionAvailable) {
        stopTypingPatternCollection();
      }
    };
  }, []);

  // 포커스 설정
  useEffect(() => {
    if (passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [currentAttempt]);

  // 키보드 이벤트 처리
  const handleKeyEvent = (event) => {
    // 확장 프로그램을 사용하는 경우 웹 내장 수집 비활성화
    if (useExtensionData) return;
    
    if (!isCollectingPattern) return;
    
    const timestamp = Date.now();
    const keyData = {
      type: event.type,
      key: event.key,
      code: event.code,
      timestamp: timestamp
    };
    
    setTypingPatterns(prev => [...prev, keyData]);
    
    console.log('타이핑 패턴 수집:', keyData);
  };
  
  // 입력 필드 변경 처리
  const handleInputChange = (e) => {
    const { value } = e.target;
    setPasswordInput(value);
    setError('');
    
    // 입력이 완료되었는지 확인 (Enter 키 또는 비밀번호 길이 확인)
    if (value === password) {
      console.log('비밀번호 입력 완료');
    }
  };
  
  // 비밀번호 입력 완료 처리 (Enter 키)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePasswordSubmit();
    } else {
      // 일반 키 이벤트 처리
      handleKeyEvent(e);
    }
  };
  
  // 비밀번호 제출 처리
  const handlePasswordSubmit = async () => {
    // 비밀번호 검증
    if (passwordInput !== password) {
      setError('비밀번호가 올바르지 않습니다. 다시 입력해주세요.');
      setPasswordInput('');
      return;
    }
    
    // 타이핑 패턴 검증
    if (typingPatterns.length === 0) {
      setError('타이핑 패턴을 수집할 수 없습니다. 다시 시도해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // 타이핑 패턴을 벡터로 변환
      const keystrokeVector = convertTypingPatternToVector(typingPatterns);
      
      console.log(`=== 비밀번호 입력 ${currentAttempt}번째 시도 ===`);
      console.log('수집된 타이핑 패턴:', typingPatterns);
      console.log('변환된 벡터 (2차원 배열):', keystrokeVector);
      console.log('벡터 상세 정보:');
      keystrokeVector.forEach((vector, index) => {
        console.log(`  벡터 ${index + 1}: [${vector.join(', ')}]`);
      });
      
      // 이전 벡터와 함께 저장
      setAllVectors(prev => [...prev, keystrokeVector]);
      
      // API 요청 데이터 준비
      const requestData = {
        keystroke_vector: keystrokeVector,
        user_id: userId
      };
      
      console.log('API 요청 데이터:', requestData);
      
      // /auth/predict 엔드포인트로 전송
      const response = await apiPost('/auth/predict', requestData);
      
      console.log('API 응답:', response);
      
      if (response.success) {
        const { is_anomalous } = response.data;
        
        console.log('이상 감지 결과:', is_anomalous);
        
        if (is_anomalous) {
          // 이상이 감지됨 - 다시 입력
          setCurrentAttempt(prev => prev + 1);
          setMessage(`타이핑 패턴이 일치하지 않습니다. 다시 입력해주세요. (${currentAttempt}번째 시도)`);
          setPasswordInput('');
          setTypingPatterns([]);
        } else {
          // 이상이 없음 - 훈련 완료
          setMessage('타이핑 패턴 훈련이 완료되었습니다!');
          console.log('전체 수집된 벡터 데이터:');
          allVectors.forEach((vector, idx) => {
            console.log(`시도 ${idx + 1}:`, vector);
          });
          console.log('현재 시도 벡터:', keystrokeVector);
          
          setTimeout(() => {
            onComplete && onComplete({ 
              success: true, 
              attempts: currentAttempt,
              vectors: allVectors,
              finalVector: keystrokeVector
            });
          }, 1500);
          return;
        }
      } else {
        throw new Error(response.error || '서버 오류가 발생했습니다.');
      }
      
    } catch (error) {
      console.error('비밀번호 훈련 오류:', error);
      setError(error.message || '비밀번호 훈련 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="password-training-form">
      <div className="card">
        <div className="card-header">
          <h2>비밀번호 타이핑 패턴 훈련</h2>
          <p className="card-subtitle">
            보안을 위해 비밀번호를 여러 번 입력하여 타이핑 패턴을 학습합니다.
          </p>
        </div>
        
        <div className="training-progress">
          <div className="progress-info">
            <p>진행 상황: {currentAttempt}번째 시도</p>
            <p className="progress-hint">타이핑 패턴이 일치할 때까지 반복 입력합니다.</p>
          </div>
        </div>
        
        {error && (
          <div className="error-banner error">
            {error}
          </div>
        )}
        
        {message && (
          <div className={`info-banner ${message.includes('완료') ? 'success' : 'warning'}`}>
            {message}
          </div>
        )}
        
        <div className="training-form">
          <div className="form-group">
            <label htmlFor="training-password">비밀번호 입력</label>
            <input
              ref={passwordRef}
              type="password"
              id="training-password"
              value={passwordInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyEvent}
              placeholder="비밀번호를 입력하세요"
              disabled={isLoading}
              className={error ? 'error' : ''}
            />
            <small>비밀번호를 입력하고 Enter 키를 누르세요.</small>
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePasswordSubmit}
              disabled={isLoading || !passwordInput}
            >
              {isLoading ? '처리 중...' : '다음'}
            </button>
          </div>
        </div>
        
        <div className="debug-info">
          <h4>디버그 정보</h4>
          <p>패턴 수집 상태: {isCollectingPattern ? '활성' : '비활성'}</p>
          <p>확장 프로그램: {extensionAvailable ? '사용 가능' : '사용 불가'}</p>
          <p>데이터 소스: {useExtensionData ? '확장 프로그램' : '웹 내장'}</p>
          <p>타이핑 패턴 수: {typingPatterns.length}개</p>
          <p>현재 시도: {currentAttempt}회</p>
          
          {allVectors.length > 0 && (
            <div className="vector-debug">
              <h5>수집된 벡터 데이터 ({allVectors.length}개)</h5>
              {allVectors.map((vector, idx) => (
                <div key={idx} className="vector-item">
                  <strong>시도 {idx + 1}:</strong>
                  <pre style={{ fontSize: '12px', maxHeight: '100px', overflow: 'auto' }}>{JSON.stringify(vector, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordTrainingForm;
