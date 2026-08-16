module.exports = {
  apps: [{
    name: "twelo-backend",
    script: "index.js",
    instances: "max",       // Available CPU cores utilize karega
    exec_mode: "cluster",
    max_memory_restart: "450M",
    env: {
      NODE_ENV: "production"
    }
  }]
};
