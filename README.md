한국어 | [English](README.en.md)

# Rite

Rite는 Claude Code와 Codex를 위한 아티팩트 중심(artifact-first) AI 개발팀 매니저입니다.

**Rite before write.** (쓰기 전에 의례를)

Rite는 여러분의 코딩 에이전트를 대체하지 않습니다. 대신 코딩 에이전트에게 하나의 팀 운영 모델을 부여합니다.

```
Request → Team → Plan → Board → Build → Review → Evidence → Sync → Retro
```

작은 변경은 짧고 빡빡한 태스크 루프를 그대로 통과합니다. 규모가 큰 변경은 동적인 멀티 에이전트 workflow로 승격할 수 있습니다. 어떤 결과든 evidence(증거)를 반드시 남겨야 합니다.

런타임은 `.rite/`입니다. Claude Code와 Codex는 그저 실행 표면(execution surface)일 뿐입니다.

---

## 왜 필요한가

AI 코딩 세션은 에이전트가 모호한 의도에서 곧바로 코드로 건너뛰는 탓에 실패하는 경우가 많습니다. Rite는 에이전트가 실제 개발팀처럼 움직이도록 만듭니다.

- **Product Analyst**는 요구사항을 작성합니다.
- **Architect**는 결정을 기록합니다.
- **Tech Lead**는 작업을 태스크 단위로 쪼갭니다.
- **Builder**는 한 번에 하나의 태스크만 구현합니다.
- **Verifier**는 evidence를 확인합니다.
- **Adversarial Reviewer**는 위험한 가정을 집요하게 공격합니다.
- **Scribe**는 메모리와 PR 문서를 갱신합니다.
- **Manager**는 보드가 거짓말하지 않도록 관리합니다.

가장 중요한 단 하나의 불변식은 이것입니다.

```
No evidence, no done. (증거 없으면 완료도 없다)
```

---

## 설치

Rite에는 작은 CLI가 하나 딸려 옵니다. 이 CLI가 하는 일은 오직 Rite 파일을 설치하고, 다시 생성하고, 검증하고, 들여다보는 것뿐입니다. 관리하려는 저장소에서 실행합니다.

```bash
# 이 저장소에서
npm install
npm run build
node dist/cli.js init --tool both     # 또는: claude | codex

# 또는 publish / link 되어 `rite`로 쓸 수 있다면
rite init --tool both
```

- `--tool claude` → `.claude/`(와 `CLAUDE.md`)를 작성합니다.
- `--tool codex`  → `.agents/`, `.codex/`, `AGENTS.md`를 작성합니다.
- `--tool both`   → 위 모든 것을 작성하고, `CLAUDE.md → @AGENTS.md`로 연결(bridge)합니다.

`init`은 여러분이 손댄 파일을 절대 덮어쓰지 않습니다. 다시 생성하려면 `--force`를 넘기세요.

---

## Claude Code 사용법

`rite init --tool claude`를 실행하면 스킬이 `.claude/skills/<name>/SKILL.md`에 자리 잡고, 디렉터리 이름으로 호출됩니다.

```
/rite-kickoff "automatic retry for failed payments"
/rite-plan
/rite-board
/rite-run next
/rite-review
/rite-sync
/rite-retro
/rite-wf            # 규모가 크거나 / 병렬이거나 / 고위험인 작업
```

`/rite`는 나머지 스킬로 라우팅해 주는 우산(umbrella) 스킬입니다. 구버전 Claude Code를 위해 레거시 `.claude/commands/<name>.md` 심(shim)도 함께 작성되며, 이름이 충돌하면 스킬이 우선합니다.

> 확인된 사실: Claude Code 스킬은 대문자 `SKILL.md`를 진입점으로 갖는 디렉터리입니다. `/command`를 결정하는 것은 **디렉터리 이름**이며(frontmatter의 `name`은 그 이름과 일치해야 하는 표시용 라벨일 뿐입니다), 부수효과를 일으키는 Rite 의례(ritual)는 `disable-model-invocation: true`로 표시되어 여러분이 요청할 때만 실행됩니다.

## Codex 사용법

