# 💳 Configuração do Asaas - DeskFlow

## O que é o Asaas?

Asaas é uma fintech brasileira especializada em cobranças e assinaturas. É a escolha perfeita para SaaS brasileiros porque:

✅ **Suporte nativo a assinaturas recorrentes** (mensais/anuais)
✅ **Múltiplas formas de pagamento**: Cartão, Boleto e PIX
✅ **Taxas competitivas**: 2,49% + R$0,10 (cartão), R$2,49 (boleto/PIX)
✅ **API moderna** e bem documentada
✅ **Sandbox gratuito** para testes
✅ **Usado por grandes empresas**: ContaAzul, Gympass, Hotmart

---

## 🚀 Passo a Passo para Configurar

### 1. Criar Conta no Asaas

1. Acesse: https://www.asaas.com
2. Clique em **"Começar Grátis"**
3. Preencha seus dados (CPF/CNPJ necessário)
4. Verifique sua conta por email

### 2. Obter API Key

1. Faça login no painel do Asaas
2. Clique em **"Configurações"** (canto superior direito)
3. Vá em **"Integrações"** → **"API"**
4. Clique em **"Gerar Nova API Key"**
5. **Copie e guarde** - só aparece uma vez!

### 3. Configurar Webhook (Opcional, mas recomendado)

1. No painel Asaas, vá em **"Configurações"** → **"Webhooks"**
2. Clique em **"Adicionar Webhook"**
3. Preencha:
   - **URL**: `https://seu-backend.com/api/billing/webhook`
   - **Versão da API**: 3
   - **Eventos**:
     - ✅ PAYMENT_RECEIVED
     - ✅ PAYMENT_CONFIRMED
     - ✅ PAYMENT_OVERDUE
     - ✅ SUBSCRIPTION_CREATED
     - ✅ SUBSCRIPTION_UPDATED
     - ✅ SUBSCRIPTION_CANCELLED
4. Copie o **Webhook Secret** e guarde

### 4. Configurar Variáveis de Ambiente

No seu arquivo `.env` (backend):

```bash
# Asaas (Pagamentos)
ASAAS_API_KEY=$aact_YOUR_API_KEY_HERE
ASAAS_WEBHOOK_SECRET=your-webhook-secret-here
```

⚠️ **IMPORTANTE**: 
- Use a **API Key de Sandbox** para testes
- Use a **API Key de Produção** apenas quando for publicar
- Nunca compartilhe sua API Key

---

## 🧪 Testando no Sandbox

O Asaas tem um ambiente de testes (sandbox) gratuito:

### API Sandbox:
```
https://sandbox.asaas.com/api/v3
```

### Cartões de Teste:
```
✅ Sucesso: 4242 4242 4242 4242
❌ Recusado: 4000 0000 0000 0002
```

### Datas de Validade:
```
Qualquer data futura (ex: 12/2025)
```

### CVC:
```
Qualquer número de 3 dígitos (ex: 123)
```

### CPF de Teste:
```
111.444.777-35
```

---

## 💰 Preços dos Planos Configurados

```
Plano Pro:        R$ 29,90/mês
Plano Enterprise: R$ 99,90/mês
```

### Taxas Asaas (por transação):

| Método | Taxa |
|--------|------|
| Cartão de Crédito | 2,49% + R$0,10 |
| Boleto Bancário | R$2,49 |
| PIX | R$0,99 |

---

## 📊 Fluxo de Pagamento

```
1. Usuário clica em "Fazer Upgrade"
   ↓
2. Sistema cria cliente no Asaas
   ↓
3. Sistema cria assinatura no Asaas
   ↓
4. Redireciona para página de pagamento Asaas
   ↓
5. Usuário escolhe: Cartão / Boleto / PIX
   ↓
6. Usuário completa pagamento
   ↓
7. Asaas envia webhook "PAYMENT_RECEIVED"
   ↓
8. Sistema ativa o plano automaticamente
   ↓
9. Usuário recebe acesso às features do plano
```

---

## 🔄 Ciclo de Vida da Assinatura

### Estados:

- **trialing** - Período de teste (14 dias)
- **active** - Pagamento confirmado, plano ativo
- **past_due** - Pagamento atrasado
- **canceled** - Assinatura cancelada

### Renovação Automática:

- O Asaas cobra automaticamente todo mês
- Se o pagamento falhar, muda para "past_due"
- Após 3 tentativas, cancela automaticamente

---

## 🛠️ Troubleshooting

### Erro: "API Key inválida"
```
Solução: Verifique se a API Key está correta e completa
```

### Erro: "Cliente já existe"
```
Solução: Normal, o sistema reutiliza clientes existentes
```

### Webhook não chega
```
Solução 1: Se estiver testando localmente, exponha o backend com ngrok (veja `NGROK.md`)
Solução 2: Verifique se a URL está pública (não localhost)
Solução 3: Verifique se o SSL está válido (HTTPS)
Solução 4: Teste manualmente via Postman
```

### Plano não ativa após pagamento
```
Solução 1: Verifique logs do webhook
Solução 2: Confirme se o webhook está configurado corretamente
Solução 3: Verifique se externalReference está sendo enviado
```

---

## 📚 Links Úteis

- **Documentação API**: https://asaasv3.docs.apiary.io
- **Painel Sandbox**: https://sandbox.asaas.com
- **Painel Produção**: https://www.asaas.com
- **Suporte**: suporte@asaas.com

---

## ✅ Checklist para Ir ao Ar

- [ ] Conta Asaas verificada (CPF/CNPJ confirmado)
- [ ] API Key de Produção gerada
- [ ] Webhook configurado com URL pública
- [ ] SSL/HTTPS ativo no backend
- [ ] Testes realizados no Sandbox
- [ ] Preços dos planos revisados
- [ ] Termos de Uso e Política de Privacidade atualizados
- [ ] Suporte ao cliente configurado

---

## 🎉 Pronto!

Seu DeskFlow agora pode receber pagamentos de clientes brasileiros via Cartão, Boleto e PIX!

**Próximo passo**: Configurar o frontend para mostrar as opções de pagamento
