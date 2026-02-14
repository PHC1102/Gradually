# Task Management App

Ứng dụng quản lý công việc theo nhóm với hỗ trợ tổ chức, dự án và realtime sync.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Firebase (Firestore, Authentication)
- **State:** Zustand

## Tính năng

- 🔐 **Xác thực:** Đăng ký/đăng nhập với xác minh email
- 🏢 **Tổ chức:** Tạo và quản lý tổ chức, mời thành viên
- 📁 **Dự án:** Tạo nhiều dự án trong mỗi tổ chức
- ✅ **Task:** Tạo, sửa, xóa task với subtasks
- 📋 **Board View:** Kanban-style board (Todo/In Progress/Done)
- 📅 **Calendar View:** Xem task theo lịch
- 📊 **Analysis View:** Phân tích tiến độ công việc
- 🔔 **Thông báo:** Nhắc nhở deadline
- 🔄 **Realtime:** Đồng bộ dữ liệu realtime giữa các thành viên

## Cài đặt

```bash
# Cài dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build
```

## Cấu trúc thư mục

```
src/
├── components/     # React components
│   ├── org/        # Organization components
│   └── project/    # Project components
├── contexts/       # React contexts (Auth)
├── pages/          # Page components
├── services/       # Firebase services & business logic
├── store/          # Zustand stores
├── utils/          # Utility functions
└── types.ts        # TypeScript types
```

## Firebase Setup

1. Tạo project trên [Firebase Console](https://console.firebase.google.com/)
2. Bật Authentication với Email/Password
3. Tạo Firestore database
4. Copy config vào `src/firebaseConfig.ts`
5. Deploy rules từ `FIRESTORE_RULES.rules`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

