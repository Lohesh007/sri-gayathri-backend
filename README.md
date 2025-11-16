🛍️ Sri Gayathri Fancy & Religious – Full-Stack eCommerce Website

A complete full-stack eCommerce platform built for the Sri Gayathri Fancy & Religious Store in Velankanni, Tamil Nadu. This project includes product browsing, categories, cart, checkout, authentication, admin dashboard, image uploads, orders, payments, and mobile-friendly UI.

This is a full MERN stack application:

Frontend: React + Netlify Hosting

Backend: Node.js + Express + MongoDB + Render Hosting

Payments: Razorpay

Email Services: Nodemailer (Gmail)

Authentication: JWT + Email Verification + Password Reset

🌐 Live Demo Frontend (Netlify):

🔗 https://your-frontend-name.netlify.app

Backend API (Render):

🔗 https://your-backend-name.onrender.com

📌 Features 🛒 Customer Features

Browse products by categories & subcategories

View product details

Add items to cart

Checkout & place orders

Razorpay online payment

View order history

Edit profile

Forgot password (email reset link)

Email verification during signup

Fully mobile responsive

🔐 Authentication Features

Register user with verification email

Login using email or mobile number

JWT-based auth

Update profile info

Password reset using email link

🛠️ Admin Features

Admins are auto-recognized based on email + mobile combination.

Admin panel includes:

Add new products

Edit/delete existing products

Upload images to Cloudinary

View all orders

Change order status

Filter/search products quickly

🏗️ Full Project Structure project-root/ │ ├── backend/ │ ├── config/ │ ├── controllers/ │ ├── middleware/ │ ├── models/ │ ├── routes/ │ ├── utils/ │ ├── .gitignore │ ├── package.json │ ├── server.js │ └── README.md (optional) │ └── frontend/ ├── public/ ├── src/ │ ├── assets/ │ ├── components/ │ ├── context/ │ ├── pages/ │ ├── styles/ │ ├── App.js │ └── index.js ├── .gitignore ├── package.json ├── netlify.toml (optional) └── README.md (optional)

⚙️ Technologies Used Frontend

React.js

React Router

Context API

Axios

Toastify

Netlify hosting

Backend

Node.js

Express.js

MongoDB (Atlas)

Mongoose

JWT

Nodemailer

Render hosting

Other Services

Cloudinary – image uploads

Razorpay – payment integration

🚀 How to Run Locally 1️⃣ Clone the repository git clone https://github.com/YOUR_USERNAME/sri-gayathri-frontend.git git clone https://github.com/YOUR_USERNAME/sri-gayathri-backend.git

🖥️ FRONTEND SETUP cd frontend npm install npm start

🛢️ BACKEND SETUP cd backend npm install

Create a file named .env inside backend/:

MONGO_URI=your_mongo_atlas_url JWT_SECRET=your_secret_key

EMAIL_USER=your_gmail EMAIL_PASS=your_app_password

CLOUDINARY_CLOUD=xxxx CLOUDINARY_KEY=xxxx CLOUDINARY_SECRET=xxxx

RAZORPAY_KEY_ID=xxxx RAZORPAY_KEY_SECRET=xxxx

FRONTEND_URL=http://localhost:3000

Then run:

npm start

🔄 Deployment Guide Frontend (Netlify)

npm run build

Upload build/ folder to Netlify

Set custom domain (optional)

Backend (Render)

Create new Web Service

Connect GitHub backend repo

Add environment variables (from .env)

Set start command:

node server.js

Deploy

🧑‍💻 Developer

Loheshwaran P Computer Science and Engineering, Government college of engineering,Dharmapuri Tamil Nadu, India

GitHub: https://github.com/Lohesh007
