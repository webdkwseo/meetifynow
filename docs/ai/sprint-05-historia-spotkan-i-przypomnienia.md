# Sprint 5 — Historia spotkań i sekwencje przypomnień

## Cel sprintu
Dowieźć dwa elementy, które realnie wpływają na wartość produktu: widoczność przebiegu spotkań oraz prosty system ograniczający no-show. To ma zwiększyć kontrolę organizatora i poprawić frekwencję bez dokładania zbędnej złożoności.

## Dlaczego ten sprint istnieje
Po zbudowaniu podstawowego panelu i pracy zespołowej organizator nadal ma dwa praktyczne problemy:
1. Nie ma czytelnej historii tego, co wydarzyło się ze spotkaniami.
2. Nie ma sekwencji przypomnień, która zmniejsza liczbę nieobecności.

Ten sprint ma zbudować pierwszą warstwę operacyjną produktu. Nie chodzi o „analitykę”. Chodzi o odpowiedź na pytanie: co zostało umówione, co się odbyło, co odwołano i kto się nie pojawił.

## Zakres sprintu

### Wchodzi do sprintu — zakres krytyczny
- Historia spotkań dostępna w panelu organizatora.
- Statusy spotkań przynajmniej dla stanów:
  - zaplanowane,
  - odbyło się,
  - odwołane,
  - brak uczestnictwa.
- Automatyczna sekwencja przypomnień e-mail przed spotkaniem.
- Możliwość anulowania spotkania przez organizatora.
- Możliwość przełożenia spotkania przez klienta z poziomu linku w e-mailu.
- Rejestrowanie podstawowych zdarzeń związanych ze spotkaniem i wysłanymi przypomnieniami.

### Wchodzi do sprintu — zakres warunkowy
- Ręczne oznaczenie spotkania jako „odbyło się” lub „brak uczestnictwa”, jeśli system nie może tego stwierdzić automatycznie.
- Filtrowanie historii po statusie i właścicielu spotkania.
- Wyszukiwanie po imieniu uczestnika lub adresie e-mail.
- Możliwość dodania krótkiej notatki organizatora do spotkania po jego zakończeniu.
- Drugi typ przypomnienia wysyłany po braku potwierdzenia od uczestnika, jeśli obecna architektura już wspiera kolejki lub harmonogramy.

## Poza zakresem sprintu
- SMS, WhatsApp i inne kanały przypomnień.
- Generowanie treści przez AI.
- Rozbudowane kampanie, automatyzacje marketingowe i sekwencje wieloetapowe.
- Zaawansowana analityka lejka, scoring uczestników, modele predykcyjne.
- Automatyczne wykrywanie obecności na podstawie integracji z wideokonferencją.

## Definicja ukończenia sprintu
Sprint jest ukończony dopiero wtedy, gdy organizator może:
1. wejść do historii spotkań,
2. zobaczyć przynajmniej planowane, zakończone, odwołane i nieodbyte spotkania,
3. mieć automatycznie wysłane przypomnienia przed spotkaniem,
4. oznaczyć wynik spotkania, jeśli nie zrobi tego system,
5. przełożyć lub anulować spotkanie bez ręcznego obchodzenia systemu.

## Wymagania produktowe

### 1. Historia spotkań
Historia spotkań ma być widokiem operacyjnym, nie raportem analitycznym.

#### Minimalny zakres danych w wierszu historii
Każdy rekord powinien pokazywać co najmniej:
- nazwę lub typ spotkania, jeśli istnieje,
- właściciela spotkania,
- imię i e-mail uczestnika,
- datę i godzinę,
- strefę czasową,
- status,
- źródło utworzenia, jeśli aplikacja już to rozróżnia,
- informację, czy przypomnienia zostały wysłane.

#### Wymagane operacje
- sortowanie od najnowszych lub najbliższych,
- filtrowanie po statusie,
- filtrowanie po właścicielu spotkania,
- wejście do szczegółu pojedynczego spotkania,
- ręczna zmiana statusu tam, gdzie potrzebna jest decyzja organizatora.

### 2. Statusy spotkań
Status ma być prosty i deterministyczny.

#### Wymagane statusy bazowe
- Zaplanowane — spotkanie istnieje i termin jeszcze nie minął.
- Odbyło się — organizator potwierdził odbycie lub system ma wiarygodny sygnał zakończenia zgodny z obecną architekturą.
- Odwołane — spotkanie zostało anulowane przed terminem.
- Brak uczestnictwa — termin minął, a organizator oznaczył, że spotkanie się nie odbyło z winy nieobecności.

