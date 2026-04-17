# State Diagram — Achievement

```mermaid
stateDiagram-v2
    [*] --> Locked

    Locked --> InProgress: начат прогресс по условию
    InProgress --> Earned: условие выполнено

    Earned --> [*]