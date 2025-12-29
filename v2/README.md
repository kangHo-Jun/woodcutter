# 대장간 (Wood Cutter) V3

목재 재단 최적화 웹 애플리케이션

## 주요 기능

| 기능 | 설명 |
| :--- | :--- |
| **2D/3D 미리보기** | 재단 결과를 2D 도면 및 3D 시각화로 확인 |
| **자동 최적화** | Bin-Packing 알고리즘 기반 최적 배치 |
| **재단비용 계산** | 두께별 컷팅 비용 자동 산출 |
| **PDF 리포트** | 재단 도면 및 부품 목록 PDF 출력 |

## 기술 스택

- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **3D Rendering**: Three.js (r128)
- **PDF 생성**: jsPDF
- **스타일**: CSS (Glassmorphism, Dark Mode 지원)

## 실행 방법

```bash
# 로컬 서버로 실행 (Live Server, http-server 등)
npx http-server . -p 8080

# 또는 브라우저에서 직접 열기
open index.html
```

## 파일 구조

```
v2/
├── index.html          # 메인 페이지
├── css/
│   └── style.css       # 스타일시트
├── js/
│   ├── app.js          # 메인 앱 로직 (CuttingApp 클래스)
│   ├── packer.js       # Bin-Packing 알고리즘
│   ├── renderer.js     # 2D Canvas 렌더러
│   └── three-preview.js # 3D 미리보기
├── analyze_cuts.py     # 컷 분석 스크립트 (Python)
├── simulate.py         # 시뮬레이션 스크립트 (Python)
└── simulate.js         # 시뮬레이션 스크립트 (JS)
```

## 재단비용 계산 로직

| 두께 (Thickness) | 단가 (원/컷) |
| :--- | :--- |
| 12mm 이하 | 1,000원 |
| 13~23mm | 1,500원 |
| 24mm 이상 | 2,000원 |

## 라이선스

MIT License