`rite init --tool codex`를 실행하면 동일한 스킬이 `.agents/skills/<name>/SKILL.md`에 작성됩니다. 이는 Codex가 스캔하는 도구 간 공통 표준인 Agent Skills 규약입니다. 이름으로 호출하세요.

```
$rite-kickoff "automatic retry for failed payments"
$rite-plan
$rite-board
$rite-run
$rite-review
$rite-sync
$rite-retro
```

또는 `/skills` 메뉴에서 골라도 됩니다. 저장소 전역 지시문은 (Codex가 읽는) `AGENTS.md`에 담깁니다. 부수효과를 일으키는 스킬에는 `agents/openai.yaml`이 함께 붙으며, 여기엔 `allow_implicit_invocation: false`가 들어갑니다(Claude의 `disable-model-invocation`에 해당하는 Codex 쪽 장치입니다).

> **흔한 오해를 바로잡자면:** Codex의 `.codex/rules/*.rules`는 Starlark(`prefix_rule(...)`)로 작성된 **명령 실행 정책**이지, 지시문이나 페르소나가 아닙니다. 그래서 Rite는 지시문은 `AGENTS.md`에, 페르소나는 스킬에 두고, `.codex/rules/rite.rules`는 동작하지 않는(inert) 주석 처리된 형태로만 제공해 원할 때 opt-in 할 수 있게 합니다. 또한 Codex는 `.claude/`를 읽지 **않습니다**. Rite가 별도의 `.agents/skills/` 트리를 작성하는 이유가 바로 이것입니다.

---

## 핵심 workflow

| 단계 | 명령 | 역할 | 산출물 |
|------|---------|------|--------|
| Kickoff | `rite-kickoff "<intent>"` | Manager → Analyst | project + brief + board |
| Plan | `rite-plan` | Analyst/Architect/Tech Lead | prd, spec, architecture, tasks |
| Board | `rite-board` | Manager | standup status |
| Build | `rite-run [next\|<id>]` | Builder | 태스크 하나, 테스트, 노트 → review |
| Review | `rite-review` | Verifier (+Adversary) | evidence card → done |
| Sync | `rite-sync` | Scribe | changelog, PR desc, decisions |
| Retro | `rite-retro` | Scribe | retro, lessons |

직무 분리(separation of duties): Builder가 완료를 주장하고, Verifier가 evidence를 승인하고, Manager가 보드를 옮기며, 누구도 자기 작업을 스스로 승인하지 않습니다. `rite validate`는 이 가운데 *기계적으로 확인 가능한* 부분을 강제합니다. `done` 태스크에는 완전한 evidence card가 있어야 하고, 그 카드의 리뷰어는 소유자가 아니어야 하며, owner ≠ reviewer, `ready`에는 열린 blocker가 달린 태스크가 없어야 하고, 보드와 `tasks.yaml`의 상태가 일치해야 합니다. 나머지(예: "계획 이후에만 코딩", diff 예산, 실제 행위자 신원)는 코드로 보장되는 것이 아니라 에이전트가 따르는 관례입니다. 정확한 경계는 `.rite/context/constitution.md`를 참고하세요.

---

## 아티팩트

```
.rite/
  config.yaml            모드, 예산, 기본값
  state.yaml             현재 project / phase / task
  team/
    roster.yaml          누가 무엇을 맡는지
    roles/*.md           역할 계약 (manager, builder, verifier, …)
    rituals/*.md         kickoff, planning, standup, review, sync, retro, …
  context/
    constitution.md      엄격한 규칙 (no evidence, no done)
    project-rules.md     여러분 프로젝트의 규칙 (여기를 수정)
    code-map.md, decisions.md, lessons.md
  projects/<id>/
    project.yaml board.yaml tasks.yaml
    brief.md prd.md spec.md architecture.md adr/
    stories/ handoffs/ reviews/ evidence/ sync/
    risk-register.md test-plan.md status-report.md retro.md
  workflows/             동적 workflow 템플릿
```

검증을 통과하는 완성된 프로젝트 예시는 `examples/payment-retry/`를 보세요.

---

## 팀 역할

