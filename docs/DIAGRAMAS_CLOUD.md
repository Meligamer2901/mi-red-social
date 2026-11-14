# Diagramas de Cloud Computing

Diagramas de la infraestructura en la nube usada para la entrega (AWS, región Ohio,
us-east-2).

## 1. Topología general

```mermaid
flowchart TB
    U["Usuarios (Internet)"]
    DNS["DuckDNS\nmiredsocialweb.duckdns.org"]
    U --> DNS
    DNS -->|"A → 77.113.123.181 (Elastic IP)"| EIP

    subgraph AWS["Cuenta AWS · región us-east-2 (Ohio)"]
        subgraph VPC["VPC por defecto"]
            subgraph SUB["Subred pública"]
                EIP["Elastic IP"]
                subgraph SG["Security Group launch-wizard-1\nentrada: 22, 80, 443"]
                    EC2["EC2 t3.micro\nUbuntu 24.04 · 1 GB RAM + 2 GB swap\nnginx · Node.js (PM2) · PostgreSQL"]
                end
                EIP --- EC2
            end
        end
        S3[("Bucket S3\nmi-red-social-imagenes-…\ncarpeta post/ y usuarios/")]
        ROLE["Rol IAM de la instancia\nsolo lectura/escritura en este bucket"]
        IAMU["Usuario IAM catedratico\niniciar / detener solo esta instancia"]
    end

    EC2 -->|"HTTPS + credenciales temporales"| S3
    ROLE -. "asociado a" .-> EC2
    IAMU -. "start / stop" .-> EC2
```

## 2. Flujo de una solicitud (del navegador al dato)

```mermaid
sequenceDiagram
    participant N as Navegador
    participant D as DuckDNS
    participant G as nginx (EC2 :443)
    participant A as Node.js (:4000)
    participant P as PostgreSQL
    participant S as S3

    N->>D: ¿IP de miredsocialweb.duckdns.org?
    D-->>N: 77.113.123.181
    N->>G: HTTPS GET /
    G-->>N: frontend React (frontend/dist)
    N->>G: HTTPS POST /api/subir-imagen/:id
    G->>A: proxy http://127.0.0.1:4000
    A->>S: guardar original + 3 transformaciones
    A->>P: guardar claves y metadatos
    A-->>G: JSON con las URLs
    G-->>N: respuesta
    N->>S: GET imagen (URL pública del bucket)
```

## 3. Identidad y permisos (IAM)

```mermaid
flowchart LR
    ROOT["Cuenta raíz\n(propietario)"]
    ROOT --> U1["Usuario IAM: catedratico"]
    ROOT --> R1["Rol: acceso de la EC2 a S3"]

    U1 --> P1["Política catedratico-ec2-start-stop\n· DescribeInstances (ver)\n· Start/StopInstances solo i-080caf245240b78e3"]
    R1 --> P2["Política de la app\n· s3:PutObject / GetObject / DeleteObject / ListBucket\n  solo en el bucket del proyecto"]
    R1 -. "se asocia a" .-> EC2["Instancia EC2"]
```

Principio aplicado: **mínimo privilegio**. El catedrático no puede crear ni borrar recursos, y
la aplicación no guarda claves de acceso en el servidor.

## 4. Ciclo de vida de la instancia para la revisión

```mermaid
stateDiagram-v2
    [*] --> Running: despliegue y pruebas
    Running --> Stopped: el equipo detiene al entregar
    Stopped --> Running: el catedrático ejecuta start-instances
    Running --> Stopped: el catedrático ejecuta stop-instances
    Stopped --> [*]: no se usa Terminate
```

Al estar detenida no se cobra la instancia; se conservan el disco (EBS), la base de datos y la
IP elástica asociada.

## 5. Recursos AWS usados

| Servicio | Recurso | Uso |
|---|---|---|
| EC2 | t3.micro, Ubuntu 24.04 | Aplicación completa |
| EC2 | Elastic IP | IP fija para el dominio |
| EC2 | Security Group | Firewall: 22, 80 y 443 |
| EC2 | Par de claves RSA | Acceso SSH |
| S3 | Bucket de imágenes | Almacén de las fotos |
| IAM | Rol de instancia + política S3 | Acceso a S3 sin claves |
| IAM | Usuario `catedratico` + política | Iniciar/detener la instancia |

## 6. Estimación de costo

Con el plan gratuito de la cuenta (créditos de $100 por 182 días) la entrega no genera cargo
directo. Fuera del plan, el consumo estimado es:

| Concepto | Observación |
|---|---|
| EC2 t3.micro | Se paga por hora encendida; detenida, no cobra cómputo. |
| EBS (disco) | Se cobra aunque la instancia esté detenida (pocos centavos al mes). |
| IPv4 pública / Elastic IP | AWS cobra por hora cada dirección IPv4 pública, esté asociada o no; con el crédito del plan gratuito no se paga. No liberarla mientras se revise el proyecto. |
| S3 | Centavos al mes con el volumen de pruebas. |
