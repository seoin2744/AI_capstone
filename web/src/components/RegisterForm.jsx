// 회원가입 폼 컴포넌트
// 타이핑 패턴 분석을 통한 회원가입 처리

import React, { useState, useRef } from 'react';
import { registerUser, convertTypingPatternToVector } from '../api/user.js';
import PasswordTrainingForm from './PasswordTrainingForm.jsx';

console.log('회원가입 폼 컴포넌트 로드됨');

const RegisterForm = ({ onSuccess, onError }) => {
  // 상태 관리
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const [typingPatterns, setTypingPatterns] = useState({ password: [], passwordConfirm: [] });
  const [isCollectingPassword, setIsCollectingPassword] = useState(false); // 비밀번호 필드에 포커스 여부
  const [isCollectingPasswordConfirm, setIsCollectingPasswordConfirm] = useState(false); // 비밀번호 확인 필드에 포커스 여부
  
  // refs
  const passwordRef = useRef(null);
  const passwordConfirmRef = useRef(null);
  
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
    // 비밀번호 또는 비밀번호 확인 필드에 포커스가 있을 때만 수집
    if ((field === 'password' && !isCollectingPassword) ||
        (field === 'passwordConfirm' && !isCollectingPasswordConfirm)) {
      return;
    }
    
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
  
  // 포커스 인 이벤트 처리
  const handleFocus = (field) => {
    if (field === 'password') {
      setIsCollectingPassword(true);
      console.log('비밀번호 필드 포커스 - 타이핑 패턴 수집 시작');
    } else if (field === 'passwordConfirm') {
      setIsCollectingPasswordConfirm(true);
      console.log('비밀번호 확인 필드 포커스 - 타이핑 패턴 수집 시작');
    }
  };
  
  // 포커스 아웃 이벤트 처리
  const handleBlur = (field) => {
    if (field === 'password') {
      setIsCollectingPassword(false);
      console.log('비밀번호 필드 포커스 아웃 - 타이핑 패턴 수집 중단');
    } else if (field === 'passwordConfirm') {
      setIsCollectingPasswordConfirm(false);
      console.log('비밀번호 확인 필드 포커스 아웃 - 타이핑 패턴 수집 중단');
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
    
    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호를 다시 입력해주세요.';
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
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
      const passwordConfirmVector = convertTypingPatternToVector(typingPatterns.passwordConfirm);
      
      console.log('수집된 타이핑 패턴:', typingPatterns);
      console.log('비밀번호 벡터:', passwordVector);
      console.log('비밀번호 확인 벡터:', passwordConfirmVector);
      
      // 회원가입 API 호출 (타이핑 패턴 벡터 포함)
      const registrationData = {
        ...formData,
        typing_pattern: passwordVector
      };
      
      const result = await registerUser(registrationData);
      
      if (result.success) {
        console.log('회원가입 성공:', result);
        
        // 회원가입 데이터 저장 및 훈련 화면으로 전환
        setRegistrationData({
          userId: result.user?.user_id || localStorage.getItem('user_id'),
          userEmail: formData.email,
          password: formData.password
        });
        
        setShowTrainingForm(true);
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
  
  // 훈련 완료 처리
  const handleTrainingComplete = (result) => {
    console.log('훈련 완료:', result);
    
    if (result.success) {
      console.log('회원가입 및 훈련 완료');
      onSuccess && onSuccess(result);
      
      // 폼 초기화
      setFormData({ email: '', password: '', passwordConfirm: '', name: '' });
      setShowTrainingForm(false);
      setRegistrationData(null);
    } else {
      console.error('훈련 실패:', result.error);
      setErrors({ general: result.error });
      setShowTrainingForm(false);
      setRegistrationData(null);
    }
  };
  
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
        
        <div className="form-group">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <input
            ref={passwordConfirmRef}
            type="password"
            id="passwordConfirm"
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handleInputChange}
            onFocus={() => handleFocus('passwordConfirm')}
            onBlur={() => handleBlur('passwordConfirm')}
            onKeyDown={(e) => handleKeyEvent(e, 'passwordConfirm')}
            onKeyUp={(e) => handleKeyEvent(e, 'passwordConfirm')}
            className={errors.passwordConfirm ? 'error' : ''}
            placeholder="비밀번호를 다시 입력하세요"
            disabled={isLoading}
          />
          {errors.passwordConfirm && <span className="error-text">{errors.passwordConfirm}</span>}
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
