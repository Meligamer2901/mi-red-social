# Entrega para el catedrático

Los secretos (clave de acceso y llave `.pem`) se entregan por un canal privado, no
en este repositorio.

## Datos de la instancia

| Dato | Valor |
|---|---|
| Región | us-east-2 (Ohio) |
| ID de instancia | `i-080caf245240b78e3` |
| IP pública (Elastic IP) | `77.113.123.181` |
| Sitio web | `https://miredsocialweb.duckdns.org` |
| Usuario SSH | `ubuntu` |
| Estado al entregar | Detenida (Stopped) |

## Credenciales entregadas por canal privado

1. **Usuario IAM `catedratico`**: archivo `.csv` con Access key ID y Secret access key.
   Permisos: ver instancias e iniciar/detener solo esta instancia.
2. **Llave SSH** `mi-red-social-key.pem`.

## Iniciar la instancia y revisar

```bash
aws configure            # pegar las claves; región us-east-2; formato json
aws ec2 start-instances --instance-ids i-080caf245240b78e3 --region us-east-2
aws ec2 describe-instances --instance-ids i-080caf245240b78e3 --region us-east-2 \
    --query "Reservations[0].Instances[0].State.Name"
```

Esperar 1-2 minutos y abrir `https://miredsocialweb.duckdns.org`. La aplicación arranca sola (PM2).

Conexión por terminal (opcional):

```bash
ssh -i mi-red-social-key.pem ubuntu@77.113.123.181
pm2 status
```

## Detener la instancia al terminar

```bash
aws ec2 stop-instances --instance-ids i-080caf245240b78e3 --region us-east-2
```

## Desviaciones del enunciado

- Región Ohio (us-east-2) en lugar de N. Virginia, por restricción del plan gratuito.
- Instancia t3.micro en lugar de t2.small (único tipo gratuito); se añadió swap de 2 GB.
- Acceso del catedrático por clave de acceso (CLI), ya que la consola del plan
  gratuito no permite contraseña de consola para usuarios IAM.
- DNS con DuckDNS (gratuito) en lugar de Route 53, con HTTPS de Let's Encrypt.
- El Login con Google usa el Client ID del equipo; los correos que lo prueben deben estar
  agregados como usuarios de prueba. El registro con correo y reCAPTCHA funciona siempre.
