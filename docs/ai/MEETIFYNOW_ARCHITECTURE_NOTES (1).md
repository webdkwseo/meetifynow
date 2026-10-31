# MeetifyNow — Notatki architektoniczne

## Reguła zerowa
Nie wolno wymyślać nazw tabel, kolumn, polityk RLS ani endpointów. Najpierw inspekcja istniejącego repo.

## Zasady architektoniczne
- rozdziel warstwę publiczną no-login od warstwy workspace,
- zachowaj prosty model domenowy: workspace -> meeting / poll -> slots -> responses -> finalization,
- projektuj pod auditability decyzji i statusów procesu,
- integracje kalendarzowe traktuj jako adaptery, nie mieszaj ich z główną logiką domenową,
- każda automatyzacja powinna mieć czytelny stan i możliwość retry,
- unikaj rozlewania logiki biznesowej po komponentach UI.

## Sugestie modułów
- event creation flow,
- public response flow,
- organizer decision flow,
- notification service,
- calendar sync adapter,
- analytics snapshot layer,
- workspace settings and roles.

## Zasady dla agenta IDE
- najpierw mapowanie repo,
- potem identyfikacja punktów wejścia,
- potem wdrożenie jednej funkcji,
- po każdej iteracji self-review i testy,
- brak szerokich refaktorów bez dowodu, że są konieczne.
