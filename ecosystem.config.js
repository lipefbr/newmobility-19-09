module.exports = {
  apps: [{
    name: 'deploy-cmsv5tbq7000',
    script: '.next/standalone/server.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: 3993,
      DATABASE_URL: 'postgresql://u_cmsv5tbq_newmobility:NewMobility@2026LhSecure@127.0.0.1:5432/lh_cmsv5tbq_newmobility?schema=public',
    },
  }],
}
