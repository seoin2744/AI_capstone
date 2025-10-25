// 로그인 폼 컴포넌트
// 타이핑 패턴 분석을 통한 로그인 처리

import React, { useState, useRef, useEffect } from 'react';
import { attemptLogin, getAnomalyStatus } from '../api/auth.js';
import { convertTypingPatternToVector } from '../api/user.js';
import OTPVerification from './OTPVerification.jsx';

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
  
  // OTP 인증 상태
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [isLoginBlocked, setIsLoginBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  
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
  
  // OTP 인증 후 1분 이내인지 확인
  const isWithinOTPGracePeriod = (email) => {
    const otpSuccessTime = localStorage.getItem('otp_success_time');
    const otpUserEmail = localStorage.getItem('otp_user_email');
    
    if (!otpSuccessTime || !otpUserEmail) {
      return false;
    }
    
    // 이메일이 일치하는지 확인
    if (otpUserEmail !== email) {
      return false;
    }
    
    const currentTime = Date.now();
    const gracePeriod = 60 * 1000; // 1분 (밀리초)
    const timeDiff = currentTime - parseInt(otpSuccessTime);
    
    const isWithinGrace = timeDiff < gracePeriod;
    console.log('OTP 유예 기간 확인:', {
      otpSuccessTime: new Date(parseInt(otpSuccessTime)).toLocaleString(),
      currentTime: new Date(currentTime).toLocaleString(),
      timeDiff: Math.round(timeDiff / 1000) + '초',
      gracePeriod: gracePeriod / 1000 + '초',
      isWithinGrace
    });
    
    return isWithinGrace;
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
    
    // OTP 유예 기간 확인
    const isWithinGracePeriod = isWithinOTPGracePeriod(formData.email);
    
    // OTP 유예 기간이 아닌 경우에만 타이핑 패턴 검사
    if (!isWithinGracePeriod && (!isCollectingPattern || typingPattern.length === 0)) {
      newErrors.password = '타이핑 패턴을 수집해주세요.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // OTP 유예 기간 내인 경우 패턴 분석 없이 로그인
      if (isWithinGracePeriod) {
        console.log('OTP 유예 기간 내 로그인 - 패턴 분석 건너뛰기');
        
        // 간단한 로그인 데이터 (패턴 없이)
        const loginData = {
          email: formData.email,
          password: formData.password,
          typingPattern: [], // 빈 패턴으로 전송
          skipPatternAnalysis: true // 패턴 분석 건너뛰기 플래그
        };
        
        console.log('유예 기간 로그인 데이터 전송:', loginData);
        
        const result = await attemptLogin(loginData);
        
        if (result.success) {
          console.log('유예 기간 로그인 성공:', result);
          
          // 이상 점수는 0으로 설정 (패턴 분석 없음)
          setAnomalyScore(0);
          setAnomalyStatus({
            status: 'normal',
            level: 'low',
            message: 'OTP 인증 유예 기간 내 로그인',
            color: '#4caf50'
          });
          
          onSuccess && onSuccess(result);
          
          // 폼 초기화
          setFormData({ email: '', password: '' });
          setTypingPattern([]);
          stopPatternCollection();
        } else {
          console.error('유예 기간 로그인 실패:', result.error);
          setErrors({ general: result.error });
          onError && onError(result.error);
        }
      } else {
        // 일반적인 로그인 처리 (패턴 분석 포함)
        const loginData = {
          ...formData,
          typingPattern: typingPattern
        };
        
        console.log('일반 로그인 데이터 전송:', loginData);
        
        const result = await attemptLogin(loginData);
        
        if (result.success) {
          console.log('로그인 성공:', result);
          
          // 이상 점수 업데이트
          setAnomalyScore(result.anomalyScore || 0);
          setAnomalyStatus(getAnomalyStatus(result.anomalyScore || 0));
          
          // 이메일 인증이 필요한 경우 (이상 감지)
          if (result.requiresEmailVerification) {
            console.log('이상 감지 - 로그인 차단 및 OTP 인증 필요');
            setIsLoginBlocked(true);
            setBlockReason('비정상적인 로그인 패턴이 감지되었습니다. 이메일 인증이 필요합니다.');
            setRequiresOTP(true);
            setShowOTPVerification(true);
            return; // 로그인 완료하지 않고 OTP 인증 대기
          }
          
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
      }
      
    } catch (error) {
      console.error('로그인 중 오류:', error);
      setErrors({ general: '로그인 중 오류가 발생했습니다.' });
      onError && onError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // OTP 인증 성공 처리
  const handleOTPSuccess = (result) => {
    console.log('OTP 인증 성공 - 로그인 차단 해제');
    setShowOTPVerification(false);
    setRequiresOTP(false);
    setIsLoginBlocked(false);
    setBlockReason('');
    
    // OTP 인증 성공 시간 저장 (1분 유예 기간용)
    const otpSuccessTime = Date.now();
    localStorage.setItem('otp_success_time', otpSuccessTime.toString());
    localStorage.setItem('otp_user_email', formData.email);
    console.log('OTP 인증 성공 시간 저장:', new Date(otpSuccessTime).toLocaleString());
    
    // 로그인 완료 처리
    onSuccess && onSuccess({
      ...result,
      email: formData.email,
      anomalyScore: anomalyScore
    });
    
    // 폼 초기화
    setFormData({ email: '', password: '' });
    setTypingPattern([]);
    stopPatternCollection();
  };

  // OTP 인증 실패 처리
  const handleOTPFailure = (reason) => {
    console.log('OTP 인증 실패:', reason);
    
    if (reason === 'max_attempts_exceeded') {
      // 최대 시도 횟수 초과 - 차단 시간 연장
      setBlockReason('OTP 인증 실패 횟수가 초과되어 로그인이 차단되었습니다. 30분 후에 다시 시도해주세요.');
      setShowOTPVerification(false);
      // 30분 후 자동 해제를 위한 타이머 설정
      setTimeout(() => {
        setIsLoginBlocked(false);
        setBlockReason('');
        setRequiresOTP(false);
        console.log('로그인 차단 자동 해제');
      }, 30 * 60 * 1000); // 30분
    } else {
      // 일반적인 실패 - 여전히 차단 상태 유지
      setBlockReason('OTP 인증에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // OTP 인증 취소 처리
  const handleOTPCancel = () => {
    console.log('OTP 인증 취소 - 로그인 차단 유지');
    setShowOTPVerification(false);
    setRequiresOTP(false);
    // 로그인은 여전히 차단된 상태로 유지
    setBlockReason('이메일 인증이 취소되었습니다. 로그인이 차단되었습니다.');
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
      
      {/* 로그인 차단 상태 표시 */}
      {isLoginBlocked && (
        <div className="blocked-banner error">
          <div className="blocked-content">
            <div className="blocked-icon">🚫</div>
            <div className="blocked-text">
              <h3>로그인이 차단되었습니다</h3>
              <p>{blockReason}</p>
            </div>
          </div>
        </div>
      )}
      
      {errors.general && !isLoginBlocked && (
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
            disabled={isLoading || isLoginBlocked}
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
            disabled={isLoading || isLoginBlocked}
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
        
        {/* OTP 유예 기간 안내 */}
        {isWithinOTPGracePeriod(formData.email) && (
          <div className="grace-period-info">
            <div className="grace-period-indicator">
              <div className="check-icon">✅</div>
              <span>OTP 인증 유예 기간 내 로그인</span>
            </div>
            <p>패턴 분석 없이 바로 로그인할 수 있습니다.</p>
          </div>
        )}
        
        <div className="form-actions">
          {/* OTP 유예 기간이 아닌 경우에만 패턴 수집 버튼 표시 */}
          {!isWithinOTPGracePeriod(formData.email) && (
            <>
              {!isCollectingPattern ? (
                <button
                  type="button"
                  onClick={startPatternCollection}
                  className="btn btn-secondary"
                  disabled={isLoading || isLoginBlocked}
                >
                  타이핑 패턴 수집 시작
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopPatternCollection}
                  className="btn btn-secondary"
                  disabled={isLoading || isLoginBlocked}
                >
                  패턴 수집 중단
                </button>
              )}
            </>
          )}
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              isLoading || 
              isLoginBlocked || 
              (!isWithinOTPGracePeriod(formData.email) && (!isCollectingPattern || typingPattern.length === 0))
            }
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
        <p>OTP 인증 필요: {requiresOTP ? '예' : '아니오'}</p>
        <p>로그인 차단: {isLoginBlocked ? '예' : '아니오'}</p>
        {isLoginBlocked && <p>차단 사유: {blockReason}</p>}
        <p>OTP 유예 기간: {isWithinOTPGracePeriod(formData.email) ? '예' : '아니오'}</p>
        {isWithinOTPGracePeriod(formData.email) && (
          <p>유예 기간 남은 시간: {Math.max(0, 60 - Math.floor((Date.now() - parseInt(localStorage.getItem('otp_success_time') || '0')) / 1000))}초</p>
        )}
      </div>
      
      {/* OTP 인증 모달 */}
      {showOTPVerification && (
        <div className="modal-overlay">
          <div className="modal-content">
            <OTPVerification
              userEmail={formData.email}
              onSuccess={handleOTPSuccess}
              onFailure={handleOTPFailure}
              onCancel={handleOTPCancel}
              maxAttempts={5}
              blockDuration={30 * 60 * 1000} // 30분
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
