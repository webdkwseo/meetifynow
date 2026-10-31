# Sprint 4 — Zespół i panel organizatora

## Cel sprintu
Dowiezienie pierwszej wersji pracy zespołowej po stronie organizatora bez wchodzenia w złożoną logikę wspólnej dostępności. Sprint ma zamienić aplikację z narzędzia „dla jednej osoby” w produkt, który może być używany przez mały zespół, ale nadal pozostaje prosty operacyjnie.

## Dlaczego ten sprint istnieje
Po pierwszych trzech sprintach aplikacja powinna już umożliwiać utworzenie linku do rezerwacji, podstawową synchronizację z kalendarzem oraz prosty przepływ umawiania spotkania. To nie wystarcza do sprzedaży do małych firm, które pracują w 2–10 osób i chcą zarządzać spotkaniami z jednego miejsca.

Ten sprint rozwiązuje trzy realne problemy:
1. Organizator chce zaprosić współpracownika do aplikacji bez ręcznego przepisywania danych.
2. Organizator potrzebuje panelu po zalogowaniu, w którym widzi swoje linki, spotkania i członków zespołu.
3. Firma musi rozróżniać właściciela konta od zwykłego członka zespołu, ale bez rozbudowanego systemu ról.

## Zakres sprintu

### Wchodzi do sprintu — zakres krytyczny
- Zapraszanie członków zespołu przez e-mail.
- Akceptacja zaproszenia i dołączenie do workspace po zalogowaniu lub po utworzeniu konta.
- Prosty model ról: właściciel workspace i członek zespołu.
- Panel organizatora po zalogowaniu z sekcjami:
  - przegląd,
  - linki rezerwacyjne,
  - członkowie zespołu,
  - ustawienia konta.
- Możliwość przypisania linku rezerwacyjnego do konkretnego członka zespołu.
- Możliwość włączenia lub wyłączenia linku rezerwacyjnego.
- Widok podstawowych informacji o nadchodzących spotkaniach.

### Wchodzi do sprintu — zakres warunkowy
- Ponowne wysłanie zaproszenia do członka zespołu.
- Anulowanie niewykorzystanego zaproszenia.
- Prosty filtr po statusie członka zespołu: aktywny / oczekujący.
- Możliwość usunięcia członka zespołu z workspace przez właściciela.
- Prosty ekran onboardingowy po pierwszym logowaniu, jeśli użytkownik dołącza z zaproszenia.

## Poza zakresem sprintu
Tego nie implementujemy w tej wersji:
- Wspólna dostępność wielu członków zespołu w jednym linku rezerwacyjnym.
- Zaawansowany system uprawnień, działów, zespołów, hierarchii i audytu enterprise.
- White-label, szablony firmowe, pełne brandowanie firmy na stronach klienta.
- Automatyczne tworzenie pokoi Google Meet lub Zoom przez API dostawców.
- AI, scoring slotów, predykcje no-show.

## Definicja ukończenia sprintu
Sprint jest ukończony wyłącznie wtedy, gdy właściciel workspace może:
1. zalogować się,
2. zaprosić członka zespołu na e-mail,
3. doprowadzić do zaakceptowania zaproszenia,
4. przypisać temu członkowi własny link rezerwacyjny,
5. zobaczyć tego członka oraz jego link w panelu organizatora.

## Wymagania produktowe

### 1. Workspace i członkowie zespołu
Aplikacja musi obsługiwać podstawowy byt „workspace”, który grupuje użytkowników należących do jednej firmy lub jednego właściciela konta.

#### Reguły biznesowe
- Jeden użytkownik może należeć tylko do jednego workspace w tej wersji produktu.
- Workspace ma jednego właściciela.
- Właściciel może zapraszać i usuwać członków zespołu.
- Członek zespołu nie może zapraszać kolejnych użytkowników.
- Członek zespołu może zarządzać tylko własnymi linkami rezerwacyjnymi i własną dostępnością.
- Niewykorzystane zaproszenie ma status oczekujący.
- Zaproszenie po zaakceptowaniu traci możliwość ponownego użycia.
- E-mail zaproszenia musi być unikalny w obrębie aktywnych zaproszeń danego workspace.

#### Minimalne pola danych
Dla workspace należy przechowywać co najmniej:
- nazwę,
- identyfikator właściciela,
- datę utworzenia,
- status aktywności.

Dla członkostwa użytkownika w workspace należy przechowywać co najmniej:
- identyfikator użytkownika,
- identyfikator workspace,
- rolę,
- datę dołączenia,
- status członkostwa.

Dla zaproszenia należy przechowywać co najmniej:
- adres e-mail,
- rolę docelową,
- nadawcę zaproszenia,
- status,
- datę wygaśnięcia,
- token jednorazowy lub równoważny bezpieczny mechanizm akceptacji.

