# 🛡️ AI 기반 연속 인증 시스템

행동 패턴 분석을 통한 지능형 보안 솔루션으로, 사용자의 타이핑 및 마우스 행동을 실시간으로 모니터링하여 이상 패턴을 감지하고 보안을 강화합니다.

## 📋 목차

- [개요](#개요)
- [시스템 아키텍처](#시스템-아키텍처)
- [주요 기능](#주요-기능)
- [설치 및 실행](#설치-및-실행)
- [프로젝트 구조](#프로젝트-구조)
- [API 문서](#api-문서)
- [개발 가이드](#개발-가이드)
- [보안 고려사항](#보안-고려사항)
- [문제 해결](#문제-해결)
- [기여하기](#기여하기)

## 🎯 개요

AI 연속 인증 시스템은 사용자의 행동 패턴을 분석하여 지속적인 보안을 제공하는 혁신적인 솔루션입니다. 전통적인 일회성 인증을 넘어서 사용자의 타이핑 리듬, 마우스 움직임 등을 실시간으로 분석하여 이상 패턴을 감지하고 적절한 보안 조치를 취합니다.

### 핵심 특징

- **실시간 행동 분석**: 키보드와 마우스 입력을 실시간으로 모니터링
- **AI 기반 이상 감지**: 머신러닝 알고리즘을 통한 패턴 분석
- **연속 인증**: 로그인 후에도 지속적인 보안 모니터링
- **적응형 보안**: 이상 패턴 감지 시 자동으로 보안 수준 조정

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chrome        │    │   React Web     │    │   Backend API   │
│   Extension     │◄──►│   Application   │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • 행동 패턴 수집 │    │ • 회원가입/로그인│    │ • AI 모델       │
│ • 실시간 모니터링│    │ • 로그 조회     │    │ • 데이터 분석   │
│ • 이상 감지     │    │ • 대시보드      │    │ • 이메일 인증   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 컴포넌트 설명

1. **Chrome Extension**: 사용자의 행동 패턴을 수집하고 실시간으로 분석
2. **React Web App**: 사용자 인터페이스 및 관리 기능 제공
3. **Backend API**: AI 모델을 통한 패턴 분석 및 인증 처리

## ✨ 주요 기능

### 🔐 인증 기능

- **회원가입**: 타이핑 패턴 등록 및 분석
- **로그인**: 행동 패턴 기반 인증
- **연속 인증**: 로그인 후 지속적인 보안 모니터링
- **이메일 인증**: 이상 패턴 감지 시 추가 인증

### 📊 모니터링 기능

- **실시간 분석**: 3초마다 행동 패턴 분석
- **이상 감지**: 0.8 이상의 이상 점수 시 보안 조치
- **로그 관리**: 모든 활동 기록 및 분석 결과 저장
- **시각화**: 이상 패턴 및 보안 상태 시각적 표시

### 🛡️ 보안 기능

- **패턴 일치도 검증**: 회원가입 시 타이핑 패턴 일치도 확인 (0.8 이상)
- **적응형 임계값**: 로그인 페이지에서 더 민감한 감지 (0.7)
- **자동 차단**: 이상 패턴 감지 시 로그인 폼 비활성화
- **경고 시스템**: 실시간 이상 패턴 경고 및 알림

## 🚀 설치 및 실행

### 사전 요구사항

- Node.js 16.0 이상
- Chrome 브라우저
- Python 백엔드 API 서버 (별도 구현 필요)

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd ai-continuous-auth-system
```

### 2. React 웹 애플리케이션 설정

```bash
# 웹 애플리케이션 디렉토리로 이동
cd web

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 API_BASE_URL을 백엔드 서버 주소로 수정

# 개발 서버 실행
npm run dev
```

### 3. Chrome Extension 설치

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 프로젝트 루트 디렉토리 선택 (manifest.json이 있는 폴더)

### 4. 백엔드 API 서버 실행

```bash
# 백엔드 서버 실행 (별도 구현 필요)
# API 엔드포인트:
# - POST /users/register
# - POST /auth/predict
# - POST /auth/verify
# - GET /logs/{user_id}
```

## 📁 프로젝트 구조

```
ai-continuous-auth-system/
├── manifest.json              # Chrome Extension 매니페스트
├── background.js               # 백그라운드 스크립트
├── content_script.js           # 콘텐츠 스크립트
├── popup.html                  # 팝업 HTML
├── popup.js                    # 팝업 스크립트
├── config.js                   # 설정 파일
├── README.md                   # 프로젝트 문서
│
└── web/                        # React 웹 애플리케이션
    ├── package.json
    ├── vite.config.js
    ├── .env
    ├── index.html
    │
    └── src/
        ├── api/                # API 클라이언트
        │   ├── apiClient.js
        │   ├── user.js
        │   ├── auth.js
        │   └── logs.js
        │
        ├── components/         # React 컴포넌트
        │   ├── RegisterForm.jsx
        │   ├── LoginForm.jsx
        │   └── LogsView.jsx
        │
        ├── styles/            # CSS 스타일
        │   └── main.css
        │
        ├── App.jsx            # 메인 앱 컴포넌트
        └── main.jsx           # 진입점
```

## 📚 API 문서

### 사용자 API

#### 회원가입
```javascript
POST /users/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "사용자명",
  "typing_pattern": [...],
  "metadata": {...}
}
```

#### 사용자 정보 조회
```javascript
GET /users/{user_id}
```

### 인증 API

#### 행동 패턴 예측
```javascript
POST /auth/predict
{
  "user_id": "user123",
  "keystrokes": [...],
  "mouse_movements": [...],
  "timestamp": 1234567890
}
```

#### 이메일 인증
```javascript
POST /auth/verify
{
  "user_id": "user123",
  "email": "user@example.com",
  "verification_code": "123456"
}
```

### 로그 API

#### 로그 조회
```javascript
GET /logs/{user_id}?limit=50&offset=0&start_date=2024-01-01
```

## 🛠️ 개발 가이드

### 개발 환경 설정

1. **Chrome Extension 개발**
   - Chrome DevTools의 "확장 프로그램" 탭에서 디버깅
   - 콘솔에서 `window.aiAuthDebug` 함수 사용

2. **React 앱 개발**
   - Vite 개발 서버 사용 (`npm run dev`)
   - 브라우저 DevTools에서 `window.appDebug` 함수 사용

3. **API 개발**
   - Postman 또는 curl을 사용한 API 테스트
   - 환경 변수로 API 기본 URL 설정

### 디버깅

#### Chrome Extension 디버깅
```javascript
// 콘솔에서 사용 가능한 디버깅 함수
window.aiAuthDebug.getBehaviorData()  // 현재 행동 데이터
window.aiAuthDebug.sendData()         // 데이터 즉시 전송
window.aiAuthDebug.toggleMonitoring() // 모니터링 토글
```

#### React 앱 디버깅
```javascript
// 브라우저 콘솔에서 사용 가능한 디버깅 함수
window.appDebug.getEnv()              // 환경 변수 확인
window.userApiDebug.registerUser()    // 사용자 API 테스트
window.authApiDebug.predictBehavior() // 인증 API 테스트
```

### 코드 스타일

- **JavaScript**: ES6+ 문법 사용
- **React**: 함수형 컴포넌트 및 Hooks 사용
- **CSS**: CSS 변수 및 모던 레이아웃 사용
- **네이밍**: camelCase (JavaScript), kebab-case (CSS)

## 🔒 보안 고려사항

### 데이터 보호

- **개인정보**: 타이핑 패턴은 해시화하여 저장
- **전송 보안**: HTTPS를 통한 모든 API 통신
- **로컬 저장**: 민감한 정보는 암호화하여 저장

### 프라이버시

- **최소 수집**: 필요한 행동 데이터만 수집
- **자동 삭제**: 일정 기간 후 자동으로 데이터 삭제
- **사용자 제어**: 사용자가 데이터 수집을 중단할 수 있음

### 보안 모범 사례

- **입력 검증**: 모든 사용자 입력에 대한 유효성 검사
- **오류 처리**: 민감한 정보가 노출되지 않도록 오류 메시지 처리
- **세션 관리**: 적절한 세션 타임아웃 및 토큰 관리

## 🐛 문제 해결

### 자주 발생하는 문제

#### 1. Chrome Extension이 로드되지 않음
```bash
# 해결 방법:
1. manifest.json 파일이 프로젝트 루트에 있는지 확인
2. Chrome에서 "개발자 모드"가 활성화되어 있는지 확인
3. 브라우저 콘솔에서 오류 메시지 확인
```

#### 2. API 연결 실패
```bash
# 해결 방법:
1. .env 파일의 VITE_API_BASE_URL 확인
2. 백엔드 서버가 실행 중인지 확인
3. CORS 설정 확인
```

#### 3. 타이핑 패턴 수집 실패
```bash
# 해결 방법:
1. 브라우저에서 JavaScript가 활성화되어 있는지 확인
2. 콘텐츠 스크립트가 페이지에 주입되었는지 확인
3. 최소 10개 이상의 키 입력이 있는지 확인
```

### 로그 확인

#### Chrome Extension 로그
- `chrome://extensions/` → 확장 프로그램 → "세부정보" → "검사"
- Service Worker 콘솔에서 백그라운드 스크립트 로그 확인

#### React 앱 로그
- 브라우저 DevTools → Console 탭
- Network 탭에서 API 요청/응답 확인

## 🤝 기여하기

### 기여 방법

1. **Fork** 프로젝트
2. **Feature Branch** 생성 (`git checkout -b feature/AmazingFeature`)
3. **Commit** 변경사항 (`git commit -m 'Add some AmazingFeature'`)
4. **Push** 브랜치 (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

### 개발 가이드라인

- **코드 리뷰**: 모든 변경사항은 코드 리뷰를 거쳐야 함
- **테스트**: 새로운 기능은 테스트 코드와 함께 제공
- **문서화**: API 변경사항은 문서에 반영
- **커밋 메시지**: 명확하고 간결한 커밋 메시지 작성

### 이슈 리포트

버그 리포트나 기능 요청은 GitHub Issues를 통해 제출해주세요.

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이메일**: support@ai-auth-system.com
- **GitHub Issues**: [Issues 페이지](https://github.com/your-repo/issues)
- **문서**: [Wiki 페이지](https://github.com/your-repo/wiki)

---

**AI 연속 인증 시스템**으로 더 안전한 디지털 환경을 만들어가세요! 🚀
