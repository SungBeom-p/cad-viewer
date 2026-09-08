# cad-viewer
CAD 도면을 웹 브라우저에서 미리보기하기 위한 CAD Viewer 프로젝트

## 1. 프로젝트 개요

CAD 파일을 서버에서 변환하고 웹 브라우저에서 도면을 표시하는 기능을 개발한다.

## 2. 주요 기능

* CAD 파일 미리보기
* DXF 파일 렌더링
* CAD → SVG 변환
* 도면 확대 / 축소
* 도면 이동(Pan)
* 거리 측정
* 면적 측정

## 3. 기술 스택

### Backend

* Java
* Aspose.CAD 25.9

### Frontend

* JavaScript
* SVG
* three.js
* panzoom

## 4. 처리 구조

CAD 파일 -> Backend -> Aspose.CAD -> SVG 변환 -> Browser -> CAD Viewer

## 5. 개발 내용

### CAD 변환

서버에서 CAD 파일을 처리하고 브라우저에서 표시할 수 있는 형태로 변환한다.

### Viewer

변환된 도면을 브라우저에서 표시하고 확대/축소 및 이동 기능을 제공한다.

### 측정

도면상의 좌표를 이용하여 거리 및 면적을 측정할 수 있도록 구현한다.

## 6. 검토한 기술

### three-dxf-viewer

DXF를 브라우저에서 직접 렌더링하는 방법으로 검토하였다.

### SVG

CAD 데이터를 SVG 형태로 변환하여 브라우저에서 표시하는 방법을 검토하였다.

### Aspose.CAD

Java 서버에서 CAD 파일을 처리하고 렌더링/변환하는 용도로 사용하였다.
