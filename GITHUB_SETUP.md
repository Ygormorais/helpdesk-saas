# 🚀 Guia GitHub - HelpDesk SaaS

## Passo 1: Criar repositório no GitHub

1. Acesse [github.com](https://github.com)
2. Clique em **"+"** → **"New repository"**
3. Preencha:
   - **Repository name**: `helpdesk-saas`
   - **Description**: Sistema SaaS de Help Desk com React, Node.js, TypeScript e MongoDB
   - **Visibility**: Public (recomendado para portfólio)
   - ✅ **Add a README file**: NÃO Marque (já temos)
   - ✅ **Add .gitignore**: NÃO Marque (já temos)
   - ✅ **Choose a license**: MIT (recomendado)
4. Clique em **"Create repository"**

---

## Passo 2: Inicializar Git local

```bash
# Navegue até a pasta do projeto
cd C:\Users\Ygor\projetos\opencode

# Inicialize o Git
git init

# Configure seu nome e email (se ainda não configurou)
git config user.name "Seu Nome"
git config user.email "seu@email.com"
```

---

## Passo 3: Adicionar arquivos e commitar

```bash
# Adicionar todos os arquivos
git add .

# Verificar status
git status

# Criar commit inicial
git commit -m "feat: HelpDesk SaaS v1.0

✅ Módulos implementados:
- Sistema de autenticação JWT com multi-tenancy
- CRUD completo de tickets com SLA
- Categorias e comentários
- Base de conhecimento (KB)
- Dashboard com métricas e gráficos
- Webhooks para integrações
- Sistema de convites por email
- Audit log de ações
- Configurações por tenant
- Painel admin completo

🛠 Tech Stack:
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Node.js + Express + TypeScript + MongoDB
- Tests: Vitest + React Testing Library
- CI/CD: GitHub Actions + Docker

📦 Features:
- Tickets com workflow completo
- Artigos com Markdown
- Relatórios e analytics
- Team management
- Notificações por email
- Upload de arquivos (S3/local)
- API Documentation (Swagger)

🎯 Ideal para portfólio fullstack developer"

```

---

## Passo 4: Conectar com GitHub e fazer push

### Opção A: Usando HTTPS (mais fácil)

```bash
# Adicione o remote (substitua SEU-USERNAME)
git remote add origin https://github.com/SEU-USERNAME/helpdesk-saas.git

# Faça push para a branch main
git branch -M main
git push -u origin main
```

### Opção B: Usando SSH (mais seguro)

```bash
# Gere uma chave SSH se ainda não tiver
ssh-keygen -t ed25519 -C "seu@email.com"

# Copie a chave pública para GitHub
cat ~/.ssh/id_ed25519.pub
# Cole em: GitHub → Settings → SSH and GPG keys → New SSH key

# Adicione o remote SSH
git remote add origin git@github.com:SEU-USERNAME/helpdesk-saas.git

# Faça push
git branch -M main
git push -u origin main
```

---

## Passo 5: Verificar no GitHub

1. Acesse `https://github.com/SEU-USERNAME/helpdesk-saas`
2. Verifique se todos os arquivos estão lá
3. ✅ O README.md deve estar visível na página inicial

---

## Comandos Git Úteis

```bash
# Verificar status
git status

# Ver diferenças
git diff

# Adicionar arquivo específico
git add nome-do-arquivo

# Commitar mudanças
git commit -m "mensagem do commit"

# Ver histórico
git log --oneline

# Criar nova branch
git checkout -b feature/nova-feature

# Mudar de branch
git checkout nome-da-branch

# Baixar mudanças do GitHub
git pull origin main

# Ver branches remotas
git branch -a
```

---

## Estrutura do Repositório

```
helpdesk-saas/
├── .github/workflows/ci.yml     # CI/CD Pipeline
├── backend/                      # Backend API
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── frontend/                     # Frontend React
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── docker-compose.yml            # Docker Compose
├── .gitignore
├── README.md                    # Documentação principal
├── DEPLOY.md                    # Guia de deploy
└── LICENSE                      # MIT License
```

---

## Configurar GitHub Actions (CI/CD)

O workflow já está configurado em `.github/workflows/ci.yml`. 

Para ativar:

1. Acesse **Settings** → **Actions** → **General**
2. Selecione **"Allow all actions and reusable workflows"**
3. Clique em **Save**

O pipeline vai rodar automaticamente a cada push!

---

## Próximos Passos após o Push

### 1. Configure Topics (Tags)
No GitHub, adicione topics:
- `react`
- `nodejs`
- `typescript`
- `mongodb`
- `express`
- `fullstack`
- `saas`
- `helpdesk`

### 2. Adicione Descrição
- ✅ Marque linguagens utilizadas
- ✅ Adicione descrição do projeto
- ✅ Configure website (depois do deploy)

### 3. Configure GitHub Pages (opcional)
Para documentação automática:
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: docs / (root)
4. Salve

### 4. Star & Watch
- Peça para amigos darem ⭐ star no repo!
- Configure releases para versões

---

## Estrutura de Commits (Conventional Commits)

```bash
# Tipo: feat, fix, docs, style, refactor, test, chore

# Novo recurso
git commit -m "feat: adicionar sistema de notificações"

# Correção de bug
git commit -m "fix: corrigir erro de login"

# Documentação
git commit -m "docs: atualizar README de deploy"

# Atualização de dependências
git commit -m "chore: atualizar dependências"

# Melhoria de código
git commit -m "refactor: otimizar query de tickets"
```

---

## Problemas Comuns

### ❌ "Everything up-to-date"
**Solução**: Você está na branch errada ou não fez commit.
```bash
git status
git add .
git commit -m "mensagem"
git push
```

### ❌ "Permission denied"
**Solução**: Configure SSH ou use token HTTPS.
```bash
# Para HTTPS com token:
git remote set-url origin https://ghp_TOKEN@github.com/USERNAME/REPO.git
```

### ❌ "Merge conflict"
**Solução**: Resolva os conflitos manualmente.
```bash
git status
# Edite os arquivos com conflitos
git add .
git commit -m "fix: resolver conflitos de merge"
```

---

## ✅ Checklist Final

- [ ] Repositório criado no GitHub
- [ ] SSH/HTTPS configurado
- [ ] Todos os arquivos commitados
- [ ] Push realizado com sucesso
- [ ] README.md visível
- [ ] License incluída
- [ ] GitHub Actions ativado
- [ ] Topics adicionados
- [ ] Descrição preenchida

---

## 📚 Recursos Adicionais

- [Documentação Git](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Markdown Guide](https://www.markdownguide.org/)

---

**🎉 Seu projeto HelpDesk SaaS está no ar no GitHub!**

Compartilhe o link nas redes sociais e no LinkedIn para impressionar recrutadores!
