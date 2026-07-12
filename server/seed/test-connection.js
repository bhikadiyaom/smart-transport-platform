require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB Atlas connection...');
console.log('URI:', process.env.MONGODB_URI?.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
})
.then(() => {
  console.log('✅ Connected successfully!');
  console.log('Connection state:', mongoose.connection.readyState);
  return mongoose.disconnect();
})
.then(() => { console.log('Disconnected.'); process.exit(0); })
.catch(err => {
  console.error('❌ Connection failed:', err.message);
  console.error('Error name:', err.name);
  process.exit(1);
});
