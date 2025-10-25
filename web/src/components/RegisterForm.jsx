// 회원가입 폼 컴포넌트
// 타이핑 패턴 분석을 통한 회원가입 처리

import React, { useState, useRef } from 'react';
import { registerUser, convertTypingPatternToVector } from '../api/user.js';
import { trainKeystrokeData, checkModelTrainingStatus } from '../api/auth.js';
import PasswordTrainingForm from './PasswordTrainingForm.jsx';

console.log('회원가입 폼 컴포넌트 로드됨');

// 비밀번호 재입력 검증 컴포넌트
const PasswordVerificationInput = ({ onVerify, originalPassword, disabled }) => {
  const [password, setPassword] = useState('');
  const [typingPattern, setTypingPattern] = useState([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef(null);
  
  // 키보드 이벤트 처리 (비밀번호 입력 필드에서만)
  const handleKeyEvent = (event) => {
    if (!isCollecting) return;
    
    // 입력 필드가 아닌 곳에서 발생한 이벤트는 무시
    if (event.target !== passwordRef.current) {
      console.log('⚠️ 비밀번호 필드가 아닌 곳에서 키 이벤트 발생, 무시:', event.target);
      return;
    }
    
    const timestamp = Date.now();
    const keyData = {
      type: event.type,
      key: event.key,
      code: event.code,
      timestamp: timestamp,
      target: event.target.tagName // 디버깅용
    };
    
    console.log('✅ 비밀번호 필드에서 키 이벤트 수집:', keyData);
    setTypingPattern(prev => [...prev, keyData]);
  };
  
  // 포커스 처리
  const handleFocus = () => {
    setIsCollecting(true);
    setTypingPattern([]); // 매번 새로운 패턴으로 시작
  };
  
  const handleBlur = () => {
    setIsCollecting(false);
  };
  
  // 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onVerify(password, typingPattern);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="verification-form">
      <div className="form-group">
        <label htmlFor="verificationPassword">비밀번호 재입력</label>
        <input
          ref={passwordRef}
          type="password"
          id="verificationPassword"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          placeholder="비밀번호를 다시 입력하세요"
          disabled={disabled || isLoading}
          autoFocus
        />
      </div>
      
      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || isLoading || !password}
        >
          {isLoading ? '검증 중...' : '검증하기'}
        </button>
      </div>
    </form>
  );
};

