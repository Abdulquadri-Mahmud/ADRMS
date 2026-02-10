require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.DATABASE_URL;

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('URI:', uri?.replace(/:[^:]*@/, ':****@')); // Hide password
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000
  });
  
  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB');
    
    await client.db().admin().ping();
    console.log('✅ Ping successful');
    
    const db = client.db();
    console.log('✅ Database name:', db.databaseName);
    
    await client.close();
    console.log('✅ Connection closed properly');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();