### 2. Przepływ zapraszania
#### Scenariusz główny
1. Właściciel przechodzi do sekcji „Członkowie zespołu”.
2. Wpisuje adres e-mail.
3. System tworzy zaproszenie oczekujące.
4. System wysyła wiadomość e-mail z linkiem do dołączenia.
5. Użytkownik klika link.
6. Jeśli ma konto, loguje się; jeśli nie ma, zakłada konto.
7. Po uwierzytelnieniu zaproszenie zostaje przypisane do użytkownika.
8. Użytkownik zostaje dodany do workspace jako członek zespołu.

#### Scenariusze brzegowe
- Jeśli zaproszenie wygasło, użytkownik widzi komunikat i możliwość kontaktu z właścicielem.
- Jeśli zaproszenie zostało cofnięte, akceptacja nie jest możliwa.
- Jeśli użytkownik jest już członkiem tego workspace, zaproszenie nie może być ponownie wykorzystane.
- Jeśli właściciel wyśle zaproszenie na adres należący do użytkownika z aktywnym kontem poza workspace, system ma umożliwić bezpieczne dołączenie tylko po zalogowaniu.

### 3. Panel organizatora
Panel po zalogowaniu ma być prosty i użyteczny. Nie budujemy pulpitu analitycznego udającego ERP.

#### Sekcja „Przegląd”
Musi zawierać:
- liczbę aktywnych linków rezerwacyjnych,
- liczbę nadchodzących spotkań,
- liczbę oczekujących zaproszeń do zespołu,
- listę najbliższych spotkań z datą, godziną, właścicielem spotkania i statusem.

#### Sekcja „Linki rezerwacyjne”
Musi umożliwiać:
- przegląd wszystkich linków w workspace,
- rozróżnienie, do kogo należy link,
- włączenie i wyłączenie linku,
- przejście do edycji podstawowych ustawień linku.

#### Sekcja „Członkowie zespołu”
Musi umożliwiać:
- dodanie nowego zaproszenia,
- wyświetlenie listy aktywnych członków,
- wyświetlenie oczekujących zaproszeń,
- ponowne wysłanie lub anulowanie zaproszenia,
- usunięcie aktywnego członka przez właściciela.

#### Sekcja „Ustawienia konta”
Musi zawierać co najmniej:
- nazwę wyświetlaną organizatora,
- adres e-mail,
- strefę czasową,
- podstawowe ustawienia domyślne dla linków rezerwacyjnych, jeśli takie istnieją w obecnej aplikacji.

### 4. Przypisanie linków rezerwacyjnych do członka zespołu
Każdy link rezerwacyjny w tej wersji należy do jednej osoby. To istotne ograniczenie i należy je zachować.

#### Reguły biznesowe
- Jeden link rezerwacyjny ma jednego właściciela.
- Spotkanie utworzone przez ten link należy do właściciela linku.
- Dostępność wykorzystywana przy rezerwacji pochodzi wyłącznie od właściciela linku.
- Właściciel workspace może przeglądać linki wszystkich członków zespołu, ale członek zespołu nie widzi linków innych użytkowników.

## Wymagania techniczne

### Frontend
Należy przygotować lub rozbudować:
- chroniony obszar aplikacji po zalogowaniu,
- listę członków zespołu,
- formularz wysyłki zaproszenia,
- ekran akceptacji zaproszenia,
- listę linków rezerwacyjnych z oznaczeniem właściciela,
- komponenty statusów: aktywny, oczekujący, wyłączony.

#### Wymagania UX
- Formularz zaproszenia ma walidować e-mail po stronie klienta i serwera.
- Użytkownik musi zawsze widzieć wynik akcji: zaproszenie wysłane, zaproszenie cofnięte, użytkownik dodany.
- Ekran nie może ukrywać statusów systemu. Jeśli coś nie działa, ma być jasny komunikat i kolejny krok.
- Lista członków zespołu ma być czytelna na desktopie i urządzeniach mobilnych.

### Backend
Należy dostarczyć logikę dla:
- tworzenia workspace dla nowego właściciela, jeśli to nie istnieje po pierwszych sprintach,
- tworzenia i przechowywania zaproszeń,
- walidacji tokenu zaproszenia,
- akceptacji zaproszenia po uwierzytelnieniu,
- przypisywania użytkownika do workspace,
- ograniczenia uprawnień właściciel vs członek,
- listowania członków i zaproszeń,
- anulowania zaproszenia,
- opcjonalnie ponownej wysyłki zaproszenia.

### Baza danych
Należy dodać model danych wspierający:
- workspace,
- członkostwo użytkownika w workspace,
- zaproszenia,
- relację między linkiem rezerwacyjnym a właścicielem linku,
- podstawowy status aktywności linku.