#### Reguły biznesowe
- Spotkanie nie może jednocześnie mieć statusu „odbyło się” i „brak uczestnictwa”.
- Po odwołaniu spotkania przypomnienia przyszłe nie mogą być dalej wysyłane.
- Po przełożeniu spotkania stary termin musi zostać oznaczony jako zastąpiony lub anulowany zgodnie z obecną logiką domenową, ale dla użytkownika końcowego ma być jasne, który termin jest aktualny.

### 3. Sekwencje przypomnień
Budujemy prosty system przypomnień e-mail. Ma zmniejszać no-show, a nie udawać platformę marketing automation.

#### Minimalna sekwencja przypomnień
- Pierwsze przypomnienie: 24 godziny przed spotkaniem.
- Drugie przypomnienie: 1 godzina przed spotkaniem.

Jeśli obecna infrastruktura harmonogramów jest ograniczona, dopuszczalne jest wdrożenie tylko jednego przypomnienia jako minimum technicznego, ale sprint nie powinien zostać uznany za zamknięty bez planu dojścia do dwóch wiadomości.

#### Treść przypomnienia musi zawierać
- datę i godzinę spotkania,
- strefę czasową,
- nazwę organizatora,
- informację o sposobie spotkania lub miejscu, jeśli już istnieje w modelu,
- link do przełożenia,
- link do anulowania lub kontaktu.

#### Reguły biznesowe
- Przypomnienia nie mogą być wysyłane dla spotkań anulowanych.
- Przypomnienia nie mogą być wysyłane wielokrotnie dla tego samego kroku sekwencji.
- Zmiana terminu spotkania musi przeliczyć harmonogram wysyłki przypomnień.
- Strefa czasowa w treści e-mail musi odpowiadać danym spotkania.

### 4. Przełożenie i anulowanie spotkania
To ma być funkcja ratunkowa przed no-show, a nie dodatkowa komplikacja UX.

#### Wymagania
- Uczestnik z poziomu przypomnienia może przejść do prostego ekranu przełożenia spotkania.
- Nowy termin musi przejść przez standardową walidację dostępności.
- Po przełożeniu system wysyła nowe potwierdzenie.
- Organizator może anulować spotkanie z poziomu panelu.
- Uczestnik po anulowaniu otrzymuje potwierdzenie anulacji.

## Wymagania techniczne

### Frontend
Należy przygotować:
- ekran historii spotkań,
- szczegół spotkania,
- komponent statusu,
- akcje organizatora: oznacz jako odbyło się, oznacz brak uczestnictwa, anuluj,
- ekran przełożenia terminu dostępny z e-maila,
- ekrany potwierdzające powodzenie lub błąd działań użytkownika.

#### Wymagania UX
- Historia musi być czytelna bez wchodzenia w szczegół każdego spotkania.
- Status spotkania ma być widoczny od razu.
- Akcje zmiany statusu nie mogą być ukryte w nieintuicyjnych miejscach.
- Przełożenie terminu musi być możliwe w maksymalnie kilku krokach.

### Backend
Należy dostarczyć logikę dla:
- przechowywania i aktualizacji statusów spotkań,
- harmonogramowania przypomnień,
- bezpiecznego wysyłania przypomnień,
- oznaczania wysłanych kroków sekwencji,
- anulowania zaplanowanych przypomnień po anulowaniu lub przełożeniu spotkania,
- ręcznej zmiany statusu przez organizatora,
- pobierania historii spotkań z filtrami.

### Baza danych
Model danych musi wspierać co najmniej:
- status spotkania,
- historię zmian statusu lub minimalny ślad zmian, jeśli pełna historia nie istnieje,
- zaplanowane przypomnienia,
- wynik wysyłki przypomnienia,
- notatkę organizatora jako element opcjonalny.

Nie należy projektować wielokanałowego silnika kampanii. To byłby klasyczny przerost formy.

### Infrastruktura / zadania asynchroniczne
Jeśli przypomnienia są wysyłane przez zadania harmonogramowane, implementacja musi zapewnić:
- odporność na ponowne uruchomienie procesu,
- idempotencję wysyłki,
- ochronę przed podwójnym wysłaniem tego samego przypomnienia,
- prosty retry dla błędów tymczasowych.

## Zadania implementacyjne

