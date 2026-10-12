# Vercel Deployment Guide

## Required Environment Variables

Set these in your Vercel dashboard under Project Settings → Environment Variables:

### Database
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/your-database?retryWrites=true&w=majority
```

### Authentication (NextAuth.js)
```
AUTH_SECRET=your-super-secret-key-minimum-32-characters-long
AUTH_URL=https://your-app.vercel.app
```

### Email Service (Resend)
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM=Your App <noreply@yourdomain.com>
```

### File Upload (Cloudinary)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_PRESET=your-upload-preset
```

### Cron Jobs
```
CRON_SECRET=your-cron-secret-for-webhook-protection
```

## Deployment Steps

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Set Environment Variables**: Add all variables listed above in Vercel dashboard
3. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `pnpm build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `pnpm install --frozen-lockfile` (auto-detected)

4. **Deploy**: Vercel will automatically deploy on push to main branch

## Vercel Configuration Features

- ✅ **Optimized Build**: Standalone output for faster cold starts
- ✅ **Security Headers**: Automatic security headers in production  
- ✅ **Image Optimization**: WebP/AVIF format support
- ✅ **Cron Jobs**: Automated deadline notifications every 6 hours
- ✅ **Function Timeouts**: 10s max duration for API routes
- ✅ **Edge Regions**: Deployed to East US (iad1) for optimal performance

## Post-Deployment

1. **Seed Database**: Run the seed script manually or via API call to `/api/seed`
2. **Test Login**: Use the test credentials:
   - Admin: `admin@lms.dev` / `admin1234`
   - Mentor: `mentor@lms.dev` / `mentor1234`  
   - Student: `student@lms.dev` / `student1234`

3. **Configure Cron**: The deadline notification cron will run automatically

## Troubleshooting

### Build Errors
- Ensure all environment variables are set
- Check that MongoDB connection string is correct
- Verify Cloudinary credentials are valid

### Runtime Errors
- Check Vercel function logs
- Ensure AUTH_URL matches your deployment URL
- Verify database connectivity

## Performance Optimizations

The app is configured with:
- Server-side rendering where beneficial
- Automatic image optimization
- Compressed responses
- Edge caching for static assets
- Optimized bundle splitting