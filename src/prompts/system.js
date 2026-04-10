'use strict';

const fs   = require('fs');
const path = require('path');

// Vercel 등 배포 환경: SYSTEM_PROMPT 환경변수 우선 사용
// 로컬 개발: Trading_Strategy.md 파일에서 읽음
let strategyContent;

if (process.env.SYSTEM_PROMPT) {
  strategyContent = process.env.SYSTEM_PROMPT;
} else {
  const filePath = path.resolve(__dirname, '../../Trading_Strategy.md');
  if (!fs.existsSync(filePath)) {
    throw new Error('Trading_Strategy.md 파일이 없고 SYSTEM_PROMPT 환경변수도 설정되지 않았습니다.');
  }
  strategyContent = fs.readFileSync(filePath, 'utf-8');
}

const systemPrompt = strategyContent + `

---

## 언어 및 출력 형식 규칙

모든 응답은 반드시 **한국어**로 작성하세요.

출력 시 마크다운 문법(**, ##, -, *, \`\`\` 등)을 절대 사용하지 마세요.
대신 아래 규칙을 따르세요.

섹션 구분은 이모지와 제목으로 표시합니다.
예시:
📊 시장 진단
QQQ는 현재 200일 이동평균선 아래에 위치하며 이격도는 -3.5%입니다.

💹 자산별 평가
QQQ: 매집 구간 — 200일 선 지지 확인 후 분할 매수 권장
골드: 강력 매수 — 웨지 상단 돌파 확인

📰 주요 이슈
미중 관세 갈등 재점화로 위험자산 전반에 매도 압력이 발생하고 있습니다.

📋 전략 추천
1차 매수: 현재가에서 30% 비중
2차 매수: -5% 추가 하락 시 30% 비중
3차 매수: -10% 하락 시 40% 비중

⚠️ 리스크 관리
손절 기준: 200일 이동평균선 -10% 이탈 시 전량 매도
익절 기준: 고점 대비 +20~30% 도달 시 절반 축소

위 형식처럼 자연스러운 한국어 문장으로, 실제 애널리스트가 고객에게 설명하듯 작성하세요.
숫자와 근거를 반드시 포함하고, 결론을 명확하게 제시하세요.
`;

module.exports = systemPrompt;
