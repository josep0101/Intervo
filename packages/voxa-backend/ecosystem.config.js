// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "voxa-dev",
      script: "server.js",
      watch: false,
      ignore_watch: [
        ".git",
        ".git/*",
        "node_modules",
        "logs",
        "vector_stores",
        "venv",
        "example_vector_store",
        "rag_py/__pycache__",
        "rag/__pycache__"
      ],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: "development",
        PORT: 3003,
      },
    },
    {
      name: "voxa-prod",
      script: "server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3004,
      },
    },
    {
      name: "voxa-staging",
      script: "server.js",
      watch: true,
      ignore_watch: [
        ".git",
        ".git/*",
        "node_modules",
        "logs",
      ],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: "staging",
        PORT: 3005,
      },
    },
    {
      name: "rag-api",
      script: "rag_py/api.py",
      interpreter: "python3",
      env: {
        PYTHONPATH: "/root/call-plugin-backend"
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ],
};