const RegisterForm = ({ onSuccess, onError }) => {
  // 상태 관리
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const [typingPatterns, setTypingPatterns] = useState({ password: [] });
  const [isCollectingPassword, setIsCollectingPassword] = useState(false); // 비밀번호 필드에 포커스 여부
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false); // 비밀번호 재입력 검증 중
  
  // refs
  const passwordRef = useRef(null);
  const verificationPasswordRef = useRef(null);
  
  // 입력 필드 변경 처리
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 오류 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // 키보드 이벤트 처리 (타이핑 패턴 수집) - 비밀번호 필드에만 수집
  const handleKeyEvent = (event, field) => {
    // 비밀번호 필드에 포커스가 있을 때만 수집
    if (field === 'password' && !isCollectingPassword) {
      return;
    }
    
    // 비밀번호 필드가 아닌 경우 입력 필드 확인
    if (field === 'password' && event.target !== passwordRef.current) {
      console.log('⚠️ 비밀번호 필드가 아닌 곳에서 키 이벤트 발생, 무시:', event.target);
      return;
    }
    
    const timestamp = Date.now();
    const keyData = {
      type: event.type,
      key: event.key,
      code: event.code,
      timestamp: timestamp,
      target: event.target.tagName // 디버깅용
    };
    
    setTypingPatterns(prev => ({
      ...prev,
      [field]: [...prev[field], keyData]
    }));
    
    console.log(`✅ ${field} 타이핑 패턴 수집:`, keyData);
  };
  
  // 포커스 인 이벤트 처리
  const handleFocus = (field) => {
    if (field === 'password') {
      setIsCollectingPassword(true);
      console.log('비밀번호 필드 포커스 - 타이핑 패턴 수집 시작');
    }
  };
  
  // 포커스 아웃 이벤트 처리
  const handleBlur = (field) => {
    if (field === 'password') {
      setIsCollectingPassword(false);
      console.log('비밀번호 필드 포커스 아웃 - 타이핑 패턴 수집 중단');
    }
  };
  

  
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
    } else if (formData.password.length < 10) {
      newErrors.password = '비밀번호는 최소 10자 이상이어야 합니다.';
    }
    
    
    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      console.log('회원가입 데이터 전송:', formData);
      
      // 타이핑 패턴을 벡터로 변환
      const passwordVector = convertTypingPatternToVector(typingPatterns.password);
      
      console.log('수집된 타이핑 패턴:', typingPatterns);
      console.log('비밀번호 벡터:', passwordVector);
      
      // 회원가입 API 호출 (타이핑 패턴 벡터 포함)
      const registrationData = {
        ...formData,
        keystroke_vector: passwordVector
      };
      
      const result = await registerUser(registrationData);
      
      if (result.success) {
        console.log('회원가입 성공:', result);
        
        // 회원가입 성공 후 비밀번호 재입력 검증 단계로 이동
        setRegistrationData({
          userId: result.user?.user_id || localStorage.getItem('user_id'),
          userEmail: formData.email,
          password: formData.password,
          originalKeystrokeVector: passwordVector
        });
        
        setIsVerifyingPassword(true);
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
  
  // 비밀번호 재입력 검증 처리
  const handlePasswordVerification = async (verificationPassword, verificationTypingPattern) => {
    console.log('비밀번호 재입력 검증 시작');
    
    try {
      // 타이핑 패턴을 벡터로 변환
      const verificationVector = convertTypingPatternToVector(verificationTypingPattern);
      
      if (verificationVector.length === 0) {
        throw new Error('유효한 타이핑 패턴이 필요합니다.');
      }
      
      // 최소 10개 벡터 요구사항 확인
      if (verificationVector.length < 10) {
        throw new Error(`최소 10개의 키 입력이 필요합니다. 현재 ${verificationVector.length}개 입력됨. 비밀번호를 더 천천히 입력해주세요.`);
      }
      
      // 비밀번호 일치 확인
      if (verificationPassword !== registrationData.password) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }
      
      // 키스트로크 학습 API 호출하여 품질 검증
      console.log('키스트로크 품질 검증 시작');
      
      const trainingResult = await trainKeystrokeData(registrationData.userId, [verificationVector]);
      
      console.log('학습 결과:', trainingResult);
      
      if (trainingResult.success) {
        if (trainingResult.isAcceptable) {
          console.log('비밀번호 재입력 검증 성공 - 품질 기준 통과');
          
          // 검증 성공 시 훈련 화면으로 이동
          setShowTrainingForm(true);
          setIsVerifyingPassword(false);
        } else {
          console.log('비밀번호 재입력 검증 실패 - 품질 기준 미달');
          
          // 검증 실패 시 재시도 요청
          setErrors({ 
            verification: '비밀번호 입력 품질이 기준에 미달합니다. 다시 입력해주세요.' 
          });
        }
      } else {
        throw new Error(trainingResult.error || '품질 검증에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('비밀번호 재입력 검증 오류:', error);
      setErrors({ verification: error.message });
    }
  };
  
  // 훈련 완료 처리
  const handleTrainingComplete = (result) => {
    console.log('훈련 완료:', result);
    
    if (result.success) {
      console.log('회원가입 및 훈련 완료');
      onSuccess && onSuccess(result);
      
      // 폼 초기화
      setFormData({ email: '', password: '', name: '' });
      setShowTrainingForm(false);
      setRegistrationData(null);
      setIsVerifyingPassword(false);
    } else {
      console.error('훈련 실패:', result.error);
      setErrors({ general: result.error });
      setShowTrainingForm(false);
      setRegistrationData(null);
      setIsVerifyingPassword(false);
    }
  };
  
  // 비밀번호 재입력 검증 화면
  if (isVerifyingPassword && registrationData) {
    return (
      <div className="password-verification-form">
        <h2>비밀번호 재입력 검증</h2>
        <p>회원가입이 완료되었습니다. 보안을 위해 비밀번호를 다시 입력해주세요.</p>
        <p className="info-text">입력 품질이 기준(70점)에 도달할 때까지 반복 입력이 필요할 수 있습니다.</p>
        <p className="info-text">최소 10개의 키 입력이 필요합니다. 비밀번호를 천천히 입력해주세요.</p>
        
        {errors.verification && (
          <div className="error-banner error">
            {errors.verification}
          </div>
        )}
        
        <PasswordVerificationInput
          onVerify={handlePasswordVerification}
          originalPassword={registrationData.password}
          disabled={isLoading}
        />
      </div>
    );
  }
  
  // 훈련 화면이 활성화된 경우
  if (showTrainingForm && registrationData) {
    return (
      <PasswordTrainingForm
        userId={registrationData.userId}
        userEmail={registrationData.userEmail}
        password={registrationData.password}
        onComplete={handleTrainingComplete}
      />
    );
  }
  
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
            onFocus={() => handleFocus('password')}
            onBlur={() => handleBlur('password')}
            onKeyDown={(e) => handleKeyEvent(e, 'password')}
            onKeyUp={(e) => handleKeyEvent(e, 'password')}
            className={errors.password ? 'error' : ''}
            placeholder="비밀번호를 입력하세요 (최소 10자)"
            disabled={isLoading}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>
        
        
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </div>
      </form>
      

    </div>
  );
};

export default RegisterForm;
