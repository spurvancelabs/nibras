# Test Login Credentials

You can now test the LMS application with the following seeded users:

## Test Accounts

1. **Admin User**
   - Email: `admin@lms.dev`
   - Password: `admin1234`
   - Role: Admin

2. **Mentor User**
   - Email: `mentor@lms.dev`
   - Password: `mentor1234`
   - Role: Mentor

3. **Student User**
   - Email: `student@lms.dev`
   - Password: `student1234`
   - Role: Student

## How to Test

1. Visit http://localhost:3000
2. Click "Go to Login" button
3. Use any of the credentials above
4. You should be redirected to the dashboard after successful login

## Application URLs

- Homepage: http://localhost:3000
- Login: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard (requires authentication)