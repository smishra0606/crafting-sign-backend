# Crafting Sign Backend

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 📖 About The Project

**Crafting Sign Backend** is the server-side API application for the Crafting Sign platform. It handles user authentication, product management, and order processing, serving as the interface between the frontend application and the database.

## 🛠️ Tech Stack

* **Runtime**: [Node.js](https://nodejs.org/)
* **Framework**: Express.js (Inferred)
* **Database**: MongoDB (Inferred from `models` directory)
* **Process Management**: PM2 (`ecosystem.config.js`)

## 📂 Project Structure

```text
crafting-sign-backend/
├── config/          # Database and application configuration
├── controllers/     # Route logic and request handling
├── middleware/      # Custom middleware (auth, logging, etc.)
├── models/          # Mongoose database schemas
├── routes/          # API route definitions
├── scripts/         # Utility and maintenance scripts
├── .env.example     # Environment variable template
├── ecosystem.config.js # PM2 configuration
├── server.js        # Entry point
└── package.json
```
🚀 Getting Started
Follow these steps to set up the backend environment locally.

Prerequisites
Node.js (v14+ recommended)

npm or yarn

MongoDB (Local instance or Atlas URI)

Installation
Clone the repository

Bash
git clone [https://github.com/smishra0606/crafting-sign-backend.git](https://github.com/smishra0606/crafting-sign-backend.git)
cd crafting-sign-backend
Install dependencies

Bash
npm install
Environment Configuration This project requires specific environment variables to run.

Copy the example file:

Bash
cp .env.example .env
Important: Refer to ENV_SETUP.md for detailed instructions on configuring your .env file correctly.

🏃‍♂️ Running the Application
Development Mode
To start the server in development mode:

Bash
npm start
# or
node server.js
Production Mode (PM2)
This project is configured for PM2. To start the application using the ecosystem file:

Bash
pm2 start ecosystem.config.js
📚 Documentation & Guides
Additional documentation is available in the repository to assist with specific tasks:

Admin Configuration: See ADMIN_SETUP.md for instructions on creating and managing admin accounts.

Troubleshooting: if you encounter login issues, refer to DEBUG_LOGIN.md.

Environment Setup: See ENV_SETUP.md for a breakdown of required variables.

🤝 Contributing
Fork the Project

Create your Feature Branch (git checkout -b feature/NewFeature)

Commit your Changes (git commit -m 'Add NewFeature')

Push to the Branch (git push origin feature/NewFeature)

Open a Pull Request

📞 Contact
Shiven Mishra - GitHub Profile

Project Link: https://github.com/smishra0606/crafting-sign-backend
