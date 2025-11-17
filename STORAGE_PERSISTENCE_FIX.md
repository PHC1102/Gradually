# Storage Not Persistent - Diagnostic Guide

## Problem
Tasks disappear after page reload. Firebase is not persisting data.

## Root Cause Analysis

There are multiple possible causes. Let's diagnose them one by one.

### Possible Cause #1: Firestore Security Rules (Most Likely - 90%)

**Symptom:** Form closes but task doesn't appear in Firestore console

**Fix:** Update Firestore Rules

#### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com
2. Sign in
3. Select your project

#### Step 2: Update Security Rules
1. Click **Build** → **Firestore Database**
2. Click **Rules** tab
3. Replace all rules with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null;
    }
    match /completedTasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null;
    }
  }
}
```

#### Step 3: Publish
Click **Publish** button

#### Step 4: Test
Refresh app and try adding task. Check browser console (F12) for:
- `Task added successfully with ID: ...` = Rules working ✅
- `PERMISSION_DENIED` error = Rules issue ❌

---

### Possible Cause #2: Firebase Configuration

**Symptom:** No error message, but nothing happens

**Check Your Firebase Config:**

File: `src/firebaseConfig.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Verify:**
- All values are filled in ✅
- Project ID is correct ✅
- API Key is correct ✅

---

### Possible Cause #3: User Not Authenticated

**Symptom:** Tasks don't get created, no error in console

**Check Browser Console (F12):**

When adding a task, should see:
```
TaskManager.addTask called with: {...}
Current user: {...}
Creating new task: {...}
```

If you see:
```
No user logged in - cannot add task
```

Then user is NOT authenticated. Solution: Log in first.

---

### Possible Cause #4: Email Not Verified

**Symptom:** Login works but can't add tasks

**Check:**
1. Inbox for verification email
2. Click verification link
3. Try adding task again

Firebase requires **verified email** to write data in production.

---

### Possible Cause #5: Wrong Task Structure

**Symptom:** Task created but can't load it back

**Check Console Output:**

When adding task, should see:
```
Creating new task: {
  id: "1731...",
  title: "My Task",
  deadline: "2025-11-20T15:30",
  subtasks: [],
  done: false,
  createdAt: 1731...,
  userId: "user123abc..." ← CRITICAL
}
```

The `userId` field **must** be present. If missing, data won't load back.

---

## Step-by-Step Diagnostic Checklist

### Step 1: Check Console Logs
```
Open: F12 → Console tab
Add a task
Look for these logs (in order):
```

✅ You should see:
1. `TaskManager.addTask called with: {...}`
2. `Current user: {...}` (shows user object)
3. `Creating new task: {...}` (shows task with userId)
4. `Task added to local state. New tasks array length: 1`
5. `Task saved to Firebase with ID: abc123...` ← OR error

❌ If you see:
- `No user logged in` → User not logged in
- `PERMISSION_DENIED` → Rules issue
- `Firebase operation timeout` → Network issue or database too slow

### Step 2: Check Firebase Console
```
1. Open https://console.firebase.google.com
2. Select your project
3. Click Firestore Database
4. Look for "tasks" collection
5. Should see documents with your task data
```

✅ Documents should look like:
```
Document ID: abc123...
Fields:
  - title: "My Task"
  - deadline: "2025-11-20T15:30"
  - userId: "user123abc..."
  - done: false
  - createdAt: 1731...
  - subtasks: []
```

❌ If collection is empty:
- Task not being created (check console error)
- Rules blocking writes (update rules above)

### Step 3: Test Rules
```
1. In Firebase Console
2. Firestore Database → Rules
3. Click "Test Rules" button
4. Simulate a write:
   - Collection: tasks
   - Document: new
   - Data: {userId: "test-user", title: "test"}
   - Should show: ✅ Allowed
```

---

## Quick Fixes by Symptom

### Symptom: "PERMISSION_DENIED" Error
**Fix:** Update Firestore Rules (use code above)

### Symptom: Form closes but no task in list
**Fix:** Refresh page or wait 2 seconds

### Symptom: Can't see task in Firebase Console
**Checks:**
1. You're in correct project ✅
2. You're looking at "tasks" collection ✅
3. Task has userId field ✅
4. Rules allow reads ✅

### Symptom: Task appears but disappears on reload
**Fixes:**
1. Wait 2-3 seconds before reload (let Firebase finish)
2. Check Firebase console - is task there?
3. If in Firestore - issue is loading, not saving
4. If NOT in Firestore - issue is saving, not loading

