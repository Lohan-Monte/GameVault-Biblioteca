# 🎮 GameVault — Biblioteca Online de Videogames

Plataforma inspirada no Metacritic para descobrir e avaliar videogames.
**Stack**: React 18 + Firebase (Auth, Firestore, Storage, Hosting)

---

## Estrutura de arquivos

```
src/
  firebase.js     ← Configuração do Firebase (edite com suas credenciais)
  services.js     ← Todas as operações com Firebase (Auth, Firestore, Storage)
  App.jsx         ← Aplicação React completa

firestore.rules         ← Regras de segurança do Firestore
firestore.indexes.json  ← Índices compostos necessários
storage.rules           ← Regras de segurança do Storage
firebase.json           ← Configuração do Firebase Hosting
```

---

## Setup passo a passo

### 1. Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. **Adicionar projeto** → siga o assistente
3. Ative o **Google Analytics** (opcional)

---

### 2. Ativar Authentication

1. Vá em **Authentication → Sign-in method**
2. Ative **Google** como provedor
3. Adicione seus domínios autorizados (localhost está habilitado por padrão)

---

### 3. Criar Firestore Database

1. Vá em **Firestore Database → Criar banco de dados**
2. Escolha **modo de produção** (as regras já estão no `firestore.rules`)
3. Região: `southamerica-east1` (São Paulo)

---

### 4. Ativar Firebase Storage

1. Vá em **Storage → Começar**
2. Use as regras padrão (serão substituídas pelo deploy)
3. Região: `southamerica-east1`

---

### 5. Obter credenciais e configurar

1. **Configurações do projeto → Seus aplicativos → Web → Adicionar app**
2. Copie o objeto `firebaseConfig`
3. Abra `src/firebase.js` e substitua os valores `YOUR_*`:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "meu-projeto.firebaseapp.com",
  projectId: "meu-projeto",
  storageBucket: "meu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

### 6. Instalar dependências e rodar local

```bash
npm install
npm start
```

Acesse [http://localhost:3000](http://localhost:3000)

---

### 7. Deploy das regras e índices

```bash
# Instalar Firebase CLI (uma vez)
npm install -g firebase-tools

# Login e seleção do projeto
firebase login
firebase use --add   # selecione seu projeto

# Deploy das regras de segurança e índices
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

### 8. Criar o primeiro Super Admin

Após fazer login com Google pela primeira vez:

1. Vá ao **Firestore Console**
2. Acesse a coleção `users`
3. Encontre o documento com seu UID
4. Edite o campo `role` para `"superadmin"`

Pronto. Agora você tem acesso total ao painel administrativo.

---

### 9. Deploy da aplicação (opcional)

```bash
npm run build
firebase deploy --only hosting
```

---

## Permissões do sistema

| Ação | Usuário | Admin | Super Admin |
|------|---------|-------|-------------|
| Ver jogos | ✅ | ✅ | ✅ |
| Avaliar jogo (logado) | ✅ | ✅ | ✅ |
| Editar própria avaliação | ✅ | ✅ | ✅ |
| Criar/editar/excluir jogo | ❌ | ✅ | ✅ |
| Excluir qualquer avaliação | ❌ | ✅ | ✅ |
| Listar/banir usuários | ❌ | ✅ | ✅ |
| Promover usuário a admin | ❌ | ✅ | ✅ |
| Rebaixar/remover admin | ❌ | ❌ | ✅ |
| Ativar/desativar avaliações por jogo | ❌ | ✅ | ✅ |

---

## Estrutura do Firestore

```
/games/{gameId}
  title: string
  image: string (URL)
  description: string
  category: string
  releaseYear: number
  developer: string
  publisher: string
  platforms: string[]
  reviewsEnabled: boolean
  createdAt: timestamp

/reviews/{reviewId}
  gameId: string
  userId: string
  userName: string
  userPhoto: string | null
  rating: number (1-5)
  platform: "PC" | "PS5" | "Xbox"
  text: string
  createdAt: timestamp
  updatedAt?: timestamp

/users/{userId}
  name: string
  email: string
  photo: string | null
  role: "user" | "admin" | "superadmin"
  banned: boolean
  createdAt: timestamp
```

---

## Observações importantes

- **CORS no Storage**: se tiver problemas com upload de imagens, configure o CORS no bucket via `gsutil`
- **Índices**: o Firestore pode pedir para criar índices na primeira execução de queries compostas — siga o link no erro do console
- **Domínio autorizado**: para deploy em domínio próprio, adicione em Authentication → Settings → Authorized domains
