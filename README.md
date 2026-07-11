# 🚀 Pulse Chat — Production-Ready Real-Time Chat App

A full-stack, scalable real-time chat application built with the MERN stack + Socket.io + Redis. Supports 50-60+ concurrent users efficiently.

---

## ✨ Features

- 🔐 JWT-based authentication (register/login)
- 💬 One-to-one and group chat
- ⚡ Real-time messaging with Socket.io
- 🟢 Online/offline status & last seen
- ✍️ Typing indicators (debounced)
- ✅ Message status: sent → delivered → seen
- 📎 Media/file uploads via Cloudinary
- 🔔 Real-time notifications + unread count
- 😊 Emoji picker + message reactions
- 🗑️ Message soft-delete
- ♾️ Paginated message history (infinite scroll)
- 👥 Group admin: add/remove members, rename
- 🔍 User search
- 🖼️ Profile management with photo upload
- 📱 Fully responsive (mobile + desktop)
- 📈 Redis adapter for horizontal scaling

---
 
## 🗂️ Project Structure

```
chatapp/
├── server/                   # Node.js + Express backend
│   ├── config/
│   │   ├── cloudinary.js     # Cloudinary + multer setup
│   │   └── redis.js          # Redis + Socket.io adapter
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── chat.controller.js
│   │   ├── message.controller.js
│   │   └── user.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js  # JWT + socket auth
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Chat.model.js
│   │   └── Message.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   ├── message.routes.js
│   │   ├── upload.routes.js
│   │   └── user.routes.js
│   ├── sockets/
│   │   └── socket.js           # All Socket.io event handlers
│   ├── index.js
│   └── package.json
│
└── client/                   # React + Vite frontend
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   ├── chat/
    │   │   │   ├── Sidebar.jsx
    │   │   │   ├── ChatListItem.jsx
    │   │   │   ├── ChatWindow.jsx
    │   │   │   ├── ChatHeader.jsx
    │   │   │   ├── MessageList.jsx
    │   │   │   ├── MessageBubble.jsx
    │   │   │   ├── MessageInput.jsx
    │   │   │   ├── ChatInfoPanel.jsx
    │   │   │   ├── SearchModal.jsx
    │   │   │   ├── GroupModal.jsx
    │   │   │   ├── ProfileModal.jsx
    │   │   │   └── WelcomeScreen.jsx
    │   │   └── common/
    │   │       ├── Avatar.jsx
    │   │       ├── Modal.jsx
    │   │       └── Spinner.jsx
    │   ├── hooks/
    │   │   └── useSocket.js      # Socket lifecycle + Redux integration
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   └── ChatPage.jsx
    │   ├── redux/
    │   │   ├── store.js
    │   │   └── slices/
    │   │       ├── authSlice.js
    │   │       ├── chatSlice.js
    │   │       ├── messageSlice.js
    │   │       └── uiSlice.js
    │   └── utils/
    │       ├── api.js           # Axios instance with JWT interceptor
    │       ├── socket.js        # Socket.io singleton
    │       └── dateUtils.js
    └── package.json
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)
- Redis (local, Upstash, or Redis Cloud)
- Cloudinary account

### 1. Clone & install

```bash
# Install server deps
cd server
npm install

# Install client deps
cd ../client
npm install
```

### 2. Configure environment variables

**Server** — copy `server/.env.example` → `server/.env`:

```env
PORT=5000

MONGO_URI=your_mongodb_atlas_connection_string

JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# Redis Cloud
REDIS_URL=your_redis_cloud_connection_url

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