### Symptom: "Firebase operation timeout"
**Fixes:**
1. Check internet connection
2. Try again (might be slow)
3. Check Firebase status page

---

## How Data Persistence Works

### Adding Task (Synchronous UI):
```
1. User clicks "Add Task" button
2. Form closes immediately (synchronous)
3. Task appears in list (from local state)
4. Firebase save happens in background
5. If successful: task ID updated
6. If failed: error logged to console
```

### Reloading Page:
```
1. Page loads
2. Auth checks if user logged in
3. If logged in: loadTasks() called
4. Firebase query: get all tasks where userId == currentUser.uid
5. Tasks loaded from Firestore
6. Displayed in list
```

### For Data to Persist:
```
✅ Task must be created in Firestore collection "tasks"
✅ Task must have userId field matching logged-in user
✅ Security rules must allow authenticated user to read
✅ User must have verified email (in production)
```

---

## Required Firestore Rules

### Minimum (For Testing):
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null;
    }
    match /completedTasks/{taskId} {
      allow create, read, update, delete: if request.auth.uid != null;
    }
  }
}
```

This allows any authenticated user to read/write any task.

### Better (Recommended):
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow create: if request.auth.uid != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth.uid != null && resource.data.userId == request.auth.uid;
    }
    match /completedTasks/{taskId} {
      allow create: if request.auth.uid != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth.uid != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

This allows users to only read/write their own tasks.

---

## Testing Persistence

### Test 1: Add and Refresh
```
1. Click "Add Task"
2. Enter: Title="Test", Deadline=tomorrow
3. Click "Add"
4. Form closes, task appears
5. Refresh page (Ctrl+R)
6. Expected: Task still there
7. If task gone: Firestore save failed
```

### Test 2: Check Console
```
1. F12 → Console
2. Add task
3. Look for logs with "Firebase"
4. Should show: "Task added successfully with ID: ..."
5. If error: Check error message
```

### Test 3: Check Firestore Console
```
1. https://console.firebase.google.com
2. Select project
3. Firestore Database
4. Click "tasks" collection
5. Should see your task document
6. Check "userId" field matches your user ID
```

---

## Code Flow for Debugging

When you add a task, here's what should happen:

```
TaskForm.handleSubmit()
  ↓ (Synchronous)
App.handleFormSubmit()
  ↓ (Synchronous)
App.handleAddTask()
  ↓ (Synchronous)
taskManager.addTask()
  ├─ Creates task with userId
  ├─ Adds to local state (task visible immediately)
  └─ Starts Firebase save in background
      └─ addTaskToFirebase()
         └─ Firestore: addDoc(tasksCollection, task)
            ├─ Success: Log "Task added successfully with ID: ..."
            └─ Error: Log "Error adding task to Firebase: ..."
```

If task appears in UI but not in Firestore:
- Issue is in background Firebase save (check error logs)

If task doesn't appear in UI at all:
- Issue is in local state or form submission

---

## Next Steps

1. **Check Firestore Rules** (90% likely issue)
   - Update rules using code above
   - Publish
   - Try adding task again

2. **Check Browser Console** (F12)
   - Look for error messages
   - If PERMISSION_DENIED → Rules issue
   - If no error → Rules working

3. **Check Firebase Console**
   - Verify task document exists
   - Verify userId field is correct
   - Check data structure matches

4. **Test After Fix**
   - Add task
   - Refresh page
   - Task should still be there

---

## Firestore Rules Status

If rules are still wrong, you'll see one of these errors:

```
❌ PERMISSION_DENIED: Missing or insufficient permissions.
```

**Solution:** Update rules (see above)

```
❌ Unauthenticated: Authentication is required.
```

**Solution:** Log in with verified email

```
❌ Invalid argument: Document reference must have an even number of path elements.
```

**Solution:** Check task ID generation (should be automatic)

---

## Summary

**To fix data not persisting:**

1. ✅ Go to Firebase Console
2. ✅ Update Firestore Rules (copy-paste code above)
3. ✅ Publish rules
4. ✅ Refresh app
5. ✅ Try adding task
6. ✅ Check browser console for success message
7. ✅ Refresh page - task should be there

**If still not working:**
1. Check console for error message
2. Share error message in logs
3. Verify Firebase project is correct
4. Verify email is verified

