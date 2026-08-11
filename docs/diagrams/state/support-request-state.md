# State Diagram — Support Request

```mermaid
stateDiagram-v2
    [*] --> Created

    Created --> InReview: обращение принято в обработку
    Created --> Closed: обращение закрыто без обработки
    InReview --> Resolved: проблема решена
    InReview --> Closed: обращение закрыто без решения

    Resolved --> InReview: обращение возвращено в обработку
    Resolved --> Closed: обработка завершена

    Closed --> [*]