Nie należy wprowadzać modeli pod przyszłe funkcje enterprise, jeśli nie są użyte w tej wersji.

### Bezpieczeństwo
- Tylko właściciel workspace może zarządzać członkami zespołu.
- Członek zespołu nie może odczytać danych innych członków poza tym, co jest konieczne do działania listy w panelu, jeśli taki widok w ogóle dostaje.
- Link akceptacji zaproszenia musi wygasać.
- Nie wolno ujawniać, czy dany e-mail ma konto poza niezbędnym przepływem zaakceptowanego zaproszenia.
- Każdy odczyt i zapis musi być ograniczony do danych danego workspace.

## Zadania implementacyjne

### Zadanie 4.1 — Model workspace
#### Cel
Dodać pojęcie workspace i powiązać z nim użytkowników oraz linki rezerwacyjne.

#### Kryteria akceptacji
- Nowy właściciel po rejestracji ma aktywny workspace.
- Istniejący użytkownik po migracji lub pierwszym logowaniu ma poprawnie przypisany workspace albo czytelny fallback migracyjny.
- Link rezerwacyjny można przypisać do konkretnego użytkownika w obrębie workspace.

### Zadanie 4.2 — Zaproszenia e-mail
#### Cel
Umożliwić zapraszanie członków zespołu przez e-mail.

#### Kryteria akceptacji
- Właściciel może wysłać zaproszenie na poprawny adres e-mail.
- System odrzuca duplikat aktywnego zaproszenia na ten sam adres w tym samym workspace.
- Zaproszenie trafia na listę oczekujących.
- Zaproszony użytkownik może dołączyć do workspace.

### Zadanie 4.3 — Lista członków zespołu
#### Cel
Pokazać aktywnych członków i oczekujące zaproszenia.

#### Kryteria akceptacji
- Właściciel widzi listę aktywnych członków.
- Właściciel widzi listę oczekujących zaproszeń.
- Statusy są spójne z backendem.
- Właściciel może anulować oczekujące zaproszenie.

### Zadanie 4.4 — Panel organizatora
#### Cel
Dostarczyć użyteczny panel po zalogowaniu.

#### Kryteria akceptacji
- Panel zawiera przegląd, linki, członków i ustawienia.
- Dane w sekcji przegląd są pobierane z backendu i nie są statyczne.
- Użytkownik widzi najbliższe spotkania i aktywne linki.

### Zadanie 4.5 — Uprawnienia i izolacja danych
#### Cel
Zamknąć dostęp do danych według roli i workspace.

#### Kryteria akceptacji
- Członek zespołu nie ma dostępu do akcji właściciela.
- Użytkownik nie może odczytać danych z innego workspace.
- Testy autoryzacji pokrywają podstawowe nadużycia.

## Testy

### Testy funkcjonalne
- Wysłanie zaproszenia przez właściciela.
- Akceptacja zaproszenia przez nowego użytkownika.
- Akceptacja zaproszenia przez istniejącego użytkownika.
- Anulowanie oczekującego zaproszenia.
- Usunięcie aktywnego członka zespołu.
- Przypisanie linku rezerwacyjnego do członka zespołu.

### Testy negatywne
- Ponowne użycie wygasłego zaproszenia.
- Próba wysłania zaproszenia przez członka zespołu.
- Próba odczytu danych innego workspace.
- Próba użycia niepoprawnego lub zmodyfikowanego tokenu zaproszenia.

### Testy UX
- Komunikat o błędnym e-mailu.
- Komunikat o wygasłym zaproszeniu.
- Komunikat o powodzeniu po dołączeniu do workspace.

## Telemetria i logowanie zdarzeń
Należy rejestrować co najmniej:
- utworzenie workspace,
- wysłanie zaproszenia,
- ponowną wysyłkę zaproszenia,
- anulowanie zaproszenia,
- zaakceptowanie zaproszenia,
- usunięcie członka zespołu,
- przypisanie linku do właściciela.

Telemetria ma służyć diagnozie i analizie adopcji. Nie rozbudowujemy jej do pełnego systemu audytowego.

## Ryzyka i decyzje
- Największe ryzyko to rozlanie się prostego modelu ról w system pół-enterprise. Tego nie robimy.
- Największe ryzyko techniczne to niepełna izolacja danych między workspace. To musi być zamknięte na poziomie backendu i reguł dostępu.
- Największe ryzyko UX to niejasny przepływ akceptacji zaproszenia. Ekrany muszą być jednoznaczne.

## Rezultat biznesowy po sprincie
Po ukończeniu sprintu można pokazać aplikację małej firmie jako narzędzie dla zespołu, a nie tylko dla jednej osoby. To zwiększa użyteczność, ale nie komplikuje jeszcze produktu logiką wspólnej dostępności.
