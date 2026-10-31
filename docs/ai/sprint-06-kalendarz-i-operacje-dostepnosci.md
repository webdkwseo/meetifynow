# Sprint 6 — Kalendarz i operacje dostępności

## Cel sprintu
Uszczelnić to, co decyduje o wiarygodności produktu: kalendarz, konflikty terminów, dostępność organizatora i jakość przepływu rezerwacji. Ten sprint nie dodaje „błyszczących” funkcji. Usuwa tarcie z rdzenia aplikacji.

## Dlaczego ten sprint istnieje
Jeśli aplikacja źle czyta dostępność albo dopuszcza konflikt terminu, produkt przegrywa niezależnie od tego, ile ma ekranów i modułów. Wersja po pierwszych sprintach zwykle działa, ale ma luki:
- synchronizacja kalendarza jest zbyt płytka,
- dostępność bywa rozjechana ze stanem rzeczywistym,
- brak prostych reguł buforów i ograniczeń,
- organizator nie ma kontroli nad tym, jak wygląda okno rezerwacji.

Ten sprint ma doprowadzić rdzeń rezerwacji do poziomu, przy którym system jest przewidywalny i obronny sprzedażowo.

## Zakres sprintu

### Wchodzi do sprintu — zakres krytyczny
- Utwardzenie integracji z kalendarzem używanym już przez aplikację.
- Pewne blokowanie konfliktów terminów przy rezerwacji.
- Rozbudowa ustawień dostępności jednej osoby.
- Bufory przed i po spotkaniu.
- Limity wyprzedzenia rezerwacji oraz minimalnego czasu przed spotkaniem.
- Wykluczanie niedostępnych przedziałów na podstawie kalendarza i reguł dostępności.
- Czytelny stan połączenia z kalendarzem w panelu organizatora.

### Wchodzi do sprintu — zakres warunkowy
- Możliwość podłączenia drugiego kalendarza dla tej samej osoby, jeśli obecna architektura już wspiera wiele źródeł zajętości.
- Dodanie kolejnego dostawcy kalendarza, jeśli abstrakcja integracji już istnieje i nie wymaga przepisywania rdzenia.
- Proste ustawienia dni wolnych lub wyjątków od stałej dostępności.
- Kopiowanie ustawień dostępności między linkami tego samego użytkownika.

## Poza zakresem sprintu
- Wspólna dostępność kilku osób w jednym spotkaniu.
- Zaawansowane reguły rund robin, kolejek handlowych i routingu leadów.
- Automatyczne tworzenie Google Meet przez API.
- Szablony firmowe, personalizowane strony marki, white-label.
- AI dobierające sloty, scoring przychodowy, predykcja no-show.

## Definicja ukończenia sprintu
Sprint jest ukończony dopiero wtedy, gdy:
1. aplikacja nie pozwala zarezerwować terminu kolidującego z zajętym kalendarzem,
2. organizator może ustawić własną tygodniową dostępność oraz bufory,
3. organizator widzi stan integracji z kalendarzem,
4. po zmianie ustawień nowe wolne sloty są liczone poprawnie,
5. system jest przewidywalny dla organizatora i uczestnika.

## Wymagania produktowe

### 1. Ustawienia dostępności jednej osoby
To jest rozszerzenie modelu jednej osoby, nie wspólnej dostępności zespołu.

#### Minimalny zakres ustawień
- dni tygodnia, w których można przyjmować spotkania,
- przedziały godzinowe dla każdego dnia,
- długość spotkania zgodna z konfiguracją linku,
- bufor przed spotkaniem,
- bufor po spotkaniu,
- minimalne wyprzedzenie rezerwacji,
- maksymalny horyzont rezerwacji do przodu,
- wyjątki od dostępności dla konkretnych dat, jeśli zakres warunkowy zostanie uruchomiony.

#### Reguły biznesowe
- Slot może być pokazany tylko wtedy, gdy mieści się w oknie dostępności.
- Slot nie może naruszać bufora przed ani po innym wydarzeniu.
- Slot nie może być pokazany, jeśli jest bliżej niż minimalne wyprzedzenie rezerwacji.
- Slot nie może wykraczać poza maksymalny horyzont rezerwacji.
- Reguły linku rezerwacyjnego nie mogą obchodzić reguł użytkownika.

### 2. Integracja z kalendarzem
Ten sprint ma doprowadzić integrację do stanu „wiarygodne źródło zajętości”, nie do pełnej platformy integracyjnej.

