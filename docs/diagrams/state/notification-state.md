# State Diagram — Notification

```mermaid
stateDiagram-v2
    [*] --> Created

    Created --> Scheduled: время отправки назначено
    Scheduled --> Sent: уведомление отправлено
    Scheduled --> Cancelled: режим не беспокоить / уведомление отключено

    Sent --> Read: пользователь открыл уведомление

    Read --> [*]
    Cancelled --> [*]