`.rite/team/roles/`에 있는 여덟 개의 역할 계약은 각 역할이 무엇을 **소유**하고, 무엇을 **할 수 있고**, 무엇을 **할 수 없으며**, 무엇을 **반드시 확인**해야 하는지를 정의합니다. Manager, Product Analyst, Architect, Tech Lead, Builder, Verifier, Adversarial Reviewer, Scribe가 그것입니다. 팀은 태스크마다 동적으로 꾸려집니다. 문구 수정이라면 세 역할이면 충분하고, 결제 기능이라면 전체가 필요하며, 감사(audit)라면 동적 workflow로 승격됩니다.

---

## 동적 workflow

작업이 크거나, 여러 영역에 걸치거나, 병렬화할 수 있거나, 고위험일 때 `rite-wf`는 그것을 다음 단계로 이루어진 멀티 에이전트 workflow로 승격합니다.

```
Plan → Fan-out → Cross-check → Reduce → Evidence
```

`.rite/workflows/` 아래에는 네 가지 템플릿이 들어 있습니다.

- **audit-sweep** — 저장소 전체 결함/보안 감사
- **migration-sweep** — 여러 파일에 걸친 codemod / 마이그레이션
- **cross-review** — 변경 집합에 대한 다각도(multi-lens) 리뷰
- **plan-tournament** — N개의 독립 계획을 심사하고 종합

각 템플릿은 범위, 에이전트, 예산, 게이트, 산출물을 정의하며, **어떤 쓰기 단계든 그 전에 승인을 요구합니다**. 발견 사항에는 파일+라인 단위 evidence가 필요하고, reducer는 의견 충돌을 그대로 보존해야 합니다.

---

## 검증

```bash
rite validate     # .rite/와 모든 프로젝트의 일관성 검사
rite doctor       # 설치된 어댑터, 누락된 스킬, 활성 프로젝트
rite export --tool claude|codex|both   # 템플릿에서 어댑터 재생성
```

`rite validate`는 위반이 하나라도 있으면 0이 아닌 코드로 종료하므로 CI에 그대로 엮을 수 있습니다. `config.yaml`/`state.yaml`/roster 역할 파일이 존재하는지, 활성 프로젝트가 존재하는지, 보드 레인이 일관적인지를 확인하고, 여기에 더해 evidence 게이트를 검사합니다.

- **모든 done 태스크에 실제 evidence card가 있는지** — 카드의 `## Task` 값으로 매칭하며, `Acceptance Criteria Mapping`, PASS이거나 waived된 `Test Result`, 그리고 `Reviewer Verdict`를 요구합니다(위조했거나 비어 있는 카드는 실패합니다);
- **자기 승인이 없는지** — 카드의 리뷰어 ≠ 태스크 소유자;
- 모든 태스크에서 **owner ≠ reviewer**인지;
- **`ready`에 열린 blocker가 달린 태스크가 없는지**, 그리고 **보드의 `done` ↔ `tasks.yaml` 상태가 일치**하는지.

이것은 여러분의 테스트를 실행하거나 diff를 측정하지는 *않습니다*. 그 부분은 관례로 남습니다(Constitution 참고). 덕분에 `validate`는 정직하게 유지됩니다. 작업의 진실됨이 아니라 구조와 evidence의 *형식*에 게이트를 겁니다.

---

## CLI 레퍼런스

| 명령 | 하는 일 |
|---------|--------------|
| `rite init --tool <claude\|codex\|both> [--force] [--cwd <dir>]` | 저장소에 Rite 설치 |
| `rite validate [--cwd <dir>]` | 런타임 + 프로젝트 검증 |
| `rite doctor [--cwd <dir>]` | 어댑터, 스킬, 활성 프로젝트 보고 |
| `rite export --tool <…> [--cwd <dir>]` | 템플릿에서 도구 어댑터 재생성 |
| `rite validate --run-tests [--diff-budget <base>]` | 실제 테스트 실행 + diff 측정을 게이트로 |
| `rite loop [--dry-run] [--max-iterations <n>]` | ready(autonomy:auto) 태스크를 자율적으로 비워 나감 |

## 아키텍처 & 개발

내부 구조는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)를 보세요. 런타임 레이아웃, 플랫폼별 스킬 렌더링, `validate` 게이트(강제 대 관례), 자율 루프(`rite loop`), 코드 맵, 테스트, 그리고 Rite를 확장하는 방법을 다룹니다.

## 라이선스

MIT.
