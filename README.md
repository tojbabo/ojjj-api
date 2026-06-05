## 📖 프로젝트 소개

프로젝트 개요 작성

* 어떤 데이터를 제공하는 서비스인지
* 왜 만들었는지
* 어떤 사용자들이 사용하는지
* 어떤 문제를 해결하는지

예시)

다양한 데이터를 API 형태로 제공하기 위한 백엔드 서버입니다.

사용자 인증, API Key 관리, 데이터 조회, 사용량 집계 등의 기능을 제공하며 API 서비스 운영에 필요한 핵심 기능들을 구현하였습니다.

<br>

## 🏗 시스템 아키텍처

아키텍처 이미지 삽입

```text
Client
  ↓
API Gateway
  ↓
Backend Server
  ↓
DynamoDB
```

<br>

## 📂 파일 구조

```text
src
 ├── auth
 │   ├── controller
 │   ├── service
 │   ├── repository
 │   └── dto
 │
 ├── api
 │   ├── controller
 │   ├── service
 │   ├── repository
 │   └── dto
 │
 ├── common
 ├── config
 ├── middleware
 └── types
```

### 구조 설명

* auth : 인증 및 인가 관련 기능
* api : API 서비스 관련 기능
* common : 공통 유틸리티
* config : 환경 설정
* middleware : 공통 처리 로직
* types : 타입 정의

<br>

## 🚀 기술적 도전 및 주요 기능

### 사용자 인증 및 권한 관리

#### 문제

인증되지 않은 사용자의 API 접근을 방지해야 함

#### 해결

JWT 기반 인증 및 권한 검증 기능 구현

#### 결과

안전한 API 접근 환경 제공

---

### API Key 발급 및 관리

#### 문제

외부 서비스에서 API를 안전하게 호출할 수 있어야 함

#### 해결

사용자별 API Key 발급 및 검증 기능 구현

#### 결과

API 사용 이력 추적 및 접근 제어 가능

---

### DynamoDB 데이터 모델 설계

#### 문제

다양한 형태의 데이터를 유연하게 저장할 수 있어야 함

#### 해결

Access Pattern 기반 DynamoDB 테이블 설계

#### 결과

확장 가능한 데이터 저장 구조 확보

---

### API 사용량 집계

#### 문제

사용자별 API 사용 현황을 확인할 수 있어야 함

#### 해결

호출 이력 저장 및 사용량 집계 기능 구현

#### 결과

API 사용 통계 및 모니터링 제공

---

### 예외 처리 및 공통 응답 구조

#### 문제

API마다 응답 형식이 달라질 경우 유지보수가 어려움

#### 해결

공통 응답 객체 및 전역 예외 처리 구조 적용

#### 결과

일관된 API 인터페이스 제공

<br>

## 📑 API 명세

### 인증

* 회원가입
* 로그인
* 토큰 재발급

### API 서비스

* API 목록 조회
* API 상세 조회
* API 호출
* API 사용량 조회

### 사용자

* 사용자 정보 조회
* API Key 관리

<br>

## 📈 성과

* API 서비스 플랫폼 구축
* 사용자 인증 및 API Key 기반 접근 제어 구현
* DynamoDB 기반 데이터 저장 구조 설계
* API 사용량 추적 및 모니터링 기능 구현


## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```