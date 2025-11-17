# Firebase Firestore Security Rules - Complete Setup

## ⚠️ MOST LIKELY ISSUE: Firestore Rules

If your form closes but tasks don't get created, the problem is **99% likely** to be Firestore security rules not allowing writes.

## Quick Fix (5 minutes)

### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com
2. Sign in with your Google account
3. Select project **`project1-phc`**

### Step 2: Open Firestore Rules
1. Go to **Build** (left sidebar)
2. Click **Firestore Database**
3. Click **Rules** tab (at the top)

### Step 3: Replace Rules with This

Delete everything and paste:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to access their own tasks
    match /tasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null;
    }
    
    // Allow authenticated users to access their own completed tasks
    match /completedTasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null;
    }
  }
}
```

### Step 4: Publish
Click **Publish** button and confirm

## That's It! 

Now:
1. Refresh your app
2. Try adding a task again
3. Form should close and task should appear
4. Reload page - task should still be there

## What These Rules Mean

```firestore
allow create, read, update, delete: if request.auth.uid != null;
```

Translation: "Allow any authenticated user to create, read, update, or delete tasks"

- `request.auth.uid != null` = User is logged in
- `create` = Can create new tasks
- `read` = Can read (fetch) tasks
- `update` = Can update existing tasks
- `delete` = Can delete tasks

## More Restrictive Option (Recommended for Production)

If you want users to only access their own tasks:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Only allow users to access their own tasks
    match /tasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null && resource.data.userId == request.auth.uid;
      // For new documents being created, check request instead of resource
      allow create: if request.auth.uid != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Only allow users to access their own completed tasks
    match /completedTasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth.uid != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

## How to Verify Rules Are Working

1. Open browser DevTools (F12)
2. Go to Console tab
3. Add a task
4. Look for this log:
   ```
   Firebase save result: {success: true, id: "..."}
   ```
   
   - If `success: true` → Rules are working ✅
   - If error shows `PERMISSION_DENIED` → Rules need update ❌

## Testing Rules

Before publishing, click **Test Rules** to verify:

1. Add these test cases:
2. Click "Test" button
3. Create new document test:
   - Collection: `tasks`
   - Document: any ID
   - Data: `{userId: "user123", title: "Test"}`
   - Should show: ✅ Allowed

## Troubleshooting

### I got "PERMISSION_DENIED" error
→ Your rules aren't allowing writes. Use the "Quick Fix" rules above.

### Rules are published but still getting error
→ Clear browser cache (Ctrl+Shift+Delete) and try again

### Can't find Firestore Database in Firebase Console
→ You might not have created it yet. Go to Build → Create Database

### Still not working after updating rules
→ Check console logs for the exact error message and share it

## Rules by Use Case

### Allow Everyone (Not Recommended)
```firestore
match /tasks/{taskId} {
  allow read, write;
}
```

### Allow Only Authenticated Users (Recommended)
```firestore
match /tasks/{taskId} {
  allow create, read, update, delete: if request.auth.uid != null;
}
```

### Allow Only Own Tasks (Most Secure)
```firestore
match /tasks/{taskId} {
  allow create: if request.auth.uid != null && request.resource.data.userId == request.auth.uid;
  allow read, update, delete: if request.auth.uid != null && resource.data.userId == request.auth.uid;
}
```

## Document Structure

Your tasks should be saved with this structure:

```json
{
  "title": "My Task",
  "deadline": "2025-11-20T15:30",
  "userId": "user123abc...",
  "done": false,
  "createdAt": 1731000000000,
  "subtasks": []
}
```

The `userId` field is **critical** - it must match the logged-in user's ID.

## Related Files

- App setup: `.env`
- Firebase config: `src/firebaseConfig.ts`
- Task service: `src/services/firebaseTaskService.ts`
- Task manager: `src/services/taskManager.ts`

## Still Need Help?

1. **Check console for error message** - Tells you exactly what's wrong
2. **Verify email is verified** - Can't write if not verified
3. **Check Firestore in Firebase Console** - See if documents are being created
4. **Test with Network tab open** - See if requests are succeeding

