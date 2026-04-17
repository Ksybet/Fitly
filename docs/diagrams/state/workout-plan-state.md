# State Diagram — Workout Plan

```mermaid
stateDiagram-v2
    [*] --> Scheduled: дата и время выбраны

    Scheduled --> Completed: тренировка выполнена
    Scheduled --> Cancelled: отменена пользователем

    Completed --> [*]
    Cancelled --> [*]