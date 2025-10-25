// OTP 인증 컴포넌트
// 이상 감지 시 이메일로 전송된 OTP 코드를 입력받는 컴포넌트

import React, { useState, useEffect, useRef } from 'react';
import { verifyEmail } from '../api/auth.js';

console.log('OTP 인증 컴포넌트 로드됨');

const OTPVerification = ({ 
  userEmail, 
  onSuccess, 
  onFailure, 
  onCancel,
  maxAttempts = 5,
  blockDuration = 30 * 60 * 1000 // 30분
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const otpInputRef = useRef(null);
  const blockTimerRef = useRef(null);
  const resendTimerRef = useRef(null);

  // 컴포넌트 마운트 시 OTP 입력 필드에 포커스
  useEffect(() => {
    if (otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, []);

  // 차단 시간 카운트다운
  useEffect(() => {
    if (isBlocked && blockTimeLeft > 0) {
      blockTimerRef.current = setInterval(() => {
        setBlockTimeLeft(prev => {
          if (prev <= 1000) {
            setIsBlocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (blockTimerRef.current) {
        clearInterval(blockTimerRef.current);
      }
    };
  }, [isBlocked, blockTimeLeft]);

  // 재전송 쿨다운 카운트다운
  useEffect(() => {
    if (resendCooldown > 0) {
      resendTimerRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1000) {
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
      }
    };
  }, [resendCooldown]);

  // OTP 코드 입력 처리
  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // 숫자만 허용
    if (value.length <= 6) {
      setOtpCode(value);
      setError('');
    }
  };

  // OTP 인증 시도
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('6자리 OTP 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('OTP 인증 시도:', { email: userEmail, otp: otpCode });
      
      const result = await verifyEmail({
        user_email: userEmail,
        otp_code: otpCode,
        verification_type: 'login_anomaly'
      });

      if (result.success && result.verified) {
        console.log('OTP 인증 성공');
        setAttempts(0);
        onSuccess && onSuccess(result);
      } else {
        console.log('OTP 인증 실패');
        handleVerificationFailure();
      }
    } catch (error) {
      console.error('OTP 인증 오류:', error);
      handleVerificationFailure();
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 실패 처리
  const handleVerificationFailure = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (newAttempts >= maxAttempts) {
      console.log('최대 시도 횟수 초과 - 계정 차단');
      setIsBlocked(true);
      setBlockTimeLeft(blockDuration);
      setError(`인증 실패 횟수가 ${maxAttempts}회를 초과했습니다. ${Math.floor(blockDuration / 60000)}분간 로그인이 차단됩니다.`);
      onFailure && onFailure('max_attempts_exceeded');
    } else {
      setError(`OTP 코드가 올바르지 않습니다. (${newAttempts}/${maxAttempts}회 시도)`);
      setOtpCode('');
      if (otpInputRef.current) {
        otpInputRef.current.focus();
      }
    }
  };

  // OTP 재전송 요청
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      console.log('OTP 재전송 요청:', userEmail);
      
      const result = await verifyEmail({
        user_email: userEmail,
        verification_type: 'resend_otp'
      });

      if (result.success) {
        setResendCooldown(60000); // 1분 쿨다운
        setError('');
        console.log('OTP 재전송 성공');
      } else {
        setError('OTP 재전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('OTP 재전송 오류:', error);
      setError('OTP 재전송 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 포맷팅
  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 차단 상태일 때
  if (isBlocked) {
    return (
      <div className="otp-verification-blocked">
        <div className="blocked-content">
          <div className="blocked-icon">🚫</div>
          <h3>계정이 일시적으로 차단되었습니다</h3>
          <p>OTP 인증 실패 횟수가 {maxAttempts}회를 초과했습니다.</p>
          <div className="block-timer">
            <strong>{formatTime(blockTimeLeft)}</strong> 후에 다시 시도할 수 있습니다.
          </div>
          <button 
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={blockTimeLeft > 0}
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="otp-verification">
      <div className="otp-header">
        <h3>이메일 인증 필요</h3>
        <p>비정상적인 로그인 패턴이 감지되었습니다.</p>
        <p><strong>{userEmail}</strong>로 전송된 OTP 코드를 입력해주세요.</p>
      </div>

      <div className="otp-form">
        <div className="form-group">
          <label htmlFor="otp-code">OTP 코드 (6자리)</label>
          <input
            ref={otpInputRef}
            type="text"
            id="otp-code"
            value={otpCode}
            onChange={handleOtpChange}
            placeholder="123456"
            maxLength={6}
            className={error ? 'error' : ''}
            disabled={isLoading}
          />
          {error && <span className="error-text">{error}</span>}
        </div>

        <div className="otp-actions">
          <button
            className="btn btn-primary"
            onClick={handleVerifyOtp}
            disabled={isLoading || !otpCode || otpCode.length !== 6}
          >
            {isLoading ? '인증 중...' : '인증하기'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={handleResendOtp}
            disabled={isLoading || resendCooldown > 0}
          >
            {resendCooldown > 0 ? `재전송 (${formatTime(resendCooldown)})` : 'OTP 재전송'}
          </button>
        </div>

        <div className="otp-info">
          <p>• OTP 코드는 6자리 숫자입니다.</p>
          <p>• 인증 실패 시 {maxAttempts}회까지 재시도 가능합니다.</p>
          <p>• {maxAttempts}회 실패 시 {Math.floor(blockDuration / 60000)}분간 로그인이 차단됩니다.</p>
        </div>

        <div className="otp-footer">
          <button
            className="btn btn-link"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