### Zadanie 5.1 — Widok historii spotkań
#### Cel
Pokazać pełną operacyjną listę spotkań z podstawowymi filtrami.

#### Kryteria akceptacji
- Organizator widzi historię spotkań w panelu.
- Każdy rekord ma status, datę, właściciela i uczestnika.
- Dostępne są filtry po statusie.
- Właściciel workspace może zobaczyć spotkania zespołu w zakresie zgodnym z obecnym modelem uprawnień.

### Zadanie 5.2 — Statusy i ręczna zmiana wyniku spotkania
#### Cel
Umożliwić organizatorowi domknięcie operacyjnego cyklu spotkania.

#### Kryteria akceptacji
- Organizator może oznaczyć spotkanie jako odbyło się.
- Organizator może oznaczyć spotkanie jako brak uczestnictwa.
- Status nie może przejść do logicznie sprzecznego stanu.
- Zmiana statusu jest widoczna od razu w historii.

### Zadanie 5.3 — Sekwencje przypomnień e-mail
#### Cel
Zmniejszyć liczbę no-show przez automatyczne przypomnienia.

#### Kryteria akceptacji
- System planuje przypomnienia po utworzeniu spotkania.
- System wysyła przypomnienie 24 godziny przed spotkaniem.
- System wysyła przypomnienie 1 godzinę przed spotkaniem.
- Po anulowaniu spotkania przyszłe przypomnienia są zatrzymywane.
- Po przełożeniu terminu przypomnienia są planowane od nowa.

### Zadanie 5.4 — Przełożenie terminu przez uczestnika
#### Cel
Dać uczestnikowi prostą drogę zmiany terminu zamiast no-show.

#### Kryteria akceptacji
- Link z e-maila prowadzi do ekranu przełożenia.
- Uczestnik może wybrać nowy dostępny termin.
- System zapisuje nowy termin i aktualizuje historię.
- Organizator i uczestnik dostają aktualne potwierdzenie.

### Zadanie 5.5 — Anulowanie spotkania
#### Cel
Umożliwić czyste anulowanie spotkania.

#### Kryteria akceptacji
- Organizator może anulować spotkanie z panelu.
- Status spotkania zmienia się na odwołane.
- Przyszłe przypomnienia nie są dalej wysyłane.
- Uczestnik otrzymuje potwierdzenie anulacji.

## Testy

### Testy funkcjonalne
- Utworzenie spotkania i pojawienie się go w historii.
- Automatyczne zaplanowanie przypomnień.
- Wysłanie przypomnienia 24 godziny przed spotkaniem.
- Wysłanie przypomnienia 1 godzinę przed spotkaniem.
- Przełożenie terminu przez uczestnika.
- Anulowanie spotkania przez organizatora.
- Oznaczenie spotkania jako odbyło się.
- Oznaczenie spotkania jako brak uczestnictwa.

### Testy negatywne
- Próba przełożenia odwołanego spotkania.
- Próba użycia wygasłego lub niepoprawnego linku do przełożenia.
- Próba wielokrotnego wysłania tego samego przypomnienia.
- Próba zmiany statusu przez użytkownika bez uprawnień.

### Testy stref czasowych
- Spotkanie organizatora i uczestnika w różnych strefach czasowych.
- Poprawne wyświetlenie czasu w treści przypomnienia.
- Poprawne przeliczenie harmonogramu przypomnień po zmianie terminu.

## Telemetria i logowanie zdarzeń
Należy rejestrować co najmniej:
- utworzenie spotkania,
- zaplanowanie przypomnienia,
- powodzenie i niepowodzenie wysyłki przypomnienia,
- przełożenie spotkania,
- anulowanie spotkania,
- ręczne oznaczenie statusu,
- otwarcie linku do przełożenia, jeśli obecna polityka prywatności na to pozwala.

## Ryzyka i decyzje
- Główne ryzyko techniczne to duplikacja przypomnień. Wysyłka musi być idempotentna.
- Główne ryzyko produktowe to zbyt skomplikowany przepływ przełożenia. Należy go uprościć.
- Główne ryzyko operacyjne to niejasna definicja „brak uczestnictwa”. W tej wersji decyduje organizator.

## Rezultat biznesowy po sprincie
Po tym sprincie aplikacja zaczyna rozwiązywać problem no-show i daje organizatorowi podstawową kontrolę nad przebiegiem spotkań. To jest użyteczna wartość. Nie prezentacja, nie marketing, tylko realna operacyjność.
