# MeetifyNow — AI Vibe Coding Bundle

Ten zestaw plików jest przygotowany do pracy z agentem AI w IDE.
Cel: skrócić drogę od strategii produktu do iteracyjnego wdrażania funkcji bez rozmywania zakresu.

## Zalecana kolejność użycia
1. `MEETIFYNOW_MASTER_CONTEXT.md`
2. `MEETIFYNOW_PRODUCT_BRIEF.md`
3. `MEETIFYNOW_PERSONAS_JTBD.md`
4. `MEETIFYNOW_PRICING_PACKAGES.md`
5. `MEETIFYNOW_ROADMAP_ITERATIONS.md`
6. `MEETIFYNOW_BACKLOG_PRIORITY.md`
7. `MEETIFYNOW_UI_UX_GUARDRAILS.md`
8. `MEETIFYNOW_ARCHITECTURE_NOTES.md`
9. `MEETIFYNOW_ACCEPTANCE_CRITERIA.md`
10. wybrany prompt operacyjny z plików `MEETIFYNOW_AGENT_*.txt`

## Jak tego używać
- Najpierw wklej agentowi `MEETIFYNOW_AGENT_MASTER_PROMPT.txt`.
- Następnie podaj sprintowy prompt wdrożeniowy: `MEETIFYNOW_IMPLEMENTATION_SPRINT_01.txt`, potem `02`, potem `03`.
- Jeśli pracujesz nad konkretnym obszarem, dołącz prompt rolowy, np. `MEETIFYNOW_AGENT_UI_UX.txt` albo `MEETIFYNOW_AGENT_QA_RELEASE.txt`.
- Agent ma pracować iteracyjnie: 1 zadanie -> self-check -> testy -> raport zmian -> dopiero następne zadanie.

## Co zawiera bundle
- brief produktu,
- ICP i JTBD,
- pakiety i monetyzację,
- roadmapę i iteracje,
- backlog i kryteria akceptacji,
- guardraile UI/UX,
- notatki architektoniczne bez wymyślania niepotwierdzonych schematów,
- role i skills agentów,
- gotowe prompty do implementacji.

## Zasada operacyjna
Nie budujemy ogólnej aplikacji do kalendarza. Budujemy wąski vertical SaaS dla małych agencji marketingowych i software house, który redukuje koszt koordynacji spotkań projektowych i klienckich.