#### Wymagania
- System musi czytać zajętość z podłączonego kalendarza.
- System musi odświeżać zajętość w sposób zgodny z obecną architekturą i limitem API dostawcy.
- System musi blokować rezerwację, jeśli między odczytem a zapisem pojawił się konflikt.
- Organizator musi widzieć, czy kalendarz jest połączony, wymaga odświeżenia autoryzacji lub jest rozłączony.

#### Reguły biznesowe
- Brak aktywnego połączenia z kalendarzem musi być jasno komunikowany w panelu.
- Jeśli integracja jest rozłączona, system nie może udawać, że wszystko działa normalnie.
- Jeśli aktualizacja tokenu dostępu się nie powiedzie, organizator ma dostać jasny komunikat i akcję naprawczą.

### 3. Obliczanie wolnych slotów
Algorytm musi być deterministyczny i prosty do wyjaśnienia.

#### Slot jest dostępny tylko wtedy, gdy jednocześnie
- mieści się w regułach tygodniowej dostępności,
- nie koliduje z żadnym zajętym wydarzeniem z kalendarza,
- nie narusza buforów,
- mieści się w minimalnym i maksymalnym oknie rezerwacji,
- nie został wycięty przez wyjątek lub dzień wolny, jeśli funkcja warunkowa zostanie wdrożona.

#### Oczekiwane zachowanie
- Lista slotów nie może się zmieniać w sposób pozornie losowy między kolejnymi odświeżeniami bez zmiany danych wejściowych.
- Rezerwacja tego samego slotu przez dwóch użytkowników równocześnie musi być rozstrzygana bez podwójnego zapisu.
- Użytkownik końcowy ma dostać czytelny komunikat, jeśli slot właśnie przestał być dostępny.

### 4. Widok połączenia kalendarza w panelu
Panel organizatora musi pokazywać:
- czy kalendarz jest połączony,
- kiedy integracja była ostatnio poprawnie użyta lub odświeżona,
- czy wymagane jest ponowne połączenie,
- jaki kalendarz jest źródłem zajętości, jeśli włączona jest obsługa więcej niż jednego źródła.

Nie budujemy tutaj centrum administracyjnego integracji. Wystarczy użyteczny status i droga naprawy.

## Wymagania techniczne

### Frontend
Należy przygotować:
- ekran ustawień dostępności,
- edycję przedziałów tygodniowych,
- ustawienia buforów,
- ustawienia minimalnego i maksymalnego horyzontu rezerwacji,
- ekran statusu połączenia z kalendarzem,
- czytelne komunikaty błędów w publicznym przepływie rezerwacji.

#### Wymagania UX
- Edycja dostępności nie może wymagać zbyt wielu kroków.
- Organizator musi rozumieć wpływ buforów na liczbę slotów.
- Publiczny widok rezerwacji ma jasno informować, gdy termin właśnie zniknął.
- Ustawienia mają być zapisane w sposób przewidywalny i natychmiast widoczny w podglądzie przyszłych slotów, jeśli taki podgląd istnieje.

### Backend
Należy dostarczyć logikę dla:
- pobierania zajętości z kalendarza,
- przeliczania wolnych slotów,
- walidacji konfliktu w momencie finalizacji rezerwacji,
- przechowywania reguł dostępności użytkownika,
- obsługi stanu połączenia z kalendarzem,
- obsługi wygasłej autoryzacji.

### Baza danych
Model danych musi wspierać co najmniej:
- reguły tygodniowej dostępności użytkownika,
- bufory i okna rezerwacji,
- stan połączenia z kalendarzem,
- źródła zajętości, jeśli obsługiwane jest ich więcej niż jedno,
- wyjątki od dostępności jako element opcjonalny.

### Niezawodność i współbieżność
To jest najważniejsza część sprintu.

System musi chronić przed:
- podwójną rezerwacją tego samego slotu,
- rezerwacją na podstawie nieaktualnego odczytu zajętości,
- uszkodzeniem logiki przy czasach granicznych i zmianie strefy czasowej,
- zbyt agresywnym odpytywaniem API kalendarza.

Należy wdrożyć mechanizm finalnej walidacji dostępności tuż przed zapisem spotkania. Sama prezentacja wolnych slotów nie wystarcza.

## Zadania implementacyjne

### Zadanie 6.1 — Ustawienia tygodniowej dostępności
#### Cel
Pozwolić organizatorowi kontrolować, kiedy może przyjmować spotkania.

