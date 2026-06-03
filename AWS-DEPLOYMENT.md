# AWS Deployment Guide — MK Store Microservices

Complete guide to deploy all 6 microservices on AWS ECS Fargate with Mumbai (ap-south-1) region.

---

## AWS Resources Created

| Resource | Name | Details |
|---|---|---|
| VPC | microservices-vpc | CIDR: 10.0.0.0/16 |
| Subnet 1 | microservices-public-1a | ap-south-1a, 10.0.1.0/24 |
| Subnet 2 | microservices-public-1b | ap-south-1b, 10.0.2.0/24 |
| Internet Gateway | microservices-igw | Attached to VPC |
| Route Table | microservices-public-rt | Routes 0.0.0.0/0 to IGW |
| ALB Security Group | microservices-alb-sg | Allows HTTP :80 from internet |
| ECS Security Group | microservices-ecs-sg | Allows :3000-3004 internally |
| ECR | microservices/* | 6 repositories |
| ECS Cluster | microservices-cluster | Fargate |
| ALB | microservices-alb | Internet-facing |
| Target Group | microservices-gateway-tg | Port 3000, /health check |
| Secrets Manager | microservices/* | 6 service secrets + kafka cert |
| IAM Role | microservices-task-execution-role | ECR + Secrets Manager access |
| IAM Role | microservices-task-role | CloudWatch access |
| CloudWatch | /microservices/* | 6 log groups |

---

## Resource IDs Reference

```
Account ID:     652063277570
Region:         ap-south-1

VPC:            vpc-0b94672d46fb7ae89
Subnet 1a:      subnet-05b23a8776dc65d60
Subnet 1b:      subnet-0ad32fb1316ddbd4f
IGW:            igw-051c9ef79d53dd0d6
Route Table:    rtb-0c2ed10210e03bb95
ALB SG:         sg-0246004a2d0645cf1
ECS SG:         sg-0b9ead844f5696c02

ALB ARN:        arn:aws:elasticloadbalancing:ap-south-1:652063277570:loadbalancer/app/microservices-alb/ceee352eb3a21437
Target Group:   arn:aws:elasticloadbalancing:ap-south-1:652063277570:targetgroup/microservices-gateway-tg/da90d2bf9e8f5ba7
ALB DNS:        microservices-alb-219360905.ap-south-1.elb.amazonaws.com
```

---

## Public API URL

```
http://microservices-alb-219360905.ap-south-1.elb.amazonaws.com
```

All API requests go to this URL instead of `http://localhost:3000`.

Example:
```
POST http://microservices-alb-219360905.ap-south-1.elb.amazonaws.com/api/auth/login
GET  http://microservices-alb-219360905.ap-south-1.elb.amazonaws.com/api/products
```

---

## ECR Repositories

```
652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/api-gateway
652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/auth-service
652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/product-service
652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/order-service
652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/payment-service
652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/notification-service
```

---

## ECS Services Status

| Service | Port | Status |
|---|---|---|
| api-gateway | 3000 | Running ✅ |
| auth-service | 3001 | Running ✅ |
| product-service | 3002 | Running ✅ |
| order-service | 3003 | Running ✅ |
| payment-service | 3004 | Running ✅ |
| notification-service | — | Pending (Kafka SSL cert issue) |

---

## Deploying a New Version

When you make code changes, follow these steps to deploy to AWS.

### Step 1 — Login to ECR
```powershell
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 652063277570.dkr.ecr.ap-south-1.amazonaws.com
```

### Step 2 — Build and push with timestamp tag
```powershell
$TAG = Get-Date -Format "yyyyMMdd-HHmmss"

# Build and push the changed service (example: auth-service)
docker build --no-cache -t 652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/auth-service:$TAG ./auth-service
docker push 652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/auth-service:$TAG

echo "Tag: $TAG"
```

> **Important:** Always use `--no-cache` to ensure the latest code is picked up. Always use a timestamp tag — never rely on `:latest` as ECS caches it.

### Step 3 — Update task definition JSON
Open the relevant task definition file in `task-definitions/` and update the image tag:
```json
"image": "652063277570.dkr.ecr.ap-south-1.amazonaws.com/microservices/auth-service:YYYYMMDD-HHMMSS"
```

### Step 4 — Register new task definition version
```powershell
aws ecs register-task-definition --cli-input-json file://task-definitions/auth-service-task.json --region ap-south-1
```

### Step 5 — Deploy new version
```powershell
# Use the new version number (check current with describe-task-definition)
aws ecs update-service --cluster microservices-cluster --service auth-service --task-definition auth-service:NEW_VERSION --force-new-deployment --region ap-south-1
```

### Step 6 — Verify deployment
```powershell
aws ecs describe-services --cluster microservices-cluster --region ap-south-1 --services auth-service --query 'services[0].{Running:runningCount,Desired:desiredCount,TaskDef:taskDefinition}' --output table
```

---

## Updating Secrets

When credentials change (DB password, API keys etc):

```powershell
# Update a secret value
aws secretsmanager update-secret --secret-id microservices/auth-service --region ap-south-1 --secret-string file://secrets/auth-secret.json

# Force ECS to pick up new secret (restart the service)
aws ecs update-service --cluster microservices-cluster --service auth-service --force-new-deployment --region ap-south-1
```

No rebuild needed — secrets are injected at container startup, not baked into the image.

---

## Viewing Logs

```powershell
# Get latest log stream for a service
$STREAM = aws logs describe-log-streams --log-group-name /microservices/auth-service --region ap-south-1 --order-by LastEventTime --descending --max-items 1 --query 'logStreams[0].logStreamName' --output text

# View logs
aws logs get-log-events --log-group-name /microservices/auth-service --region ap-south-1 --log-stream-name $STREAM --limit 30 --query 'events[*].message' --output text
```

Or use AWS Console: CloudWatch → Log groups → `/microservices/auth-service` → latest stream.

---

## Checking Service Health

```powershell
# Check all services
aws ecs describe-services --cluster microservices-cluster --region ap-south-1 --services auth-service product-service order-service payment-service notification-service api-gateway --query 'services[*].{Name:serviceName,Running:runningCount,Desired:desiredCount}' --output table

# Health check via ALB
curl http://microservices-alb-219360905.ap-south-1.elb.amazonaws.com/health
```

---

## Secrets Manager Structure

Each service has its own secret at `microservices/<service-name>`:

| Secret Name | Contains |
|---|---|
| microservices/auth-service | DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN |
| microservices/product-service | DATABASE_URL, KAFKA_*, CLOUDINARY_* |
| microservices/order-service | DATABASE_URL, KAFKA_*, PAYMENT_SERVICE_URL |
| microservices/payment-service | DATABASE_URL, RAZORPAY_*, KAFKA_* |
| microservices/notification-service | KAFKA_*, SENDGRID_* |
| microservices/api-gateway | AUTH/PRODUCT/ORDER/PAYMENT_SERVICE_URL |
| microservices/kafka-ca-cert | Aiven Kafka CA certificate content |

---

## Known Issues

### notification-service not starting
**Symptom:** `Running=0`, `ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED`

**Cause:** Notification-service connects to Kafka immediately on startup (unlike other services which connect lazily). The CA cert stored in Secrets Manager has encoding issues when read back.

**Workaround options:**
1. Store ca.pem as base64, decode at runtime in kafka.js
2. Use `rejectUnauthorized: false` in ssl config (less secure)
3. Bake ca.pem directly into the Docker image (not recommended for production)

**Impact:** Email notifications do not fire on AWS. All other services work normally. Notification service works correctly in local Docker.

---

## Scaling a Service

```powershell
# Scale to 2 instances
aws ecs update-service --cluster microservices-cluster --service product-service --desired-count 2 --region ap-south-1

# Scale back to 1
aws ecs update-service --cluster microservices-cluster --service product-service --desired-count 1 --region ap-south-1
```

---

## Stopping All Services (Cost Saving)

```powershell
foreach ($svc in @("api-gateway","auth-service","product-service","order-service","payment-service","notification-service")) {
  aws ecs update-service --cluster microservices-cluster --service $svc --desired-count 0 --region ap-south-1
}
```

## Restarting All Services

```powershell
foreach ($svc in @("auth-service","product-service","order-service","payment-service","notification-service","api-gateway")) {
  aws ecs update-service --cluster microservices-cluster --service $svc --desired-count 1 --region ap-south-1
}
```

---

## Task Definition Files

All task definitions are in `task-definitions/` folder. Each file follows the naming convention `<service-name>-task.json`.

Current versions deployed:
| Service | Task Definition Version |
|---|---|
| api-gateway | :1 |
| auth-service | :1 |
| product-service | :4 |
| order-service | :4 |
| payment-service | :4 |
| notification-service | :6 |

---

## Architecture Diagram

```
Internet
    │
    ▼
ALB (microservices-alb) — port 80
    │
    ▼
API Gateway ECS Task (:3000)
    │  microservices_microservices-network (VPC)
    ├── Auth Service ECS Task (:3001) ──── Neon auth_db
    ├── Product Service ECS Task (:3002) ── Neon product_db + Cloudinary
    ├── Order Service ECS Task (:3003) ──── Neon order_db
    ├── Payment Service ECS Task (:3004) ── Neon payment_db + Razorpay
    └── Notification Service ECS Task ───── SendGrid (email)
                │
                └── All Kafka services connect to Aiven Kafka (ap-south-1)
```
