# 🚀 Deployment Guide: Matoshree Clinic EMR on Render + Neon

This guide walks you through deploying **Matoshree Clinic EMR** to **Render** with a **Neon Serverless PostgreSQL** database.

---

## 📋 Overview

- **Hosting**: Render (Web Service - Node.js)
- **Database**: Neon (Serverless PostgreSQL)
- **Region Recommended**: `Singapore` (ap-southeast-1) — lowest latency for Maharashtra/India
- **Estimated Setup Time**: ~5 minutes
- **Cost**: 100% Free Tier compatible on both Render and Neon

---

## Step 1: Create your Neon PostgreSQL Database (2 Mins)

1. Go to [https://neon.tech](https://neon.tech) and sign up / log in (using GitHub, Google, or Email).
2. Click **Create Project**:
   - **Project Name**: `matoshree-clinic`
   - **Postgres Version**: `16` (Default)
   - **Region**: `Asia Pacific (Singapore)` (`ap-southeast-1`)
3. Once the project is created, you will see the **Connection Details** dashboard:
   - Select **Prisma** or **Connection String**.
   - Copy the connection string. It looks like:
     ```
     postgresql://neondb_owner:npg_AbCdEf123456@ep-solitary-snowflake-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
   - **Keep this string ready** — you will use this as `DATABASE_URL` in Step 3.

---

## Step 2: Push Your Project to GitHub

If you haven't already pushed this project to GitHub:

1. Open PowerShell or Terminal in the project directory:
   ```powershell
   git init
   git add .
   git commit -m "feat: Matoshree Clinic EMR production ready with Neon and Render support"
   ```
2. Create a new repository on GitHub (private or public).
3. Link and push:
   ```powershell
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/matoshree-clinic-emr.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deploy on Render

### Option A: Using Render Blueprint (`render.yaml` - Automatic)
1. Go to [https://dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository `matoshree-clinic-emr`.
4. Render will read `render.yaml` automatically.
5. In the Environment Variables prompt:
   - **`DATABASE_URL`**: Paste your Neon PostgreSQL connection string from Step 1.
6. Click **Apply**. Render will automatically build, push database tables, seed initial staff accounts, and deploy!

---

### Option B: Manual Web Service Setup on Render
1. Go to [https://dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Fill in the deployment settings:
   - **Name**: `matoshree-clinic-emr`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm run render:build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: `Free`
5. Click **Advanced** -> **Add Environment Variable**:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require` | Your Neon database string |
   | `NODE_ENV` | `production` | Production mode |
   | `TZ` | `Asia/Kolkata` | Clinic timezone |
   | `NEXT_PUBLIC_CLINIC_TIMEZONE` | `Asia/Kolkata` | Clinic timezone |
   | `SESSION_SECRET` | `matoshree_secure_secret_key_2026_clinic_session` | Any 32+ character random string |
   | `NEXT_PUBLIC_DEMO_MODE` | `false` | Disables demo banner |
6. Click **Create Web Service**.

---

## Step 4: Verification & First Login

Once Render shows **"Live"**:

1. Click on the Render URL (e.g. `https://matoshree-clinic-emr.onrender.com`).
2. Log in with the pre-seeded staff credentials:

| Staff Member | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Dr. Vinod Korale** | Doctor | `dr.vinod@matoshreeclinic.in` | `Matoshree@2026` |
| **Dr. Vaishali Korale** | Doctor | `dr.vaishali@matoshreeclinic.in` | `Matoshree@2026` |
| **Clinic Receptionist** | Receptionist | `reception@matoshreeclinic.in` | `Matoshree@2026` |

3. Open the **Patient Online Booking Portal**:
   - `https://matoshree-clinic-emr.onrender.com/book`
   - Patients can book appointments from any mobile or desktop without login.
   - Booked appointments sync immediately to the clinic software under **OPD & Appointments** and the **Dashboard** tagged with `🌐 Online`.