#### Kryteria akceptacji
- Organizator może ustawić dni i godziny dostępności.
- Zmiana ustawień wpływa na publicznie widoczne sloty.
- Reguły są respektowane przez wszystkie nowe rezerwacje.

### Zadanie 6.2 — Bufory i okna rezerwacji
#### Cel
Ograniczyć chaos kalendarza i spotkania „na styk”.

#### Kryteria akceptacji
- Organizator może ustawić bufor przed i po spotkaniu.
- Organizator może ustawić minimalne wyprzedzenie rezerwacji.
- Organizator może ustawić maksymalny horyzont rezerwacji.
- Sloty naruszające te reguły nie są pokazywane.

### Zadanie 6.3 — Utwardzenie konfliktów kalendarza
#### Cel
Zapewnić, że niedostępne terminy faktycznie nie mogą zostać zarezerwowane.

#### Kryteria akceptacji
- Slot kolidujący z kalendarzem nie jest prezentowany.
- Jeśli konflikt pojawi się tuż przed zapisem, rezerwacja jest odrzucana z jasnym komunikatem.
- System nie zapisuje podwójnej rezerwacji tego samego terminu.

### Zadanie 6.4 — Status połączenia z kalendarzem
#### Cel
Dać organizatorowi wgląd w stan integracji.

#### Kryteria akceptacji
- Panel pokazuje status połączenia z kalendarzem.
- Przy problemie z autoryzacją użytkownik dostaje komunikat i ścieżkę naprawy.
- Rozłączony kalendarz jest widoczny jako ryzyko dla poprawności dostępności.

### Zadanie 6.5 — Opcjonalne wyjątki od dostępności
#### Cel
Pozwolić wyłączyć konkretne daty lub jednorazowo zmienić godziny.

#### Kryteria akceptacji
- Organizator może oznaczyć dzień jako niedostępny lub ustawić wyjątek godzinowy.
- Wyjątek nadpisuje regułę tygodniową dla danej daty.
- Publiczny widok rezerwacji respektuje wyjątek.

## Testy

### Testy funkcjonalne
- Poprawne generowanie slotów na podstawie tygodniowej dostępności.
- Ukrywanie slotów kolidujących z kalendarzem.
- Działanie buforów przed i po spotkaniu.
- Respektowanie minimalnego wyprzedzenia rezerwacji.
- Respektowanie maksymalnego horyzontu rezerwacji.
- Zmiana ustawień i poprawna aktualizacja slotów.
- Widoczny status połączenia z kalendarzem w panelu.

### Testy negatywne
- Próba zarezerwowania slotu, który właśnie stał się niedostępny.
- Próba rezerwacji przy rozłączonej integracji, jeśli aplikacja wymaga aktywnego kalendarza do poprawnego działania.
- Niepoprawne zakresy godzin w dostępności.
- Nakładające się przedziały godzinowe w ustawieniach organizatora.

### Testy współbieżności
- Dwie równoległe próby rezerwacji tego samego slotu.
- Szybka zmiana danych zajętości w kalendarzu między odczytem a finalnym zapisem.

### Testy czasu i stref
- Zmiana czasu letniego / zimowego.
- Użytkownik i uczestnik w różnych strefach czasowych.
- Bufory przecinające granice dnia.

## Telemetria i logowanie zdarzeń
Należy rejestrować co najmniej:
- zmianę ustawień dostępności,
- błąd odczytu zajętości kalendarza,
- odrzucenie rezerwacji z powodu konfliktu,
- sukces i porażkę odświeżenia autoryzacji,
- rozłączenie lub wymagane ponowne połączenie kalendarza,
- użycie wyjątków od dostępności, jeśli wdrożone.

## Ryzyka i decyzje
- Największe ryzyko techniczne to błędy współbieżności przy finalizacji rezerwacji. To wymaga obrony na backendzie.
- Największe ryzyko UX to niezrozumienie, dlaczego dany slot nie jest dostępny. Komunikaty muszą być konkretne.
- Największe ryzyko produktowe to pokusa dodania wspólnej dostępności. Nadal tego nie robimy.

## Rezultat biznesowy po sprincie
Po tym sprincie aplikacja staje się przewidywalna w najważniejszym miejscu: w samym akcie rezerwacji. To nie jest funkcja do slajdu sprzedażowego. To warunek, żeby klient nie stracił zaufania po pierwszym konflikcie kalendarza.
