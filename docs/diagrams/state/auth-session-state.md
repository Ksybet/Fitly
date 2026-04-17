# State Diagram — Auth Session

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated

    Unauthenticated --> Authenticating: введены email и пароль
    Authenticating --> Authenticated: данные верны
    Authenticating --> Unauthenticated: ошибка авторизации

    Authenticated --> Unauthenticated: выход из аккаунта / токен удалён