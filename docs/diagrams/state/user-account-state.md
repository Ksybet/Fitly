# State Diagram — User Account

```mermaid
stateDiagram-v2
    [*] --> Active: успешная регистрация

    Active --> PasswordRecovery: запрос на восстановление пароля
    PasswordRecovery --> Active: пароль успешно изменен

    Active --> Deleted: удаление аккаунта
    Deleted --> [*]