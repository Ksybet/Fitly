# State Diagram — Support Request

```mermaid
stateDiagram-v2
    [*] --> Created

    Created --> InReview: обращение принято в обработку
    InReview --> Resolved: проблема решена
    InReview --> Closed: обращение закрыто без решения

    Resolved --> Closed: обработка завершена

    Closed --> [*]