# State Diagram — Export Request

```mermaid
stateDiagram-v2
    [*] --> Created

    Created --> Processing: начато формирование файла
    Processing --> Ready: файл подготовлен
    Processing --> Failed: ошибка генерации

    Ready --> [*]
    Failed --> [*]