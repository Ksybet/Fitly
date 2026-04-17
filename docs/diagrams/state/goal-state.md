# State Diagram — Goal

```mermaid
stateDiagram-v2
    [*] --> Created

    Created --> InProgress: цель сохранена
    Created --> Cancelled: отмена до начала

    InProgress --> Completed: целевое значение достигнуто
    InProgress --> Cancelled: цель отменена пользователем

    Completed --> [*]
    Cancelled --> [*]