CLIENT_URL=https://revox-orcin.vercel.app
NODE_ENV=production
```

**Client** — copy `client/.env.example` → `client/.env`:

```env
VITE_API_URL=https://revox-w4wm.onrender.com/api
VITE_SOCKET_URL=https://revox-w4wm.onrender.com
```

### 3. Run

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

Open **http://localhost:5173**

---

## 🗄️ Database Models

### User
| Field | Type | Notes |
|-------|------|-------|
| name | String | required, 2–50 chars |
| email | String | unique, lowercase |
| password | String | bcrypt hashed, not returned by default |
| profilePic | String | Cloudinary URL |
| isOnline | Boolean | socket-managed |
| lastSeen | Date | updated on disconnect |
| socketId | String | current socket ID |

### Chat
| Field | Type | Notes |
|-------|------|-------|
| chatName | String | for groups |
| isGroupChat | Boolean | |
| users | [ObjectId] | ref User |
| groupAdmin | ObjectId | ref User |
| latestMessage | ObjectId | ref Message |
| unreadCount | Map | userId → count |

### Message
| Field | Type | Notes |
|-------|------|-------|
| sender | ObjectId | ref User |
| content | String | text content |
| chat | ObjectId | ref Chat, indexed |
| messageType | enum | text/image/file/audio |
| fileUrl | String | Cloudinary URL |
| seenBy | [ObjectId] | users who've read it |
| deliveredTo | [ObjectId] | users who received it |
| reactions | Array | { user, emoji } |
| isDeleted | Boolean | soft delete |

---

## 🔌 Socket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `setup` | — | Register user as online |
| `join_chat` | `chatId` | Join a chat room |
| `leave_chat` | `chatId` | Leave a chat room |
| `send_message` | `{chatId, content, messageType, fileUrl, fileName}` | Send message |
| `typing` | `{chatId}` | User started typing |
| `stop_typing` | `{chatId}` | User stopped typing |
| `mark_seen` | `{chatId}` | Mark all messages seen |
| `message_delivered` | `{messageId}` | Ack delivery |
| `react_to_message` | `{messageId, emoji, chatId}` | Add/change reaction |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | — | Socket setup confirmed |
| `message_received` | `{message}` | New message in active chat |
| `new_message_notification` | `{message, chat}` | Notification for background chat |
| `typing` | `{chatId, user}` | Someone is typing |
| `stop_typing` | `{chatId, userId}` | Someone stopped typing |
| `user_online` | `{userId, isOnline, lastSeen}` | Online status change |
| `messages_seen` | `{chatId, seenBy}` | Messages were read |
| `message_status_update` | `{messageId, deliveredTo}` | Delivery update |
| `reaction_updated` | `{messageId, reactions}` | Reaction change |

---

## 📡 REST API

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chats` | Access/create 1-1 chat |
| GET | `/api/chats` | Get all user's chats |
| POST | `/api/chats/group` | Create group chat |
| PUT | `/api/chats/group/:id` | Rename group |
| PUT | `/api/chats/group/:id/add` | Add member |
| PUT | `/api/chats/group/:id/remove` | Remove member |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:chatId?page=1` | Paginated messages |
| POST | `/api/messages` | Send message (REST) |
| PUT | `/api/messages/seen` | Mark seen |
| DELETE | `/api/messages/:id` | Soft delete |
| PUT | `/api/messages/:id/react` | Add reaction |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/search?q=query` | Search users |
| GET | `/api/users/:id` | Get user by ID |

### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file to Cloudinary |

---

## 🚀 Deployment

### Backend → Render

1. Push server code to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node index.js`
5. Add all environment variables from `.env`
6. Deploy

### Frontend → Vercel

1. Push client code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Set environment variables:
   - `VITE_API_URL` = your Render backend URL + `/api`
   - `VITE_SOCKET_URL` = your Render backend URL
4. Deploy

### Database → MongoDB Atlas
1. Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create database user + get connection string
3. Whitelist `0.0.0.0/0` (or your server IP) in Network Access

### Redis → Upstash
1. Create free Redis at [upstash.com](https://upstash.com)
2. Copy the `UPSTASH_REDIS_REST_URL` (use the `rediss://` connection string for `REDIS_URL`)

### Media → Cloudinary
1. Create free account at [cloudinary.com](https://cloudinary.com)
2. Copy Cloud Name, API Key, API Secret from dashboard

---

## 📈 Scalability Notes

- **Redis adapter**: Socket.io uses Redis pub/sub so multiple server instances share socket state — horizontal scaling ready
- **Room-based messaging**: Messages broadcast only to relevant chat rooms, not all sockets
- **MongoDB indexes**: `{ chat: 1, createdAt: -1 }` on messages, `{ users: 1 }` on chats
- **Pagination**: 30 messages per page with infinite scroll (load older on scroll up)
- **Typing debounce**: 2s client-side debounce reduces server events significantly
- **Connection efficiency**: Single socket per user, rooms joined lazily

---

## 🔒 Security

- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** with 7-day expiry, verified on every request
- Socket.io auth middleware validates JWT on connection
- **Rate limiting**: 200 req / 15 min per IP
- **Input validation** with express-validator
- **CORS** restricted to client URL
- File upload capped at 10MB
- Sensitive fields (`password`, `socketId`) excluded from API responses

---

## 🔧 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite, Redux Toolkit, Tailwind CSS |
| Realtime | Socket.io v4 |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Cache/Scale | Redis + @socket.io/redis-adapter |
| Auth | JWT + bcryptjs |
| File Storage | Cloudinary |
| Deployment | Vercel (FE), Render (BE), Atlas (DB), Upstash (Redis) |
