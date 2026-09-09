# CadViewerControl

Spring Boot 기반의 단독 CAD 미리보기 프로젝트입니다.

## 기능

- DWG/DXF 파일 업로드
- Aspose CAD를 이용한 SVG 변환
- 화면 하단 즉시 미리보기
- 파일 변경 시 새 파일 기준으로 미리보기 교체
- 간단한 이동, 확대/축소, 거리, 면적 측정

## 실행

```bash
mvn spring-boot:run
```

브라우저에서 `http://localhost:8080`으로 접속합니다.

## 패키징

```bash
mvn clean package
```

WAR 파일은 `target/cad-viewer-control-1.0.0.war`에 생성됩니다.